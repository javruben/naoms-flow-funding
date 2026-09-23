// src/packages/flow-funding/materializers/flow-agreement.ts — 1644 M2 fold.
//
// The generic triple materializer merges the two lanes' events into ONE
// `flow_agreement` node (both carry entityId == agreementId): the proposer's
// `flow.agreement_proposed` sets proposer/counterparty/terms; the counterparty's
// `flow.agreement_accepted` sets accepter; `flow.agreement_revoked` sets revoker.
// This POST enricher carries the bilateral fold the generic projector cannot: it
// reads the merged node (graphQueryAsync) and recomputes the authoritative status
//   revoked  (terminal — a revoker is recorded)
//   active   (both lanes present AND accepter == the named counterparty)
//   proposed (otherwise)
// Order-independent: on whichever daemon the second lane lands (proposer's own,
// or the peer's via replication), this enricher re-runs and converges to `active`.
//
// PC-700/701: the read is scope.graphQueryAsync, the write scope.graphPutAsync —
// no chain emit from the handler body (clear of the write-lock class).
//
// @mechanism-asserted flow-agreement bilateral two-lane fold via graphQueryAsync

import type {
  EnricherContext,
  MaterializerEnricher,
} from "@naoms/core/enrichers/types.ts";
import { extractPayloadDeep } from "@naoms/core/enrichers/enricher-utils.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:agreement-fold");

export const flowAgreementFold: MaterializerEnricher = {
  id: "flow-funding/flow-agreement-fold",
  eventPatterns: [
    "flow.agreement_proposed",
    "flow.agreement_accepted",
    "flow.agreement_revoked",
  ],
  phase: "post",
  critical: false,
  builtIn: true,
  declares: { reads: ["flow_agreement"], writes: ["flow_agreement"] },

  async handler(ctx: EnricherContext): Promise<void> {
    const data = extractPayloadDeep(ctx);
    const agreementId = (data.agreementId ?? data.id) as string | undefined;
    if (!agreementId) {
      L.warn("flow-agreement fold: missing agreementId", {
        eventType: ctx.eventType,
      });
      return;
    }

    const q = ctx.scope.graphQueryAsync ?? ctx.scope.graphQuery;
    if (!ctx.scope.graphQueryAsync && ctx.scope.graphQuery) {
      L.warn("graphQueryAsync absent — sync graphQuery fallback (PC-700)", {
        agreementId,
      });
    }
    if (!q) return;

    const res = await (q as NonNullable<typeof ctx.scope.graphQueryAsync>)({
      type: "flow_agreement",
      where: { agreementId },
      limit: 1,
    });
    if (res.error) {
      L.warn("flow-agreement fold: query failed", { error: res.error });
      return;
    }
    const node = res.nodes?.[0];
    if (!node) return;
    const p = node.properties ?? {};

    let status = "proposed";
    if (p.revoker) {
      status = "revoked";
    } else if (
      p.proposer && p.counterparty && p.accepter &&
      p.accepter === p.counterparty
    ) {
      status = "active";
    }

    if (p.status !== status) {
      const put = ctx.scope.graphPutAsync ?? ctx.scope.graphPut;
      await (put as NonNullable<typeof ctx.scope.graphPutAsync>)({
        type: "flow_agreement",
        id: node.id,
        properties: { status },
      });
      L.info("flow-agreement status folded", { agreementId, status });
    }
  },
};
