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
import { bridgePubkey } from "@naoms/core/chain/signer/signing-bridge.ts";
import { signingBridgeIsReady } from "@naoms/core/chain/signer/signing-bridge-readiness.ts";
import {
  type ActionBinding,
  type CapabilityToken,
} from "@naoms/core/ucan/capability-token.ts";
import { canonicalizePayArgs } from "@naoms/core/ucan/delegation-chain.ts";
import { createLogger } from "@naoms/logging";

import { gradientOutflow } from "../engine/gradient.ts";
import {
  allocate,
  type FlowClaimant,
  FlowConservationError,
} from "../engine/allocate.ts";
import { DEFAULT_TOKEN_KIND, flowPolicyEntityId } from "../types.ts";
import { triggerFlowReshareAfterSettle } from "../sharing/reshare-trigger.ts";
import { getEngineKeyByPolicy } from "../domain/engine-key-registry.ts";
import {
  mintFlowActionLeaf,
  type SettlementCheck,
  verifyFlowOcapForAllocation,
} from "../domain/flow-ocap.ts";

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
  /** 1644 M4 B-2 (gate-seam): re-dispatch token.pay THROUGH the approval gate.
   *  Injected by `dispatchWs`; absent in pre-loader/test contexts → settlement
   *  records allocations but moves no value (surfaced LOUD, never silent). */
  dispatchGatedOp?: (
    msg: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

/** Per-allocation outcome of the value-movement leg. `attempted=false` ⇒ no
 *  value moved at all (with `reason`); `paid`/`refused` carry per-claimant
 *  results. NEVER a silent drop — every claimant lands in exactly one list. */
interface ValueMovementSummary {
  attempted: boolean;
  reason?: string;
  paid: Array<{ id: string; amount: number; entryId?: string }>;
  refused: Array<{ id: string; amount: number; reason: string }>;
  /** INDETERMINATE outcomes — a gated pay that did NOT return a clear result in
   *  time (the 15s no-block deadline). Honesty axiom: a timeout MUST NOT be
   *  reported as `refused`, because if the capability verified (the gate consumed
   *  the single-use nonce, mark-then-act) and `handlePay` was merely slow, value
   *  DID move. The operator reconciles via the per-root ledger / the token chain
   *  (`entryId`), never assuming the transfer did not happen. */
  indeterminate: Array<{ id: string; amount: number; reason: string }>;
}

/**
 * B-2 value-movement leg: ride the REAL `token.pay` for each conserved allocation
 * under the owner-signed delegation root armed at `flow.policy_set`. Per allocation:
 * the finer `verifyFlowOcapForAllocation` gate (per-claimant / per-epoch / context /
 * policy-version / vault, T-12/13/14) → mint a single-use LEAF signed by K bound to
 * the EXACT canonicalized pay args → re-dispatch `token.pay` THROUGH the gate
 * (`ctx.dispatchGatedOp`, NEVER `handlePay` directly — that would bypass the gate).
 * Fail-closed at every step; refusals are surfaced, never silently dropped.
 */
async function moveSettlementValue(
  ctx: EpochSettleContext,
  args: {
    policyProps: Record<string, unknown>;
    holon: string;
    context: string;
    tokenKind: string;
    version: number;
    allocations: Array<{ id: string; amount: number }>;
    settledTotal: number;
  },
): Promise<ValueMovementSummary> {
  const summary: ValueMovementSummary = {
    attempted: false,
    paid: [],
    refused: [],
    indeterminate: [],
  };
  const rootJson = args.policyProps.delegation_root_json;
  const registryKey = typeof args.policyProps.delegation_registry_key === "string"
    ? args.policyProps.delegation_registry_key
    : flowPolicyEntityId(args.holon, args.context, args.tokenKind);

  if (args.policyProps.delegation_armed !== true || typeof rootJson !== "string") {
    summary.reason = "no-delegation-armed";
    return summary;
  }
  if (!ctx.dispatchGatedOp) {
    summary.reason = "no-gated-dispatch";
    return summary;
  }
  if (!signingBridgeIsReady()) {
    summary.reason = "signer-unavailable-vault-locked";
    return summary;
  }
  const k = getEngineKeyByPolicy(registryKey);
  if (!k) {
    // K discarded on restart / revoke / re-arm-without-cap. The conserved
    // allocator re-derives next epoch — NOT a lost payment (Mystery axiom).
    summary.reason = "k-unavailable-rearm-required";
    return summary;
  }
  let root: CapabilityToken;
  try {
    root = JSON.parse(rootJson) as CapabilityToken;
  } catch {
    summary.reason = "delegation-root-corrupt";
    return summary;
  }

  const ownerPubkey = bridgePubkey();
  summary.attempted = true;
  for (const alloc of args.allocations) {
    if (!(alloc.amount > 0)) continue; // nothing to move for a zero allocation
    const check: SettlementCheck = {
      ownerPubkey,
      holon: args.holon,
      context: args.context,
      currentPolicyVersion: args.version,
      allocationAmount: alloc.amount,
      epochTotal: args.settledTotal,
      vaultUnlocked: true, // signingBridgeIsReady() asserted above (T-14)
    };
    const verdict = verifyFlowOcapForAllocation(root, check);
    if (!verdict.ok) {
      summary.refused.push({ id: alloc.id, amount: alloc.amount, reason: verdict.reason });
      continue;
    }
    // Bind the leaf to the EXACT canonicalized args we will re-dispatch, so the
    // gate's re-canonicalization matches the leaf's action_binding (B1/N2).
    const payArgs = { token: args.tokenKind, toDid: alloc.id, amount: alloc.amount };
    const canon = canonicalizePayArgs(payArgs);
    const binding: ActionBinding = { ...canon, nonce: crypto.randomUUID() };
    let leaf: CapabilityToken;
    try {
      leaf = await mintFlowActionLeaf({
        engineSignFn: k.signFn,
        root,
        binding,
        expiryMs: 5 * 60 * 1000,
        enginePubkeyOverride: k.publicKey,
      });
    } catch (e) {
      summary.refused.push({
        id: alloc.id,
        amount: alloc.amount,
        reason: `leaf-mint-failed:${(e as Error).message}`,
      });
      continue;
    }
    // An automated settlement MUST NOT block on the gate's interactive approval
    // fall-through (no human answers it here). If the capability does not verify,
    // the gate mints a pending approval + polls — bound that with a timeout so the
    // value-leg surfaces a refusal instead of hanging the settle response.
    const result = await Promise.race([
      ctx.dispatchGatedOp({
        type: "token.pay",
        ...payArgs,
        _capability: { leaf, root },
      }),
      new Promise<Record<string, unknown>>((resolve) =>
        setTimeout(
          () => resolve({ type: "token.pay_error", error: "gated-pay-timeout" }),
          15_000,
        )
      ),
    ]);
    const typeStr = typeof result.type === "string" ? result.type : "";
    const ok = typeStr !== "" && !typeStr.endsWith("_error") && result.error == null;
    if (ok) {
      summary.paid.push({
        id: alloc.id,
        amount: alloc.amount,
        // handlePay returns `entryId` (the committed token.transfer entry) — the
        // on-chain witness that the gated pay rode REAL token.pay, not a stub.
        entryId: typeof result.entryId === "string" ? result.entryId : undefined,
      });
    } else if (result.error === "gated-pay-timeout") {
      // Honesty axiom: a timeout is INDETERMINATE, NOT a refusal. The gate may
      // have verified the capability (consuming the single-use nonce mark-then-act)
      // and handlePay may have committed the transfer while merely exceeding the
      // deadline — so we MUST NOT report "no value moved". Surface it for ledger /
      // token-chain reconciliation, never as `refused` or `paid`.
      summary.indeterminate.push({
        id: alloc.id,
        amount: alloc.amount,
        reason:
          "gated-pay-timeout: the transfer MAY have committed (the gate may have " +
          "consumed the single-use nonce); reconcile via the per-root ledger / token chain",
      });
    } else {
      summary.refused.push({
        id: alloc.id,
        amount: alloc.amount,
        reason: `pay-refused:${String(result.error ?? result.code ?? "unknown")}`,
      });
    }
  }
  return summary;
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

    // 1644 M4 B-2: ride REAL token.pay for each allocation under the owner-signed
    // delegation root (records-but-moves-no-value when unarmed/K-absent/locked —
    // surfaced LOUD). The settlement event above is the conserved record; this is
    // the value-movement leg, distinct and fail-closed.
    const valueMovement = await moveSettlementValue(ctx, {
      policyProps: policyNode.properties ?? {},
      holon,
      context,
      tokenKind: String(policyNode.properties?.token_kind ?? DEFAULT_TOKEN_KIND),
      version: Number(policyNode.properties?.version ?? 0),
      allocations,
      settledTotal,
    });
    if (
      !valueMovement.attempted || valueMovement.refused.length > 0 ||
      valueMovement.indeterminate.length > 0
    ) {
      L.warn("flow settlement value-movement incomplete", {
        holon,
        context,
        attempted: valueMovement.attempted,
        reason: valueMovement.reason,
        paid: valueMovement.paid.length,
        refused: valueMovement.refused.length,
        indeterminate: valueMovement.indeterminate.length,
      });
    }

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
      valueMovement,
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
