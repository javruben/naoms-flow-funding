// src/packages/flow-funding/handlers/policy-set.ts — 1644 M1 handlers.
//
// Two WS message handlers for the `flow.` namespace:
//   - flow.policy_set  → append a versioned FlowPolicy to the holon's own
//     single-writer `flow` chain (provisioning the chain on first use), and
//     project it via the generic triple materializer (manifest nodeKind).
//   - flow.get_policy  → fold the latest-active FlowPolicy back from the graph.
//
// Self-set only at M1 (design §5 / open-Q F5 → defaulted self-set): a holon
// arms its OWN policy, so the chain's single writer == the caller == the
// signer. Cross-holon negotiation of settings is out of MVP and refused loud
// rather than silently signed by the wrong identity (Honesty axiom).
//
// Versioning (design §5, line 151): each policy_set is a new version event;
// the fold reads the latest-active version. "Latest-active" is maintained by
// the supersede materializer (materializers/flow-policy.ts) which marks prior
// versions `is_latest:false` — get_policy reads the single is_latest node.

import { createChain } from "@naoms/core/chain/index.ts";
import { bridgeSign } from "@naoms/core/chain/signer/signing-bridge.ts";
import { signingBridgeIsReady } from "@naoms/core/chain/signer/signing-bridge-readiness.ts";
import { createLogger } from "@naoms/logging";

import {
  DEFAULT_TOKEN_KIND,
  type FlowPolicyParams,
  flowPolicyEntityId,
} from "../types.ts";
import {
  armEngineKey,
  revokeEngineKey,
} from "../domain/engine-key-registry.ts";
import { type FlowOcapBounds, mintFlowDelegationRoot } from "../domain/flow-ocap.ts";

const L = createLogger("flow-funding:handler");

/** Minimal slice of RouterContext this package's handlers read. */
export interface FlowHandlerContext {
  dbHandle: bigint;
  ownerDid: string;
  callerDid?: string;
  graph: {
    queryAsync(
      pattern: Record<string, unknown>,
    ): Promise<
      {
        nodes?: Array<
          { id: string; kind?: string; properties?: Record<string, unknown> }
        >;
        error?: string;
      }
    >;
  };
  // PC-178b/PC-178j: scoped chain-read/append seam (ScopedChain subset) —
  // replaces direct core imports of getChain / securedAppend.
  chain: {
    get(chainId: string): { id: string } | null;
    append(opts: {
      chainId: string;
      branch: string;
      type: string;
      payload: string;
      domain?: string;
      signerDid: string;
      signerKeyId: string;
      tripleFormat?: { featureId: string; entityId: string };
    }): Promise<{ id: string }>;
  };
}

export type RespondFn = (payload: Record<string, unknown>) => void;

/** The identity acting on this request — the caller, falling back to owner. */
function actorDid(ctx: FlowHandlerContext): string {
  return ctx.callerDid || ctx.ownerDid;
}

/** Stable per-holon flow chainId. One flow chain per holon carries every
 *  context's policy version events on its `content` branch. A DID's `:` is a
 *  legal chain-id character (chain ids are opaque keys). */
function flowChainId(holon: string): string {
  return `flow-${holon}`;
}

/** Basic, loud parameter validation (full conservation math is M3/HC-01). */
function validateParams(p: FlowPolicyParams | undefined): string | null {
  if (!p || typeof p !== "object") return "params required";
  if (typeof p.floor !== "number" || typeof p.ceiling !== "number") {
    return "params.floor and params.ceiling are required numbers";
  }
  if (p.ceiling < p.floor) {
    return `ceiling (${p.ceiling}) must be >= floor (${p.floor})`;
  }
  return null;
}

/**
 * flow.policy_set — arm or update a FlowPolicy for (holon, context).
 * Appends a versioned `flow.policy_set` event to the holon's flow chain.
 */
