// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/handlers/agreement.ts:isSelfParty (canonical-DID compare — a #key-0 fragment cannot defeat it)
// @covers src/packages/flow-funding/handlers/agreement.ts:refuseSelfPartyAgreement (honest reason, not "pair with this peer first")
// @covers src/packages/flow-funding/handlers/agreement.ts:handleAgreementPropose / handleAgreementAccept / handleAgreementRevoke (all three probeFriendshipChain call sites)
// @bypasses signing=test-key, identity=none — the handlers are driven directly with a real dbHandle and a real created friendship chain.
// @canonical-flow YES — flow.agreement_propose / _accept / _revoke where both parties resolve to the caller.
// @mechanism-asserted self-party-short-circuit (ctx.chain.get is NEVER called and ZERO commits land on the friendship chain) + honest reason token
// @honesty-rationale Honesty axiom. `deriveFriendshipChainId` correctly throws "self-pair not permitted"; `probeFriendshipChain` SWALLOWED it, returned null, and every call site then reported "no friendship chain with <you> — pair with this peer first". That refusal is loud but names a cause that is NOT the cause and asks the user to pair with themselves — impossible. `propose` did guard, but on RAW strings, so `did:key:z…#key-0` walked straight past it into the swallowed path. Asserting the reason token AND zero chain resolutions AND zero commits is the only assertion that can fail against the old behaviour: a bare "an error came back" assertion PASSED before this fix.
// @pre-seeds a real `friendship`/`bilateral` chain (so a zero commit count is the short-circuit, not a missing chain).
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
import { canonicalPeerDid } from "@naoms/packages/contacts/peer-did.ts";
import {
  handleAgreementAccept,
  handleAgreementPropose,
  handleAgreementRevoke,
} from "../handlers/agreement.ts";

const opts = { sanitizeOps: false, sanitizeResources: false };

const OTHER = "did:key:z6MkFlowSelfPartyOtherPeer000000000000000000000";
const AGREEMENT_ID = "flow-agreement-selfparty-1";

interface Rig {
  db: bigint;
  self: string;
  fcId: string;
  chainGets: string[];
  responses: Array<Record<string, unknown>>;
  // deno-lint-ignore no-explicit-any
  ctx: any;
  respond: (m: Record<string, unknown>) => void;
}

/**
 * A rig whose graph answers with a flow_agreement node whose BOTH parties are
 * the caller — the shape accept/revoke fold before probing the chain.
 */
function makeRig(
  label: string,
  ownerDid: string,
  nodeProposer: string,
  nodeCounterparty: string = nodeProposer,
): Rig {
  const db = createTestDb(label);
  registerTestKey(db);
  initTestSigning();
  // A REAL bilateral chain exists between self and a real OTHER peer, so a
  // zero-commit assertion below cannot pass merely because no chain exists.
  const fcId = deriveFriendshipChainId(TEST_DID, OTHER);
  createChain(db, {
    id: fcId,
    ownerDid: TEST_DID,
    chainType: "friendship",
    writerModel: "bilateral",
    branches: ["content"],
  });
  const chainGets: string[] = [];
  const responses: Array<Record<string, unknown>> = [];
  return {
    db,
    self: ownerDid,
    fcId,
    chainGets,
    responses,
    ctx: {
      dbHandle: db,
      ownerDid,
      chain: {
        get: (id: string) => {
          chainGets.push(id);
          return { id };
        },
      },
      graph: {
        queryAsync: () =>
          Promise.resolve({
            nodes: [{
              id: AGREEMENT_ID,
              kind: "flow_agreement",
              properties: {
                agreementId: AGREEMENT_ID,
                proposer: nodeProposer,
                counterparty: nodeCounterparty,
                status: "proposed",
              },
            }],
          }),
      },
    },
    respond: (m: Record<string, unknown>) => {
      responses.push(m);
    },
  };
}

