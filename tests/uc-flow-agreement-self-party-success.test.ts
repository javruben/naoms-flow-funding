// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/handlers/agreement.ts:handleAgreementPropose (a DISTINCT counterparty still proposes end-to-end)
// @covers src/packages/flow-funding/handlers/agreement.ts:isSelfParty (does NOT fire between two distinct DIDs)
// @bypasses signing=test-key (initTestSigning/registerTestKey — the standard uc signing fixture), identity=none
// @canonical-flow YES — flow.agreement_propose on the bilateral friendship chain.
// @mechanism-asserted real-securedAppend-on-fcAB (a flow.agreement_proposed commit lands on the REAL friendship chain and the handler returns its commit id) — not a stubbed append
// @honesty-rationale POSITIVE CONTROL for the 1785 self-party refusal. The refusal is inserted on the path EVERY propose/accept/revoke takes; a guard that is too broad would refuse legitimate bilateral agreements outright. This arm drives the REAL handler against a REAL created friendship chain with REAL signing, and asserts the commit actually landed — so an over-broad guard fails here loudly instead of shipping as an outage.
// @pre-seeds a real `friendship`/`bilateral` chain at deriveFriendshipChainId(proposer,counterparty) via createChain.
// === END HEADER ===
// @roadmap 1785

import { assert, assertEquals } from "jsr:@std/assert";
import {
  createTestDb,
  initTestSigning,
  registerTestKey,
  TEST_DID,
} from "../../../../tests/helpers/test-utils.ts";
import { createChain, getCommits } from "@naoms/core/chain/index.ts";
import { deriveFriendshipChainId } from "@naoms/packages/contacts/friendship-chain-id.ts";
import { handleAgreementPropose } from "../handlers/agreement.ts";

const opts = { sanitizeOps: false, sanitizeResources: false };

const PEER = "did:key:z6MkFlowSelfPartyDistinctPeer00000000000000000";

Deno.test(
  "1785 POSITIVE CONTROL: flow.agreement_propose to a DISTINCT counterparty still lands a real commit on the bilateral chain",
  opts,
  async () => {
    const db = createTestDb("1785-flow-selfparty-positive");
    registerTestKey(db);
    initTestSigning();

    const proposer = TEST_DID;
    const fcId = deriveFriendshipChainId(proposer, PEER);
    createChain(db, {
      id: fcId,
      ownerDid: proposer,
      chainType: "friendship",
      writerModel: "bilateral",
      branches: ["content"],
    });

    const responses: Array<Record<string, unknown>> = [];
    // deno-lint-ignore no-explicit-any
    const ctx: any = {
      dbHandle: db,
      ownerDid: proposer,
      chain: { get: (id: string) => (id === fcId ? { id } : null) },
      graph: { queryAsync: () => Promise.resolve({ nodes: [] }) },
    };

    await handleAgreementPropose(
      ctx,
      {
        type: "flow.agreement_propose",
        counterparty: PEER,
        terms: { tier: "relational", formality: 0.5 },
      },
      (m: Record<string, unknown>) => {
        responses.push(m);
      },
    );

    assertEquals(responses.length, 1);
    const r = responses[0];
    assert(
      r.reason !== "SELF_TARGETED_AGREEMENT",
      `a proposal to a DISTINCT counterparty MUST NOT be refused as self-party: ${
        JSON.stringify(r)
      }`,
    );
    assertEquals(
      r.ok,
      true,
      `propose to a distinct paired peer MUST succeed: ${JSON.stringify(r)}`,
    );
    assertEquals(r.type, "flow.agreement_propose.result");
    assert(typeof r.agreementId === "string" && r.agreementId.length > 0);
    assert(typeof r.commit === "string" && (r.commit as string).length > 0);

    // MECHANISM: a real commit exists on the real friendship chain.
    const commits = getCommits(db, { chainId: fcId, limit: 100 }) as Array<
      { type?: string }
    >;
    const proposed = commits.filter((c) => c.type === "flow.agreement_proposed");
    assertEquals(
      proposed.length,
      1,
      "exactly one flow.agreement_proposed commit MUST be on the bilateral chain",
    );
  },
);
