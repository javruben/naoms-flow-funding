// src/packages/flow-funding/manifest.ts — 1644 M1: Flow Funding package manifest.
//
// A homeostatic value-circulation layer over the token ledger. M1 lands the
// substrate foundation: the `flow` chainType + a versioned FlowPolicy projected
// to a `flow_policy` graph node. Value movement (riding token.pay), the
// gradient/activity-decay engines, scoped-ocap consent, simulation, and the
// wallet surfaces arrive at M2–M7 / M-TRANSPARENCY (see
// .naoms/roadmap/1644-flow-funding/05-align/frozen-plan.md).
//
// PC-471 distribution boundary: this package owns chainTypes:["flow"], its own
// flow_policy projection + (M3+) settlement materializers, and an independent
// release/versioning boundary. It REUSES (does not fork) token.pay/iou, the
// sharing-656 auto-sharer + Biscuit, 1645 demurrage, and the trust graph.

import type { NaomsFeatureManifest } from "@naoms/core/manifest/feature-manifest.ts";
import { FLOW_FUNDING_OPERATIONS } from "./manifest-operations.ts";

export const MANIFEST: NaomsFeatureManifest = {
  id: "flow-funding",
  name: "Flow Funding",
  version: "1.0.0",
  description:
    "Homeostatic, anti-hoarding value-circulation: holons set a floor/ceiling " +
    "viability band; surplus flows to dependents, support is drawn back below floor.",
  category: "data",
  ontologyNamespace: "naoms:flow-funding/",

  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "naoms://packages/flow-funding/flow",
    "x-naoms-feature": "flow-funding",
    type: "object",
    properties: {
      holon: { type: "string" },
      context: { type: "string" },
      version: { type: "number" },
    },
    required: ["holon", "context", "version"],
  },

  chainTypes: [
    {
      chainType: "flow",
      // A holon's FlowPolicy + (M2) its side of an agreement are written by that
      // holon's own lane only — single-writer, mirroring the token chain model
      // the settlement layer depends on (D-WRITER-MODEL).
      writerModel: "single",
      access: "read-write",
      eventTypes: [
        // flow.policy_set projects a `flow_policy` node via the generic triple
        // materializer (nodeKind declared) — versions update the node in place,
        // keyed by entityId flow-policy-<holon>-<context> (types.ts).
        { type: "flow.policy_set", nodeKind: "flow_policy" },
      ],
    },
  ],

  graphTypes: [
    { nodeType: "flow_policy", access: "read-write" },
  ],

  // flow.policy_set projects flow_policy via the generic triple materializer
  // (prefix declared here + nodeKind on the eventType above). No custom
  // materializer for M1; M3+ settlement adds its own.
  eventTypePrefixes: ["flow."],

  wsMessageTypes: [
    { type: "flow.policy_set", direction: "inbound", description: "Arm/update a FlowPolicy" },
    { type: "flow.policy_set.result", direction: "outbound", description: "Ack with commit id" },
    { type: "flow.get_policy", direction: "inbound", description: "Read latest FlowPolicy" },
    { type: "flow.get_policy.result", direction: "outbound", description: "Latest FlowPolicy" },
  ],

  capabilities: [
    { name: "flow.read", trustLevel: "owner" },
    { name: "flow.write", trustLevel: "owner" },
  ],

  // Reuse (Rule 8): value rides token.pay; channels/caps read the trust graph.
  dependencies: ["token", "trust"],

  permissions: {
    minTrustLevel: "owner",
    domainScopable: false,
    hiveConfigurable: false,
  },

  operations: FLOW_FUNDING_OPERATIONS,
};
