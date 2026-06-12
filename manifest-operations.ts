// src/packages/flow-funding/manifest-operations.ts — 1644 M1 operations.
//
// Two ops: `flow.policy_set` (write — append a versioned FlowPolicy to the
// holon's flow chain) and `flow.get_policy` (read — fold back the latest active
// version via graphQueryAsync). Tier: governance (policy-arming is owner work);
// the value-moving ops (settlement riding token.pay) arrive at M3/M4 and carry
// CORE_APPROVAL_REQUIRED there, not here.

import type { PackageOperation } from "@naoms/core/manifest/feature-manifest.ts";

export const FLOW_FUNDING_OPERATIONS: PackageOperation[] = [
  {
    name: "policy_set",
    description:
      "Arm or update a FlowPolicy for a (holon, context): floor/ceiling/gradient, " +
      "armed engines, allocation rule, caps. Appends a versioned flow.policy_set event.",
    version: 1,
    method: "ws_message",
    messageType: "flow.policy_set",
    pattern: "send",
    returns: "flow.policy_set.result",
    category: "write",
    trustLevel: "owner",
    cli: { name: "policy-set" },
    intent_tags: [
      "flow",
      "flow-policy",
      "flow-funding",
      "viability-band",
      "floor-ceiling",
    ],
    when_to_use:
      "Owner wants to configure how value flows for a holon in a context — set the floor/ceiling band, gradient, which anti-hoarding engines are armed, and fairness caps (e.g. 'set my household flow ceiling to 5000').",
    when_not_to_use:
      "Use token.pay for a one-off transfer; use flow.get_policy to read current settings; settlement of surplus is automatic once a policy is armed.",
    completionEvents: ["flow.policy_set"],
    inputSchema: {
      type: "object",
      properties: {
        holon: { type: "string", description: "Holon DID (defaults to self)" },
        context: { type: "string", description: "Context label, e.g. 'nao'" },
        params: {
          type: "object",
          description: "FlowPolicyParams (floor, ceiling, gradient, …)",
          properties: {
            floor: { type: "number" },
            ceiling: { type: "number" },
          },
          required: ["floor", "ceiling"],
        },
      },
      required: ["context", "params"],
    },
  },
  {
    name: "get_policy",
    description:
      "Read the latest active FlowPolicy for a (holon, context) by folding the " +
      "flow_policy graph node.",
    version: 1,
    method: "ws_message",
    messageType: "flow.get_policy",
    pattern: "send",
    returns: "flow.get_policy.result",
    category: "read",
    trustLevel: "owner",
    cli: { name: "get-policy" },
    intent_tags: ["flow", "flow-policy", "flow-get-policy", "flow-funding"],
    when_to_use:
      "Owner wants to see the current armed FlowPolicy for a holon+context.",
    when_not_to_use:
      "Use flow.policy_set to change settings.",
    completionEvents: [],
    inputSchema: {
      type: "object",
      properties: {
        holon: { type: "string" },
        context: { type: "string" },
      },
      required: ["context"],
    },
  },
];
