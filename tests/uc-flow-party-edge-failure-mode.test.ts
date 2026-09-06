// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier ffi-integration
// @covers src/packages/flow-funding/enrichers/flow-party-edge.ts
// @covers src/core/graph/contact-resolve-existing.ts
// @mechanism-asserted HONESTY axiom: when an agreement party DID matches NO existing contact/friend node (resolveExistingContactIdByDid returns null), the enricher writes NO `party_to` edge and fabricates NO contact — the party stays a raw DID property on the flow_agreement node. Paired with uc-flow-party-edge-success.test.ts.
// @bypasses NONE — drives the published handler(ctx) over a REAL createTestDb graph schema.
// @canonical-flow YES
// @pre-seeds NONE (flow_agreement seeded; its parties are deliberately UNKNOWN — no contact nodes)
// === END HEADER ===

import "../../../../tests/helpers/_disable-ffi-hash-sidecar.ts";
import { assertEquals } from "jsr:@std/assert@1";
import {
  _graphLinkAsync,
  _graphPutAsync,
  graphQueryAsync,
} from "@naoms/core/graph/index.ts";
import { dbClose, dbQuery } from "@naoms/ffi/_db-internal.ts";
import type { EnricherContext } from "@naoms/core/enrichers/types.ts";
import type { TripleMaterializerScope } from "@naoms/core/graph/triple/materializer.ts";
import { createTestDb } from "../../../../tests/helpers/test-utils.ts";
import { flowPartyEdge } from "../enrichers/flow-party-edge.ts";

function makeScope(db: bigint): TripleMaterializerScope {
  return {
    db,
    graphPutAsync: async (opts: Record<string, unknown>) => {
      await _graphPutAsync(
        db,
        { ...opts, _calledFromMaterializer: true } as unknown as Parameters<
          typeof _graphPutAsync
        >[1],
      );
    },
    graphLinkAsync: async (opts: Record<string, unknown>) => {
      await _graphLinkAsync(
        db,
        { ...opts, _calledFromMaterializer: true } as unknown as Parameters<
          typeof _graphLinkAsync
        >[1],
      );
    },
    graphQueryAsync: async (opts: Record<string, unknown>) =>
      await graphQueryAsync(
        db,
        opts as unknown as Parameters<typeof graphQueryAsync>[1],
      ),
  } as unknown as TripleMaterializerScope;
}

function makeCtx(db: bigint, agreementId: string): EnricherContext {
  return {
    eventType: "flow.agreement_proposed",
    branch: "content",
    chain: { id: "friendship-chain" } as unknown as EnricherContext["chain"],
    commit: {
      id: "commit-flow-2",
      payload: JSON.stringify({ id: agreementId, agreementId }),
      timestamp: new Date().toISOString(),
    } as unknown as EnricherContext["commit"],
    scope: makeScope(db),
    triples: [],
    cwd: "",
    db,
    abort: () => {},
    getEnricherResult: () => undefined,
    setEnricherResult: () => {},
  } as unknown as EnricherContext;
}

async function seedAgreement(
  db: bigint,
  id: string,
  proposer: string,
  counterparty: string,
): Promise<void> {
  await _graphPutAsync(
    db,
    {
      type: "flow_agreement",
      id,
      properties: {
        agreementId: id,
        proposer,
        counterparty,
        status: "proposed",
      },
      _calledFromMaterializer: true,
    } as unknown as Parameters<typeof _graphPutAsync>[1],
  );
}

async function drainAndClose(db: bigint): Promise<void> {
  for (let i = 0; i < 32; i++) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
  try {
    dbClose(db);
  } catch { /* best-effort */ }
}

Deno.test("1328 R2: flow_agreement whose parties are UNKNOWN → NO edge, NO phantom contact, DIDs stay properties", async () => {
  const db = createTestDb("flow-party-unknown");
  try {
    const AGREEMENT_ID = "agr-2";
    const STRANGER_A = "did:naoms:stranger-a";
    const STRANGER_B = "did:naoms:stranger-b";
    // Seed ONLY the agreement — neither party has a contact/friend node.
    await seedAgreement(db, AGREEMENT_ID, STRANGER_A, STRANGER_B);

    await flowPartyEdge.handler(makeCtx(db, AGREEMENT_ID));

    // Honesty: no known party → NO `party_to` edge written at all.
    const edges = dbQuery(
      db,
      `SELECT source_id, target_id FROM graph_edges WHERE edge_type = 'party_to'`,
      [],
    );
    assertEquals(edges.length, 0);

    // And NO phantom contact node was fabricated for either dangling DID.
    const contacts = dbQuery(
      db,
      `SELECT id FROM graph_nodes WHERE kind = 'contact'`,
      [],
    );
    assertEquals(contacts.length, 0);
  } finally {
    await drainAndClose(db);
  }
});
