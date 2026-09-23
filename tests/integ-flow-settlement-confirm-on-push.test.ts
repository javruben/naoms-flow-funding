// src/packages/flow-funding/tests/integ-flow-settlement-confirm-on-push.test.ts
//
// 1644 M-CONFIRM-ON-PUSH — the FAITHFUL proof of the feature's core value:
// a settlement leg that had NO in-band confirmation (the persisted state a
// cross-device leg lands in when its FROST 2-of-2 ceremony exceeds epoch-settle's
// 15s gated-pay deadline → the settle response buckets it `indeterminate`) RESOLVES
// `unconfirmed → paid` when the LATE flow-tagged `token.transfer` commits.
//
// WHY this test exists (economics QM, 2026-07-01): the 2-daemon e2e
// (e2e-flow-payee-credit-cli) proves the END-TO-END wiring — a real cross-device
// ceremony commits a real token.transfer that fires the confirm-on-push hook, and
// `get-settlement` shows the leg `paid`. But that run took the <15s already-`paid`
// path; it does NOT directly prove that a leg which was `indeterminate` (>15s) at
// settle time gets OVERRIDDEN to `paid` by a LATER commit. epoch-settle's 15s
// deadline is hardcoded / not test-injectable, so the >15s bucket can't be forced
// through the full settle deterministically. This test closes the gap AT THE HOOK
// LEVEL (QM-sanctioned): it drives the REAL `_hook_flow_settlement_confirm` with the
// EXACT production Commit shape the late ceremony produces, and asserts the
// resolution logic + `get-settlement`'s read.
//
// KEY correctness fact this asserts: `get-settlement` is BUCKET-AGNOSTIC. It never
// reads the settle-response bucket (that bucket is never persisted); a leg is `paid`
// IFF a `flow_settlement_confirm` node exists for it — created by the hook on ANY
// flow-tagged token.transfer commit, regardless of whether the settle response was
// `paid` (fast) or `indeterminate` (slow). So the <15s and >15s paths resolve
// identically; the ONLY difference is WHEN the transfer commits, which this test
// exercises (the leg is unconfirmed FIRST, then a separate late commit confirms it).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/domain/settlement-confirm-hook.ts:1
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:handleGetSettlement
// @mechanism-asserted M-CONFIRM-ON-PUSH indeterminate→paid — a flow_settlement leg with NO
//   confirm node (the persisted >15s `indeterminate` state) reads `unconfirmed` via
//   get-settlement; after the REAL confirm-on-push hook processes the late flow-tagged
//   token.transfer commit (exact production Commit shape) a flow_settlement_confirm node
//   is written and get-settlement OVERRIDES the leg to `paid`. Idempotent on replay; a
//   non-flow token.transfer (no `flow-settle:` memo) creates no confirm node.
// @bypasses db=createTestDb (in-process test DB), signing=initTestSigning. The hook +
//   get-settlement handler ARE the assertion target, driven over a real DB + real graph
//   API; the late token.transfer commit is supplied as the exact production Commit shape
//   (payload {entry:{kind:transfer,toDid,amount,memo,payerDid}} on a `token-` branch) — the
//   2-daemon e2e separately proves a REAL ceremony produces that commit and fires the hook.
// @honesty-rationale the hook consumes a chain commit produced by a FROST token-transfer
//   ceremony; no ceremony key material exists in an in-process integ DB, so the commit
//   input must be constructed (to its exact production shape) — removing the bypass would
//   require the full 2-daemon ceremony, which is the sibling e2e's job, not this tier's.
//   [canonical-flow YES] real _hook_flow_settlement_confirm + real
//   handleGetSettlement over a real DB; only the transfer-commit input is
//   constructed (to its production shape).
// @canonical-flow YES
// === END HEADER ===

import { assertEquals } from "jsr:@std/assert@1";
import {
  createTestDb,
  initTestSigning,
  registerTestKey,
  TEST_DID,
} from "../../../../tests/helpers/test-utils.ts";
import { _graphPutAsync, graphQueryAsync } from "@naoms/core/graph";
import { _hook_flow_settlement_confirm } from "../domain/settlement-confirm-hook.ts";
import {
  type EpochSettleContext,
  handleGetSettlement,
} from "../handlers/epoch-settle.ts";

const SR = { sanitizeResources: false, sanitizeOps: false } as const;

type Leg = { id: string; amount: number; status: string };

function makeCtx(db: bigint, holon: string): EpochSettleContext {
  return {
    dbHandle: db,
    ownerDid: holon,
    graph: {
      queryAsync: (p: Record<string, unknown>) =>
        graphQueryAsync(
          db,
          p as unknown as Parameters<typeof graphQueryAsync>[1],
        ),
    },
  } as unknown as EpochSettleContext;
}

async function getSettlement(
  ctx: EpochSettleContext,
  holon: string,
  context: string,
): Promise<Record<string, unknown>> {
  let out: Record<string, unknown> = {};
  await handleGetSettlement(
    ctx,
    { type: "flow.get_settlement", holon, context },
    (r) => {
      out = r;
    },
  );
  return out;
}

