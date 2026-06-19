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
  return data;
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

  // naoms-check-ignore: PC-10 materializer output
  ctx.graphPut({
    type: "flow_outcome",
    id: `flow-outcome-${peerDid}`,
    properties: {
      peer_did: peerDid,
      source: "received",
      total_flowed: (data.total_flowed as number) ?? null,
      epoch_count: (data.epoch_count as number) ?? null,
      by_context_json: data.by_context
        ? JSON.stringify(data.by_context)
        : null,
      level: payload.level as string,
      terms_json: JSON.stringify(terms),
      shared_at: sharedAt,
      expires_at: new Date(expiresMs).toISOString(),
      chain_id: ctx.chainId,
    },
  });
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
