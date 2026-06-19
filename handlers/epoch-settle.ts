// src/packages/flow-funding/handlers/epoch-settle.ts — 1644 M3 epoch settlement.
//
// The settlement orchestrator (design §6.3-6.4): runs the LIVE anti-hoarding
// engines over a holon's flow state for one epoch and commits a conserved
// `flow.epoch_settled` event on the holon's flow chain. Settlement is an explicit,
// auditable event — NOT an implicit clock (HC-04): the caller supplies the holon's
// `balance` and the below-floor `claimants` (their unmet need + trust-graph
// pull-weight) for this epoch; the simulation surface (M5) drives synthetic state
// through this SAME real path, and M4 wires real value movement onto the result.
//
//   surplus  = gradientOutflow(balance, floor, ceiling, gradient)   [above ceiling]
//   surplus  = min(surplus, perEpochCap × balance)                   [HC-05 per-epoch]
//   alloc    = allocate(surplus, claimants, { perClaimantCap })      [HC-05 + HC-01]
//
// Conservation (HC-01): the allocator guarantees Σ(out) == surplus or throws
// FlowConservationError — which this handler surfaces as a LOUD refusal, never a
// silent clamp. The policy (floor/ceiling/gradient/caps) is read from the holon's
// FlowPolicy node (M1) — the settlement is bound to the armed policy, not ad-hoc.

import { securedAppend } from "@naoms/core/chain";
import { createLogger } from "@naoms/logging";

import { gradientOutflow } from "../engine/gradient.ts";
import {
  allocate,
  type FlowClaimant,
  FlowConservationError,
} from "../engine/allocate.ts";
import { flowPolicyEntityId } from "../types.ts";
import { triggerFlowReshareAfterSettle } from "../sharing/reshare-trigger.ts";

const L = createLogger("flow-funding:epoch-settle");

export interface EpochSettleContext {
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

function actorDid(ctx: EpochSettleContext): string {
  return ctx.callerDid || ctx.ownerDid;
}

function flowChainId(holon: string): string {
  return `flow-${holon}`;
}

/**
 * flow.epoch_settle — settle one flow epoch for (holon, context). Reads the armed
 * FlowPolicy, computes the gradient surplus above ceiling (capped per-epoch),
 * allocates it conserved + capped across the supplied below-floor claimants, and
 * commits a `flow.epoch_settled` event. Refuses LOUD on non-conservation (HC-01).
 */
export async function handleEpochSettle(
  ctx: EpochSettleContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const actor = actorDid(ctx);
  const holon = (typeof msg.holon === "string" && msg.holon) || actor;
  const context = typeof msg.context === "string" ? msg.context : "";
  const balance = Number(msg.balance);
  const rawClaimants = Array.isArray(msg.claimants) ? msg.claimants : [];

  if (!context) {
    return respond({ type: "flow.epoch_settle.result", ok: false, error: "context required" });
  }
  if (holon !== actor) {
    return respond({
      type: "flow.epoch_settle.result",
      ok: false,
      error: `a holon settles its OWN epoch (self only); caller=${actor} holon=${holon}`,
    });
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return respond({
      type: "flow.epoch_settle.result",
      ok: false,
      error: `balance must be a finite, non-negative number (got ${msg.balance})`,
    });
  }

  // Read the armed FlowPolicy (M1) for the band + caps. Settlement is bound to it.
  const res = await ctx.graph.queryAsync({
    type: "flow_policy",
    where: { holon, context },
    limit: 10000,
  });
  if (res.error) {
    return respond({ type: "flow.epoch_settle.result", ok: false, error: res.error });
  }
  const active = (res.nodes ?? []).filter((n) =>
    n.properties?.is_latest === true || n.properties?.is_latest === "true"
  );
  const policyNode = active[0];
  if (!policyNode) {
    return respond({
      type: "flow.epoch_settle.result",
      ok: false,
      error: `no armed FlowPolicy for (${holon}, ${context}) — arm one with flow.policy_set first`,
    });
  }
  const params = policyNode.properties?.paramsJson
    ? JSON.parse(String(policyNode.properties.paramsJson))
    : {};
  const floor = Number(params.floor);
  const ceiling = Number(params.ceiling);
  const gradient = Number(params.gradient ?? 0);
  const perClaimantCap = params.perClaimantCap;
  const perEpochCap = params.perEpochCap;

  const claimants: FlowClaimant[] = rawClaimants.map((c) => {
    const cc = c as Record<string, unknown>;
    return {
      id: String(cc.id ?? ""),
      need: Number(cc.need),
      trustWeight: Number(cc.trustWeight ?? 1),
    };
  });

  try {
    // Surplus above ceiling, gradient-shaped (HC-01 conservation source).
    let surplus = gradientOutflow(balance, floor, ceiling, gradient);
    // Per-epoch outflow cap (HC-05 / DE-24): a cascade cannot drain faster than rate.
    if (perEpochCap !== undefined && Number.isFinite(Number(perEpochCap))) {
      surplus = Math.min(surplus, Number(perEpochCap) * balance);
    }
    const allocations = allocate(surplus, claimants, {
      perClaimantCap: perEpochCap !== undefined || perClaimantCap !== undefined
        ? (Number.isFinite(Number(perClaimantCap)) ? Number(perClaimantCap) : undefined)
        : undefined,
    });
    const settledTotal = allocations.reduce((s, a) => s + a.amount, 0);

    const chainId = flowChainId(holon);
    const entityId = `flow-settlement-${holon}-${context}-${Date.now()}`;
    const payload = {
      id: entityId,
      holon,
      context,
      epochBalance: balance,
      surplus,
      settledTotal,
      allocations,
      policyEntity: flowPolicyEntityId(holon, context),
    };
    const commit = await securedAppend(ctx.dbHandle, {
      chainId,
      branch: "content",
      type: "flow.epoch_settled",
      payload: JSON.stringify(payload),
      signerDid: holon,
      signerKeyId: `${holon}#key-0`,
      tripleFormat: { featureId: "flow-funding", entityId },
    } as Parameters<typeof securedAppend>[1]);

    L.info("flow epoch settled", { holon, context, surplus, settledTotal });

    // M-TRANSPARENCY: deterministically reshare the flow-funding outcome to direct
    // peers after this settlement. Fire-and-forget — survives the reactive sharing
    // path's _sharingSuppress window (which would otherwise silently drop a
    // settlement landing during a concurrent reshare, e.g. a settle shortly after
    // an opt-in). Idempotent with the reactive reshare; no self-loop.
    triggerFlowReshareAfterSettle(ctx.dbHandle, entityId);

    return respond({
      type: "flow.epoch_settle.result",
      ok: true,
      holon,
      context,
      surplus,
      settledTotal,
      allocations,
      conserved: Math.abs(settledTotal - surplus) < 1e-6,
      commit: (commit as { id: string }).id,
    });
  } catch (e) {
    // HC-01: non-conservation (and bad-band / bad-input) refuse LOUD — never a
    // silent settlement. Surface the residual when the allocator reports it.
    const residual = e instanceof FlowConservationError ? e.residual : undefined;
    L.warn("flow epoch settle refused", { holon, context, error: (e as Error).message });
    return respond({
      type: "flow.epoch_settle.result",
      ok: false,
      error: (e as Error).message,
      ...(residual !== undefined ? { residual } : {}),
    });
  }
}
