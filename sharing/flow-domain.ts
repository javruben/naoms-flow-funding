// src/packages/flow-funding/sharing/flow-domain.ts — 1644 M-TRANSPARENCY.
//
// Flow outcome transparency, LOCAL-FIRST, by REUSE of sharing-656 (HC-07): NO
// new auto-sharer, NO central transparency service. This file is a sharer
// plugin (manifest + build + materialize + revoke) for the `sharing.flow-funding`
// domain — the SAME plugin shape as the built-in `sharer-location` (656). It is
// registered with the sharing domain registry at flow-funding boot (register.ts)
// so the existing engine machinery carries flow outcomes:
//
//   • DIRECT auto-share — at handshake, `triggerAutoShare` builds this domain's
//     data per the peer's R-Card level and emits `friendship.share.flow-funding`.
//   • PER-SETTLEMENT reshare — when a `flow.epoch_settled` commit materializes a
//     `flow_settlement` graph node, the core `evaluateReshare` path
//     (transport/handlers/broadcast.ts → sharing-engine) matches this domain's
//     `triggerKinds` and reshares to peers already sharing at a non-off level.
//
// The N-hop capability (Biscuit caveat bounding hop-count + scope) that bounds
// onward redistribution — T-25/T-27 — is layered by `./biscuit-nhop.ts`; this
// file owns the WHAT (the outcome payload) and the receive-side materialization.

import type {
  SharerBuildContext,
  SharerMaterializeContext,
} from "@naoms/plugins";
import type { SharerPluginSection } from "@naoms/plugins";
import {
  authorizeReshare,
  type FlowShareCapability,
  mintFlowShareCapability,
} from "./biscuit-nhop.ts";

// ── Manifest Metadata ───────────────────────────────────────────────────

// Levels mirror the privacy ladder of the built-in sharers: `off` discloses
// nothing; `summary` discloses the holon's circulation totals (how much value
// flowed onward, over how many epochs); `detailed` adds the per-context
// breakdown. `maxHops: 2` is the redistribution budget the Biscuit caveat
// enforces (T-27) — a direct peer may reshare one further hop, no more.
export const SHARER_FLOW_FUNDING_MANIFEST: SharerPluginSection = {
  domain: "sharing.flow-funding",
  label: "Flow funding",
  levels: [
    { key: "off", label: "Off", ordinal: 0 },
    { key: "summary", label: "Summary", ordinal: 1 },
    { key: "detailed", label: "Detailed", ordinal: 2 },
  ],
  defaultLevel: "off",
  defaultTerms: {
    _default: {
      onRevoke: "delete",
      allowRedistribution: true,
      maxHops: 2,
      requireAttribution: true,
      llmPolicy: "local_only",
    },
  },
  // `flow_settlement` is the graph node kind the generic triple materializer
  // projects from a `flow.epoch_settled` commit (flow-funding/manifest.ts).
  // Listing it as the trigger is what makes `evaluateReshare` fire this domain
  // when a settlement lands. `readTypes` is the (separate, read-side) capability
  // the builder queries — MUST be declared explicitly (M-1303-BUG-SH-4).
  triggerKinds: ["flow_settlement"],
  readTypes: ["flow_settlement"],
  writesNodeTypes: ["flow_outcome"],
  perConnection: false,
};

// ── Builder ─────────────────────────────────────────────────────────────

interface SettlementProps {
  holon?: unknown;
  context?: unknown;
  surplus?: unknown;
  settledTotal?: unknown;
  epochBalance?: unknown;
}

/**
 * Build the outbound flow-outcome payload for one recipient at `ctx.level`.
 * Reads the holon's own `flow_settlement` nodes (the conserved settlements
 * authored by `flow.epoch_settle`) and aggregates circulation totals. Returns
 * null at level `off` or when the holon has settled nothing — the engine then
 * shares nothing, the privacy-preserving baseline.
 */