export async function handlePolicySet(
  ctx: FlowHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const db = ctx.dbHandle;
  const actor = actorDid(ctx);
  const holon = (typeof msg.holon === "string" && msg.holon) || actor;
  const context = typeof msg.context === "string" ? msg.context : "";
  const tokenKind = (typeof msg.tokenKind === "string" && msg.tokenKind) ||
    DEFAULT_TOKEN_KIND;
  const params = msg.params as FlowPolicyParams | undefined;

  if (!context) {
    return respond({
      type: "flow.policy_set.result",
      ok: false,
      error: "context required",
    });
  }
  // Self-set only at M1 (design F5). Refuse rather than sign as the wrong key.
  if (holon !== actor) {
    return respond({
      type: "flow.policy_set.result",
      ok: false,
      error:
        `cross-holon policy-set is out of MVP — a holon may only arm its own ` +
        `FlowPolicy (self-set, design §5/F5). caller=${actor} holon=${holon}`,
    });
  }
  const paramErr = validateParams(params);
  if (paramErr) {
    return respond({ type: "flow.policy_set.result", ok: false, error: paramErr });
  }

  try {
    // Next version = max existing version for (holon, context, tokenKind) + 1.
    // Each token-kind carries its own independent version sequence — arming an
    // "iou" band does not bump the "custom" band's version.
    const existing = await ctx.graph.queryAsync({
      type: "flow_policy",
      where: { holon, context, token_kind: tokenKind },
      limit: 10000,
    });
    if (existing.error) {
      L.warn("flow.policy_set: version probe failed", { error: existing.error });
    }
    const maxVersion = (existing.nodes ?? []).reduce((m, n) => {
      const v = Number(n.properties?.version ?? 0);
      return Number.isFinite(v) && v > m ? v : m;
    }, 0);
    const version = maxVersion + 1;

    // Provision the holon's flow chain on first use (single-writer, owner-local).
    const chainId = flowChainId(holon);
    if (!ctx.chain.get(chainId)) {
      createChain(db, {
        id: chainId,
        ownerDid: holon,
        chainType: "flow",
        writerModel: "single",
        branches: ["content"],
      });
    }

    const entityId = `${
      flowPolicyEntityId(holon, context, tokenKind)
    }-v${version}`;

    // 1644 M4 (gate-seam): arm the owner-signed delegation ROOT + the in-process
    // engine key K so flow.epoch_settle can ride REAL token.pay under a bounded,
    // revocable, owner-rooted capability — NO interactive unlock, NO bypass.
    // Automated value movement is authorized ONLY when the owner set a finite
    // per-epoch cap (the owner-signed coarse ceiling) AND the signer is ready
    // (vault unlocked at arm). Otherwise the policy still arms but settlement
    // records allocations and moves NO value until re-arm — surfaced LOUD (never
    // a silent capability). `registryKey` is the UNVERSIONED policy entity so a
    // re-arm's `armEngineKey` DISCARDS the prior K (revoke-by-policy-version).
    const registryKey = flowPolicyEntityId(holon, context, tokenKind);
    // The ABSOLUTE owner-signed total ceiling authorizes automated value movement —
    // distinct from the [0,1] fairness fractions (perClaimantCap/perEpochCap), which
    // the allocator resolves at settle time and which cannot be pre-signed as an
    // absolute at arm time. The leaf is bound to the EXACT allocation the allocator
    // (fraction-bounded) produces, so per-claimant/per-epoch fairness is enforced
    // upstream; the delegation's own owner-signed bound is this absolute total (B3).
    const automatedCap = Number(params!.automatedSettlementCap);
    let delegationRootJson: string | undefined;
    let delegationArmed = false;
    if (Number.isFinite(automatedCap) && automatedCap > 0 && signingBridgeIsReady()) {
      try {
        const k = await armEngineKey(registryKey);
        const bounds: FlowOcapBounds = {
          holon,
          context,
          policyVersion: version,
          // The ocap's own per-claimant/per-epoch bounds are ABSOLUTE (≠ the policy
          // [0,1] fractions). For the MVP the delegation enforces the absolute
          // AGGREGATE ceiling (below + the per-root ledger); per-claimant/per-epoch
          // fairness lives in the allocator. Left unbounded here to avoid conflating
          // the two cap systems.
          perClaimantCap: undefined,
          perEpochCap: undefined,
        };
        const root = await mintFlowDelegationRoot({
          // Owner signs the root ONCE via the sanctioned UCAN scope; FROST 2-of-2
          // yields a standard Ed25519 sig the gate verifies under bridgePubkey().
          ownerSignFn: (data: Uint8Array) => bridgeSign(data, "ucan:v1"),
          bounds,
          // The owner-signed ABSOLUTE total ceiling over the root's life (B3). The
          // per-root ledger enforces Σ(leaf amounts) ≤ this. Re-arm refreshes it.
          aggregateCap: automatedCap,
          enginePubkey: k.publicKey,
          // The arm's owner-signed on-chain identity — the audit link
          // verifyDelegationChain asserts present (B2).
          approvalReceipt: entityId,
          expiryMs: 30 * 24 * 60 * 60 * 1000,
        });
        delegationRootJson = JSON.stringify(root);
        delegationArmed = true;
        L.info("flow delegation root armed", {
          holon,
          context,
          tokenKind,
          version,
          fingerprint: k.fingerprint,
        });
      } catch (e) {
        // Signer present but the mint failed (e.g. inline-posture gate). Do NOT
        // leave a half-armed K; surface LOUD. Policy still arms (no value moves).
        revokeEngineKey(registryKey);
        L.warn(
          "flow delegation root arm FAILED — settlement will record but move no value",
          { holon, context, tokenKind, version, error: (e as Error).message },
        );
      }
    } else {
      // No absolute automated-settlement cap, or signer not ready (vault locked /
      // test / sim): no automated value movement authorized. Discard any prior K.
      revokeEngineKey(registryKey);
      L.info(
        "flow policy armed WITHOUT delegation root (no automatedSettlementCap or signer not ready)",
        {
          holon,
          context,
          tokenKind,
          version,
          hasAutomatedCap: Number.isFinite(automatedCap) && automatedCap > 0,
          signerReady: signingBridgeIsReady(),
        },
      );
    }

    // Scalars (floor/ceiling/token_kind) stay top-level for queryability; the
    // full param object + the (owner-signed, secret-free) delegation root ride as
    // JSON strings so nested fields don't fan out into sub-nodes under triple
    // materialization.
    const nodeProps = {
      id: entityId,
      holon,
      context,
      token_kind: tokenKind,
      version,
      is_latest: true,
      floor: params!.floor,
      ceiling: params!.ceiling,
      paramsJson: JSON.stringify(params),
      delegation_armed: delegationArmed,
      delegation_registry_key: registryKey,
      ...(delegationRootJson ? { delegation_root_json: delegationRootJson } : {}),
    };

    const commit = await ctx.chain.append({
      chainId,
      branch: "content",
      type: "flow.policy_set",
      payload: JSON.stringify(nodeProps),
      domain: "flow-funding",
      signerDid: holon,
      signerKeyId: holon,
      tripleFormat: { featureId: "flow-funding", entityId },
    });

    L.info("flow policy set", { holon, context, tokenKind, version, entityId });
    return respond({
      type: "flow.policy_set.result",
      ok: true,
      holon,
      context,
      tokenKind,
      version,
      entityId,
      commit: commit.id,
      // Whether automated settlement (real token.pay under the delegation root)
      // is authorized for this arm. false ⇒ settlement records but moves no value.
      delegationArmed,
    });
  } catch (e) {
    L.warn("flow.policy_set failed", { error: (e as Error).message });
    return respond({
      type: "flow.policy_set.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}

/**
 * flow.get_policy — fold the latest-active FlowPolicy for (holon, context).
 * Returns the single `is_latest` version plus witness counts so callers (and
 * the M1 integ test) can verify the supersede mechanism fired.
 */
export async function handleGetPolicy(
  ctx: FlowHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const actor = actorDid(ctx);
  const holon = (typeof msg.holon === "string" && msg.holon) || actor;
  const context = typeof msg.context === "string" ? msg.context : "";
  const tokenKind = (typeof msg.tokenKind === "string" && msg.tokenKind) ||
    DEFAULT_TOKEN_KIND;

  if (!context) {
    return respond({
      type: "flow.get_policy.result",
      ok: false,
      error: "context required",
    });
  }

  try {
    const res = await ctx.graph.queryAsync({
      type: "flow_policy",
      where: { holon, context, token_kind: tokenKind },
      limit: 10000,
    });
    if (res.error) {
      return respond({
        type: "flow.get_policy.result",
        ok: false,
        error: res.error,
      });
    }
    const nodes = res.nodes ?? [];
    const isLatest = (n: { properties?: Record<string, unknown> }) =>
      n.properties?.is_latest === true || n.properties?.is_latest === "true";
    const active = nodes.filter(isLatest).sort(
      (a, b) =>
        Number(b.properties?.version ?? 0) - Number(a.properties?.version ?? 0),
    );
    const latest = active[0];

    return respond({
      type: "flow.get_policy.result",
      ok: true,
      holon,
      context,
      tokenKind,
      found: !!latest,
      version: latest ? Number(latest.properties?.version ?? 0) : null,
      params: latest
        ? JSON.parse(String(latest.properties?.paramsJson ?? "null"))
        : null,
      // Mechanism witnesses (HC-10): total versions projected vs how many the
      // supersede materializer left marked active. A correct supersede leaves
      // exactly one active node — the latest.
      versionsTotal: nodes.length,
      latestActiveCount: active.length,
    });
  } catch (e) {
    return respond({
      type: "flow.get_policy.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}
