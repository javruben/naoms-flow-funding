// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier ffi-integration
// @covers src/packages/flow-funding/enrichers/flow-party-edge.ts
// @covers src/core/graph/contact-resolve-existing.ts
// @mechanism-asserted the proposer/counterparty DIDs stored as scalar properties on the flow_agreement node are resolved via the REUSED lookup-only resolveExistingContactIdByDid into REAL `party_to` edges (flow_agreement→contact) on the graph_edges table, AND "funding agreements with Rik" is answerable via graphQueryAsync({neighbors_of:[rikContactId], edge_types:["party_to"]}). Paired with uc-1328-flow-party-edge-failure-mode.test.ts.
// @bypasses NONE — drives the published handler(ctx) over a REAL createTestDb graph schema; the flow_agreement node + the two contacts (with `did` surfaces) are seeded via _graphPutAsync.
// @canonical-flow YES
// @pre-seeds NONE (flow_agreement + contacts seeded via _graphPutAsync)
// === END HEADER ===

import "../../../../tests/helpers/_disable-ffi-hash-sidecar.ts";
import { assert, assertEquals } from "jsr:@std/assert@1";
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

const OWNER_PRINCIPAL = "did:naoms:test-owner";

function makeScope(db: bigint): TripleMaterializerScope {
  return {
    db,
    graphPutAsync: async (opts: Record<string, unknown>) => {
      await _graphPutAsync(db, { ...opts, _calledFromMaterializer: true } as
        unknown as Parameters<typeof _graphPutAsync>[1]);
    },
    graphLinkAsync: async (opts: Record<string, unknown>) => {
      await _graphLinkAsync(db, { ...opts, _calledFromMaterializer: true } as
        unknown as Parameters<typeof _graphLinkAsync>[1]);
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
    eventType: "flow.agreement_accepted",
    branch: "content",
    chain: { id: "friendship-chain" } as unknown as EnricherContext["chain"],
    commit: {
      id: "commit-flow-1",
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
  await _graphPutAsync(db, {
    type: "flow_agreement",
    id,
    properties: {
      agreementId: id,
      proposer,
      counterparty,
      accepter: counterparty,
      status: "active",
    },
    _calledFromMaterializer: true,
  } as unknown as Parameters<typeof _graphPutAsync>[1]);
}

async function seedContact(
  db: bigint,
  id: string,
  did: string,
): Promise<void> {
  await _graphPutAsync(db, {
    type: "contact",
    id,
    properties: { name: id, did },
    principal: OWNER_PRINCIPAL,
    _calledFromMaterializer: true,
  } as unknown as Parameters<typeof _graphPutAsync>[1]);
}

async function drainAndClose(db: bigint): Promise<void> {
  for (let i = 0; i < 32; i++) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
  try {
    dbClose(db);
  } catch { /* best-effort */ }
}

Deno.test("1328 R2: flow_agreement whose parties are known contacts → `party_to` edges; 'agreements with Rik' is a graph query", async () => {
  const db = createTestDb("flow-party-known");
  try {
    const AGREEMENT_ID = "agr-1";
    const OWNER_DID = "did:naoms:owner";
    const RIK_DID = "did:naoms:rik";
    await seedAgreement(db, AGREEMENT_ID, OWNER_DID, RIK_DID);
    await seedContact(db, "contact-owner", OWNER_DID);
    await seedContact(db, "contact-rik", RIK_DID);

    await flowPartyEdge.handler(makeCtx(db, AGREEMENT_ID));

    // REAL `party_to` edges: flow_agreement → each resolved contact.
    const rows = dbQuery(
      db,
      `SELECT source_id, target_id, edge_type, properties FROM graph_edges WHERE edge_type = 'party_to' ORDER BY target_id`,
      [],
    );
    assertEquals(rows.length, 2);
    for (const r of rows) {
      assertEquals(r.source_id, AGREEMENT_ID);
      assertEquals(r.edge_type, "party_to");
    }
    const targets = new Set(rows.map((r) => r.target_id));
    assert(targets.has("contact-owner"));
    assert(targets.has("contact-rik"));
    const rikRow = rows.find((r) => r.target_id === "contact-rik")!;
    const p = JSON.parse(rikRow.properties as string) as Record<string, unknown>;
    assertEquals(p.party_did, RIK_DID);
    assertEquals(p.method, "flow_agreement_party");

    // "funding agreements with Rik" = Rik's `party_to` neighbours.
    const res = await graphQueryAsync(db, {
      neighbors_of: ["contact-rik"],
      edge_types: ["party_to"],
      depth: 1,
    }) as { nodes?: Array<{ id: string }> };
    const ids = new Set((res.nodes ?? []).map((n) => n.id));
    assert(
      ids.has(AGREEMENT_ID),
      "the agreement must be reachable from Rik via `party_to`",
    );
  } finally {
    await drainAndClose(db);
  }
});