export async function build(
  ctx: SharerBuildContext,
): Promise<Record<string, unknown> | null> {
  if (ctx.level === "off") return null;

  const gq = (q: Record<string, unknown>) =>
    ctx.graphQueryAsync
      ? ctx.graphQueryAsync(q)
      : Promise.resolve(ctx.graphQuery(q));
  const res = await gq({ type: "flow_settlement", limit: 10000 });
  // naoms-check-ignore: PC-489 graphQueryAsync optional-call result may be undefined on async arm
  const nodes = res?.nodes ?? [];
  if (nodes.length === 0) return null;

  let totalFlowed = 0;
  const byContext: Record<string, number> = {};
  for (const node of nodes) {
    const props = (node.properties ?? {}) as SettlementProps;
    const settled = Number(props.settledTotal);
    if (!Number.isFinite(settled)) continue;
    totalFlowed += settled;
    if (ctx.level === "detailed") {
      const context = typeof props.context === "string" ? props.context : "";
      if (context) byContext[context] = (byContext[context] ?? 0) + settled;
    }
  }

  const data: Record<string, unknown> = {
    total_flowed: totalFlowed,
    epoch_count: nodes.length,
  };
  if (ctx.level === "detailed") data.by_context = byContext;

  // Mint the N-hop redistribution capability that bounds onward reshare of THIS
  // outcome (T-27).
  //
  // 🛑 1314 §6.0 escape hatch 4 — A GUARD WHOSE FAILURE MODE IS TO PERMIT IS
  // NOT A GUARD. This used to read `if (cap) data._capability = …`, so a mint
  // failure (FFI unavailable, build error) shipped the holon's circulation
  // totals with NO capability attached at all: the one path that was supposed
  // to bound onward redistribution degraded, on error, to an unbounded ungated
  // payload. The comment called that "the privacy baseline"; it is the
  // opposite — the baseline is to disclose NOTHING we cannot bound.
  //
  // Fail-closed: no capability ⇒ no share. `null` is the engine's
  // share-nothing signal and is already the level-`off` / no-settlements
  // return, so a refusal here costs privacy nothing and leaks nothing.
  const cap = mintFlowShareCapability();
  if (!cap) return null;
  data._capability = capabilityToWire(cap);

  // N-hop relay: forward outcomes we RECEIVED from other peers, each gated by
  // its own Biscuit caveat. `authorizeReshare` REFUSES (fail-closed) any outcome
  // whose hop budget is spent or whose token denies — that outcome is simply not
  // forwarded (T-25). Never relay an outcome back to its own origin peer.
  const forwarded = await buildForwardedOutcomes(gq, ctx.peerDid);
  if (forwarded.length > 0) data._forwarded = forwarded;

  return data;
}

interface WireCapability {
  contract: string;
  root_pub_hex: string;
  max_hops_remaining: number;
}

function capabilityToWire(cap: FlowShareCapability): WireCapability {
  return {
    contract: cap.tokenHex,
    root_pub_hex: cap.rootPubHex,
    max_hops_remaining: cap.hopsRemaining,
  };
}

interface ForwardedOutcome extends WireCapability {
  origin_peer: string;
  total_flowed: number | null;
  epoch_count: number | null;
}

/**
 * Read our received `flow_outcome` nodes and, for each whose Biscuit capability
 * still authorizes a reshare, produce an attenuated forwarded entry. Outcomes
 * that fail the gate (spent budget / denied token) are dropped (T-25).
 */
async function buildForwardedOutcomes(
  gq: (
    q: Record<string, unknown>,
  ) => Promise<{ nodes?: unknown[] } | undefined>,
  excludePeer: string,
): Promise<ForwardedOutcome[]> {
  const res = await gq({
    type: "flow_outcome",
    where: { source: "received" },
    limit: 10000,
  });
  // naoms-check-ignore: PC-489 graphQueryAsync optional-call result may be undefined on async arm
  const nodes = (res?.nodes ?? []) as Array<
    { properties?: Record<string, unknown> }
  >;
  const out: ForwardedOutcome[] = [];
  for (const node of nodes) {
    const p = node.properties ?? {};
    const originPeer = typeof p.peer_did === "string" ? p.peer_did : "";
    if (!originPeer || originPeer === excludePeer) continue; // no loop-back
    const tokenHex = typeof p.contract === "string" ? p.contract : "";
    const rootPubHex = typeof p.biscuit_root_pub_hex === "string"
      ? p.biscuit_root_pub_hex
      : "";
    const hopsRemaining = typeof p.max_hops_remaining === "number"
      ? p.max_hops_remaining
      : 0;
    if (!tokenHex || !rootPubHex) continue; // outcome arrived without a capability

    const decision = authorizeReshare({ tokenHex, rootPubHex, hopsRemaining });
    if (!decision.ok) continue; // out-of-scope — NOT forwarded (T-25)
    out.push({
      origin_peer: originPeer,
      total_flowed: typeof p.total_flowed === "number" ? p.total_flowed : null,
      epoch_count: typeof p.epoch_count === "number" ? p.epoch_count : null,
      ...capabilityToWire(decision.next),
    });
  }
  return out;
}

