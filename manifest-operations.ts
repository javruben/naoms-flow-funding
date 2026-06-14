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
  {
    name: "agreement_propose",
    description:
      "Propose a bilateral flow-agreement to a counterparty over the formality " +
      "dial (relational ↔ codified revenue-share/IOU). Writes the proposer's lane.",
    version: 1,
    method: "ws_message",
    messageType: "flow.agreement_propose",
    pattern: "send",
    returns: "flow.agreement_propose.result",
    category: "write",
    trustLevel: "owner",
    cli: { name: "agreement-propose" },
    intent_tags: ["flow", "flow-agreement", "flow-funding", "revenue-share"],
    when_to_use:
      "Owner wants to set up a value-flow relationship with a peer — a soft channel or a codified share/IOU.",
    when_not_to_use:
      "Use flow.policy_set for self-context viability bands; use token.pay for a one-off transfer.",
    completionEvents: ["flow.agreement_proposed"],
    inputSchema: {
      type: "object",
      properties: {
        counterparty: { type: "string", description: "Peer DID" },
        terms: {
          type: "object",
          description: "FlowAgreementTerms (formality, tier, sharePct, iou, …)",
          properties: {
            formality: { type: "number" },
            tier: { type: "string" },
          },
          required: ["formality", "tier"],
        },
      },
      required: ["counterparty", "terms"],
    },
  },
  {
    name: "agreement_accept",
    description: "Accept a proposed flow-agreement (the counterparty's lane).",
    version: 1,
    method: "ws_message",
    messageType: "flow.agreement_accept",
    pattern: "send",
    returns: "flow.agreement_accept.result",
    category: "write",
    trustLevel: "owner",
    cli: { name: "agreement-accept" },
    intent_tags: ["flow", "flow-agreement", "flow-funding"],
    when_to_use: "Owner accepts a flow-agreement a peer proposed.",
    when_not_to_use: "Use flow.agreement_revoke to decline/cancel.",
    completionEvents: ["flow.agreement_accepted"],
    inputSchema: {
      type: "object",
      properties: { agreementId: { type: "string" } },
      required: ["agreementId"],
    },
  },
  {
    name: "agreement_revoke",
    description: "Revoke a flow-agreement (either party; immediate).",
    version: 1,
    method: "ws_message",
    messageType: "flow.agreement_revoke",
    pattern: "send",
    returns: "flow.agreement_revoke.result",
    category: "write",
    trustLevel: "owner",
    cli: { name: "agreement-revoke" },
    intent_tags: ["flow", "flow-agreement", "flow-funding"],
    when_to_use: "A party ends a flow-agreement.",
    when_not_to_use: "Use flow.agreement_accept to accept.",
    completionEvents: ["flow.agreement_revoked"],
    inputSchema: {
      type: "object",
      properties: { agreementId: { type: "string" } },
      required: ["agreementId"],
    },
  },
  {
    name: "get_agreement",
    description: "Read the folded status of a flow-agreement (proposed/active/revoked).",
    version: 1,
    method: "ws_message",
    messageType: "flow.get_agreement",
    pattern: "send",
    returns: "flow.get_agreement.result",
    category: "read",
    trustLevel: "owner",
    cli: { name: "get-agreement" },
    intent_tags: ["flow", "flow-agreement", "flow-funding"],
    when_to_use: "Owner wants the current state of a flow-agreement.",
    when_not_to_use: "Use flow.agreement_propose to create one.",
    completionEvents: [],
    inputSchema: {
      type: "object",
      properties: { agreementId: { type: "string" } },
      required: ["agreementId"],
    },
  },
];