function findLeg(
  res: Record<string, unknown>,
  claimant: string,
): Leg | undefined {
  const settlements = (res.settlements as Array<{ legs?: Leg[] }>) ?? [];
  for (const s of settlements) {
    const leg = (s.legs ?? []).find((l) => l.id === claimant);
    if (leg) return leg;
  }
  return undefined;
}

// The exact production Commit shape a token.transfer produces (tools-pay.ts +
// tools-state.ts: securedAppend payload = JSON.stringify({ entry }) on branch
// `token-<id>`). `memo` carries the flow correlation tag; `toDid` is the claimant.
function transferCommit(
  tokenId: string,
  seq: number,
  toDid: string,
  amount: number,
  memo: string,
  payerDid: string,
) {
  return {
    id: `transfer-commit-${seq}`,
    chainId: tokenId,
    branch: `token-${tokenId}`,
    sequence: seq,
    type: "token.transfer",
    timestamp: "2026-07-01T00:00:00.000Z",
    payload: JSON.stringify({
      entry: {
        kind: "transfer",
        toDid,
        loss_bearer: toDid,
        amount,
        memo,
        payerDid,
      },
    }),
  } as unknown as Parameters<typeof _hook_flow_settlement_confirm>[3];
}

Deno.test({
  ...SR,
  name:
    "1644 M-CONFIRM-ON-PUSH: a leg with no in-band confirmation (the >15s " +
    "`indeterminate` state) resolves unconfirmed→paid when the late flow-tagged " +
    "token.transfer commits; idempotent; ignores non-flow transfers",
}, async () => {
  const db = createTestDb();
  registerTestKey(db);
  initTestSigning();

  const holon = TEST_DID;
  const context = "nao";
  const claimant = "did:nao:dependent-a";
  const settlementId = `flow-settlement-${holon}-${context}-1730000000000`;
  const tokenId = "tok_test_1644";

  // A settlement committed a leg to the claimant, but value did NOT move in-band
  // (unarmed / the cross-device pay exceeded the 15s deadline) → NO confirm node.
  // This is exactly the persisted state a >15s `indeterminate` leg lands in.
  await _graphPutAsync(db, {
    type: "flow_settlement",
    id: settlementId,
    properties: {
      id: settlementId,
      settlementId,
      holon,
      context,
      surplus: 200,
      settledTotal: 200,
      allocations: [{ id: claimant, amount: 200 }],
    },
  });

  const ctx = makeCtx(db, holon);

  // ── (1) BEFORE the late commit: the leg reads `unconfirmed`. ──
  const before = await getSettlement(ctx, holon, context);
  assertEquals(
    findLeg(before, claimant)?.status,
    "unconfirmed",
    `leg MUST read unconfirmed before the late transfer — ${
      JSON.stringify(before)
    }`,
  );

  // ── (2) The LATE cross-device token.transfer commits on the holon's token branch
  //        (the FROST ceremony completed AFTER the settle response returned). Drive
  //        the REAL confirm-on-push hook with the exact production Commit shape. ──
  await _hook_flow_settlement_confirm(
    db,
    tokenId,
    `token-${tokenId}`,
    transferCommit(
      tokenId,
      1,
      claimant,
      200,
      `flow-settle:${settlementId}`,
      holon,
    ),
  );

  // ── (3) AFTER: get-settlement OVERRIDES the leg to `paid` via the confirm node.
  //        This is the feature's core value: a was-indeterminate leg resolves. ──
  const after = await getSettlement(ctx, holon, context);
  assertEquals(
    findLeg(after, claimant)?.status,
    "paid",
    `leg MUST read paid after the late flow-tagged transfer commits — ${
      JSON.stringify(after)
    }`,
  );

  // ── (4) Idempotent: re-firing on push/backfill/replay keeps ONE confirm node. ──
  await _hook_flow_settlement_confirm(
    db,
    tokenId,
    `token-${tokenId}`,
    transferCommit(
      tokenId,
      1,
      claimant,
      200,
      `flow-settle:${settlementId}`,
      holon,
    ),
  );
  const confirms = await graphQueryAsync(db, {
    type: "flow_settlement_confirm",
    where: { settlementId },
  });
  assertEquals(
    (confirms.nodes ?? []).length,
    1,
    "idempotent: exactly one flow_settlement_confirm node after replay",
  );
  assertEquals(
    findLeg(await getSettlement(ctx, holon, context), claimant)?.status,
    "paid",
    "still paid after replay (not doubled / not reverted)",
  );

  // ── (5) A NON-flow token.transfer (no `flow-settle:` memo) confirms nothing. ──
  await _hook_flow_settlement_confirm(
    db,
    tokenId,
    `token-${tokenId}`,
    transferCommit(tokenId, 2, "did:nao:someone-else", 5, "lunch", holon),
  );
  const stray = await graphQueryAsync(db, {
    type: "flow_settlement_confirm",
    where: { settlementId },
  });
  assertEquals(
    (stray.nodes ?? []).length,
    1,
    "a non-flow-tagged token.transfer MUST NOT create a confirm node",
  );
});
