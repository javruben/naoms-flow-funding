// src/packages/flow-funding/enrichers/flow-party-edge.ts — 1328 ENRICHER (R2)
//
// PERSON-EDGE MATERIALIZER: flow_agreement → contact `party_to`.
//
// The R2 coverage analysis found that a bilateral flow-agreement stores its two
// parties (`proposer`, `counterparty`) — and the confirming `accepter` — only as
// scalar DID PROPERTIES on the `flow_agreement` node (written by
// handlers/agreement.ts, projected by the generic triple materializer; the fold
// enricher materializers/flow-agreement.ts reads them for status). There is NO
// edge from a funding agreement to the people it is between — so "which funding
// agreements do I have with Rik" is unanswerable as a graph walk even though the
// party DIDs are present. This weaves the flow-funding package's agreements into
// the same person graph P2/P3 built for messages/email/calls.
//
//   "funding agreements with Rik" =
//     graphQueryAsync({ neighbors_of:[rikContactId], edge_types:["party_to"] }).
//
// HONESTY (Three Axioms): a party DID is only edged when it resolves to a
// contact/friend the owner ALREADY KNOWS, via the EXISTING lookup-only
// resolveExistingContactIdByDid (the same DID resolver P2's calendar `attended`
// and call `spoke_with` edges use). A DID with no matching contact/friend node
// is LEFT as a property — no fabricated contact, no dangling edge.
//
// Fires on the two lanes that name the parties: `flow.agreement_proposed`
// (proposer + counterparty) and `flow.agreement_accepted` (accepter). It reads
// the merged node by agreementId (mirroring the fold enricher) so it sees every
// party regardless of which lane triggered it, and re-runs converge (edges are
// keyed by source+target+type — a re-fire re-asserts, it does not duplicate a
// distinct party).
//
// PC-839 hot path: node read + contact resolve + edge write use the `*Async`
// siblings.

import type {
  EnricherContext,
  MaterializerEnricher,
} from "@naoms/core/enrichers/types.ts";
import { extractPayloadDeep } from "@naoms/core/enrichers/enricher-utils.ts";
import { resolveExistingContactIdByDid } from "@naoms/core/graph/contact-resolve-existing.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:party-edge");

export const flowPartyEdge: MaterializerEnricher = {
  id: "flow-funding/flow-party-edge",
  eventPatterns: [
    "flow.agreement_proposed",
    "flow.agreement_accepted",
  ],
  phase: "post",
  critical: false,
  builtIn: true,
  // The flow_agreement node (edge SOURCE) must exist first; the generic triple
  // materializer writes it in the same materialize pass, and the fold enricher
  // reads it the same way — post-phase enrichers see the node.
  after: ["flow-funding/flow-agreement-fold"],
  declares: {
    reads: ["flow_agreement", "contact"],
    writes: [],
    edges: ["party_to"],
  },

  async handler(ctx: EnricherContext): Promise<void> {
    const data = extractPayloadDeep(ctx);
    const agreementId = (typeof data.agreementId === "string"
      ? data.agreementId
      : typeof data.id === "string"
      ? data.id
      : null);
    if (!agreementId) return;

    const query = ctx.scope.graphQueryAsync ?? ctx.scope.graphQuery;
    if (!query) {
      L.warn(
        "party-edge: no graphQuery on scope — leaving parties as properties",
        { agreementId },
      );
      return;
    }

    const res = await Promise.resolve(
      query({ type: "flow_agreement", where: { agreementId }, limit: 1 }),
    );
    const node = res?.nodes?.[0];
    if (!node) return;
    const p = (node.properties ?? {}) as Record<string, unknown>;

    // The two named parties, plus the confirming accepter (== counterparty on an
    // active agreement, but read defensively). De-dupe so one party writes one
    // edge even when it appears in two slots.
    const partyDids = new Set(
      [p.proposer, p.counterparty, p.accepter].filter(
        (d): d is string => typeof d === "string" && d.startsWith("did:"),
      ),
    );
    if (partyDids.size === 0) return;

    const graphLink = ctx.scope.graphLinkAsync ?? ctx.scope.graphLink;
    if (!graphLink) {
      L.warn(
        "party-edge: no graphLink on scope — leaving parties as properties",
        { agreementId },
      );
      return;
    }

    let linked = 0;
    let unresolved = 0;
    for (const did of partyDids) {
      const contactId = await resolveExistingContactIdByDid(query, did);
      if (!contactId) {
        // Honesty: unknown party stays a property; NO fabricated contact/edge.
        unresolved++;
        continue;
      }
      await graphLink({
        source: node.id,
        target: contactId,
        type: "party_to",
        properties: { party_did: did, method: "flow_agreement_party" },
      });
      linked++;
    }
    L.debug("party-edge: materialized flow_agreement↔contact edges", {
      agreementId,
      linked,
      unresolved,
    });
  },
};
