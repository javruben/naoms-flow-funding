// src/packages/flow-funding/types.ts — 1644 M1: FlowPolicy domain types.
//
// A FlowPolicy is the armed configuration for one holon in one context. It is
// carried as a signed `flow.policy_set` event on the holon's `flow` chain and
// projected (generic triple materializer, via the manifest nodeKind) to a
// `flow_policy` graph node keyed by (holon, context). A new version supersedes
// the prior one in place — settlement reads the latest active version (M1
// contract; HC-04 clock-freedom is not exercised at this layer).

/** Which anti-hoarding engines a policy arms. Demurrage is REUSE-1645 (HC-06). */
export type FlowEngine = "gradient-outflow" | "activity-decay" | "demurrage";

/** Fairness-under-scarcity rule (owner ALIGN D2 lean = need-weighted + cap). */
export type AllocationPolicy =
  | "need-weighted"
  | "equal"
  | "proximity"
  | "quadratic"
  | "holon-defined";

/** The tunable parameters of a FlowPolicy. All optional bar floor/ceiling so a
 *  holon can override defaults per context. */
export interface FlowPolicyParams {
  /** Below this the holon draws support in. */
  floor: number;
  /** Above this surplus flows out. */
  ceiling: number;
  /** Curve shape between floor and ceiling (0 = hard switch, 1 = fully smooth). */
  gradient?: number;
  /** Which engines run. Subset of FlowEngine; demurrage only ever in simulation. */
  armedEngines?: FlowEngine[];
  /** Fairness rule applied when surplus cannot reach everyone. */
  allocationPolicy?: AllocationPolicy;
  /** Per-claimant cap (anti-capture, HC-05) as a fraction of surplus, 0..1. */
  perClaimantCap?: number;
  /** Per-epoch outflow cap (HC-05) as a fraction of the holon's balance, 0..1. */
  perEpochCap?: number;
  /** Outcome-transparency scope label (resolved against the sharing domain). */
  transparencyLevel?: "relationship-scoped" | "ecosystem-outcome";
}

/** The event payload appended as `flow.policy_set`. */
export interface FlowPolicySetPayload {
  holon: string; // holon DID (person/hive/agent/device — existing identity)
  context: string; // holon-local scope label (e.g. "nao", "household")
  version: number; // monotonic per (holon, context)
  params: FlowPolicyParams;
}

/** The projected `flow_policy` graph node (latest active version per holon+context). */
export interface FlowPolicyNode extends FlowPolicySetPayload {
  nodeType: "flow_policy";
}

/** Stable graph entity id for a (holon, context) policy — versions update in place. */
export function flowPolicyEntityId(holon: string, context: string): string {
  return `flow-policy-${holon}-${context}`;
}