function assertRefused(rig: Rig, resultType: string, what: string): void {
  assertEquals(
    rig.responses.length,
    1,
    `${what}: exactly ONE response expected, got ${
      JSON.stringify(rig.responses)
    }`,
  );
  const r = rig.responses[0];
  assertEquals(r.type, resultType, what);
  assertEquals(r.ok, false, what);
  assertEquals(
    r.reason,
    "SELF_TARGETED_AGREEMENT",
    `${what}: the refusal MUST name the REAL reason`,
  );
  const err = String(r.error ?? "");
  // The DISHONEST pre-fix reason must be gone.
  assert(
    !err.includes("pair with this peer first"),
    `${what}: MUST NOT tell the user to pair with themselves — got "${err}"`,
  );
  assert(
    err.includes("two distinct parties"),
    `${what}: the prose MUST say why — got "${err}"`,
  );
  // INSTRUMENT CONTROL: production echoes the DID it actually resolved as self
  // (actorDid = callerDid || ownerDid). If the fixture's "self" were not the
  // DID production uses, this assertion fails.
  assert(
    err.includes(canonicalPeerDid(rig.self)),
    `${what}: the refusal MUST name the self DID production resolved (${
      canonicalPeerDid(rig.self)
    }) — got "${err}"`,
  );
  // MECHANISM: nothing was attempted — no chain resolution, no commit.
  assertEquals(
    rig.chainGets,
    [],
    `${what}: a self-party agreement MUST NOT resolve any friendship chain`,
  );
  const commits = getCommits(rig.db, {
    chainId: rig.fcId,
    limit: 100,
  }) as Array<
    { type?: string }
  >;
  assertEquals(
    commits.filter((c) => (c.type ?? "").startsWith("flow.agreement_")).length,
    0,
    `${what}: no flow.agreement_* commit may land`,
  );
}

Deno.test(
  "1785 failure-mode: flow.agreement_propose with the caller as counterparty is refused with the HONEST reason",
  opts,
  async () => {
    const rig = makeRig("1785-flow-self-propose", TEST_DID, TEST_DID);
    await handleAgreementPropose(
      rig.ctx,
      {
        type: "flow.agreement_propose",
        counterparty: TEST_DID,
        terms: { tier: "relational", formality: 0.5 },
      },
      rig.respond,
    );
    assertRefused(rig, "flow.agreement_propose.result", "propose self");
  },
);

Deno.test(
  "1785 failure-mode: a #key-0 fragment does NOT defeat the propose self-party guard (raw-string compare did)",
  opts,
  async () => {
    const rig = makeRig("1785-flow-self-propose-frag", TEST_DID, TEST_DID);
    await handleAgreementPropose(
      rig.ctx,
      {
        type: "flow.agreement_propose",
        counterparty: `${TEST_DID}#key-0`,
        terms: { tier: "relational", formality: 0.5 },
      },
      rig.respond,
    );
    assertRefused(rig, "flow.agreement_propose.result", "propose self #key-0");
  },
);

Deno.test(
  "1785 failure-mode: flow.agreement_accept on a self-party agreement is refused honestly (not 'no friendship chain with proposer')",
  opts,
  async () => {
    const rig = makeRig("1785-flow-self-accept", TEST_DID, TEST_DID);
    await handleAgreementAccept(
      rig.ctx,
      { type: "flow.agreement_accept", agreementId: AGREEMENT_ID },
      rig.respond,
    );
    assertRefused(rig, "flow.agreement_accept.result", "accept self");
  },
);

Deno.test(
  "1785 failure-mode: flow.agreement_revoke on a self-party agreement is refused honestly, fragment included",
  opts,
  async () => {
    // revoker === proposer (bare), and the OTHER party carries a #key-0
    // fragment: the party-membership check passes, so the self-party guard is
    // the thing under test. A raw-string compare would let this through.
    const rig = makeRig(
      "1785-flow-self-revoke",
      TEST_DID,
      TEST_DID,
      `${TEST_DID}#key-0`,
    );
    await handleAgreementRevoke(
      rig.ctx,
      { type: "flow.agreement_revoke", agreementId: AGREEMENT_ID },
      rig.respond,
    );
    assertRefused(rig, "flow.agreement_revoke.result", "revoke self");
  },
);
