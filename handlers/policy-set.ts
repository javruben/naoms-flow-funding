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

import { createChain, getChain } from "@naoms/core/chain/index.ts";
import { securedAppend } from "@naoms/core/chain/secured.ts";
import { createLogger } from "@naoms/logging";

import { type FlowPolicyParams, flowPolicyEntityId } from "../types.ts";

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
    // Next version = max existing version for (holon, context) + 1.
    const existing = await ctx.graph.queryAsync({
      type: "flow_policy",
      where: { holon, context },
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
    if (!getChain(db, chainId)) {
      createChain(db, {
        id: chainId,
        ownerDid: holon,
        chainType: "flow",
        writerModel: "single",
        branches: ["content"],
      });
    }

    const entityId = `${flowPolicyEntityId(holon, context)}-v${version}`;
    // Scalars (floor/ceiling) stay top-level for queryability; the full param
    // object rides as a JSON string so nested fields don't fan out into
    // sub-nodes under triple materialization.
    const nodeProps = {
      id: entityId,
      holon,
      context,
      version,
      is_latest: true,
      floor: params!.floor,
      ceiling: params!.ceiling,
      paramsJson: JSON.stringify(params),
    };

    const commit = await securedAppend(db, {
      chainId,
      branch: "content",
      type: "flow.policy_set",
      payload: JSON.stringify(nodeProps),
      domain: "flow-funding",
      signerDid: holon,
      signerKeyId: holon,
      tripleFormat: { featureId: "flow-funding", entityId },
    });

    L.info("flow policy set", { holon, context, version, entityId });
    return respond({
      type: "flow.policy_set.result",
      ok: true,
      holon,
      context,
      version,
      entityId,
      commit: commit.id,
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
      where: { holon, context },
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