// ── Materializer ────────────────────────────────────────────────────────

/**
 * Receive side: project a peer's shared flow outcome into a local `flow_outcome`
 * node. Keyed per peer DID (a peer's latest outcome supersedes its prior one).
 * Mirrors `sharer-location.materialize`'s TTL + terms handling.
 */
export function materialize(
  ctx: SharerMaterializeContext,
  payload: Record<string, unknown>,
): void {
  const data = (payload.data as Record<string, unknown>) ?? {};
  const terms = (payload.terms as Record<string, unknown>) ?? {};
  const peerDid = ctx.signerDid === ctx.ownerDid ? "unknown" : ctx.signerDid;

  const ttlDays = (payload.ttl_days as number) ?? 7;
  const sharedAt = (payload.shared_at as string) ?? new Date().toISOString();
  const expiresMs = new Date(sharedAt).getTime() + ttlDays * 86400000;
  const expiresAt = new Date(expiresMs).toISOString();
  const level = payload.level as string;
  const termsJson = JSON.stringify(terms);

  const cap = data._capability as
    | {
      contract?: unknown;
      root_pub_hex?: unknown;
      max_hops_remaining?: unknown;
    }
    | undefined;

  // The direct outcome from this peer (keyed per origin peer DID).
  // naoms-check-ignore: PC-10 materializer output
  ctx.graphPut({
    type: "flow_outcome",
    id: `flow-outcome-${peerDid}`,
    properties: {
      peer_did: peerDid,
      source: "received",
      total_flowed: (data.total_flowed as number) ?? null,
      epoch_count: (data.epoch_count as number) ?? null,
      by_context_json: data.by_context ? JSON.stringify(data.by_context) : null,
      level,
      terms_json: termsJson,
      shared_at: sharedAt,
      expires_at: expiresAt,
      chain_id: ctx.chainId,
      // The N-hop capability that bounds OUR onward reshare of this outcome.
      contract: typeof cap?.contract === "string" ? cap.contract : null,
      biscuit_root_pub_hex: typeof cap?.root_pub_hex === "string"
        ? cap.root_pub_hex
        : null,
      max_hops_remaining: typeof cap?.max_hops_remaining === "number"
        ? cap.max_hops_remaining
        : null,
    },
  });

  // N-hop relay receive side: each forwarded outcome carries its OWN (already
  // attenuated) capability and is keyed by its true origin peer, so a relayed
  // outcome supersedes any direct copy of the same origin and keeps its bound.
  const forwarded = Array.isArray(data._forwarded)
    ? (data._forwarded as Array<Record<string, unknown>>)
    : [];
  for (const f of forwarded) {
    const originPeer = typeof f.origin_peer === "string" ? f.origin_peer : "";
    if (!originPeer || originPeer === ctx.ownerDid) continue;
    // naoms-check-ignore: PC-10 materializer output
    ctx.graphPut({
      type: "flow_outcome",
      id: `flow-outcome-${originPeer}`,
      properties: {
        peer_did: originPeer,
        source: "received",
        relayed_by: peerDid,
        total_flowed: (f.total_flowed as number) ?? null,
        epoch_count: (f.epoch_count as number) ?? null,
        level,
        terms_json: termsJson,
        shared_at: sharedAt,
        expires_at: expiresAt,
        chain_id: ctx.chainId,
        contract: typeof f.contract === "string" ? f.contract : null,
        biscuit_root_pub_hex: typeof f.root_pub_hex === "string"
          ? f.root_pub_hex
          : null,
        max_hops_remaining: typeof f.max_hops_remaining === "number"
          ? f.max_hops_remaining
          : null,
      },
    });
  }
}

// ── Revoke ──────────────────────────────────────────────────────────────

export function revoke(ctx: SharerMaterializeContext, peerDid: string): void {
  // naoms-check-ignore: PC-10 materializer output
  ctx.graphPut({
    type: "flow_outcome",
    id: `flow-outcome-${peerDid}`,
    properties: {
      deleted: 1,
      revoked_at: new Date().toISOString(),
    },
  });
}
