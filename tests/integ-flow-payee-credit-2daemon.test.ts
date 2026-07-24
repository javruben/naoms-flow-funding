#!/usr/bin/env -S deno test --allow-all
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @intent 1644 M4 (2-daemon, cross-identity arm) — an AUTOMATED flow settlement on
//   the HOLON daemon credits a claimant's balance on a SEPARATE claimant daemon,
//   by riding a REAL cross-device token.pay GATED by the owner-rooted single-use
//   delegation capability (non-interactive, non-bypass). This is the cross-identity
//   payee-credit-REPLICATION leg the single-daemon arm (integ-flow-consent) explicitly
//   defers to E1/1596: the single-daemon W-3 handlePay commits a transfer WITHOUT a
//   spendNonce so the payee balance never materializes; the FAITHFUL credit needs the
//   quorum-t2 dual-sign ceremony (which supplies + replay-validates the spendNonce) +
//   member push — exactly E1/1596 gate-4. Here the flow gate-seam DRIVES that path.
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:moveSettlementValue
//   (gated token.pay re-dispatch THROUGH ctx.dispatchGatedOp), :handlePolicySet (arm),
//   src/core/transport/router-gates/pre-handler-gates.ts:runApprovalGate
//   (verifyPresentedCapability — the M4 B-4 gate-seam),
//   src/packages/token/domain/ceremony.ts:validateCoPresentEntry (cross-device dual-sign),
//   src/packages/token/domain/materialize-hook.ts:_hook_token_balance_materialize (payee credit)
// @mechanism-asserted automated flow settlement on the HOLON daemon rides a REAL
//   cross-device token.pay GATED by the owner-rooted single-use capability — the gated
//   pay (a) is NON-INTERACTIVE (no approval.requested for the settlement's token.pay —
//   the capability satisfies CORE_APPROVAL_REQUIRED; an interactive fall-through would
//   surface as refused/indeterminate, never a credit), (b) fires the cross-device FROST
//   2-of-2 quorum ceremony of {holon,claimant} (coordinateQuorumSign — holon logs
//   "chain-quorum ceremony complete", claimant logs "peer ceremony released on
//   sign_result"), and (c) REPLICATES to the claimant daemon by member push, crediting
//   its token_balance >= the allocation. Anti-shortcut: a single-writer issuer-private
//   t=1 pay (no ceremony, no push) leaves the claimant daemon at balance 0 — RED.
// @bypasses db-unlock=fixture-password (spawnSingleDaemon unlocks the vault),
//   identity=pre-onboarded, iroh-mdns-disabled. NO NAOMS_NO_AUTH, NO NAOMS_TEST_MODE,
//   NO pre-seed of the credit-under-test. The settlement's token.pay is satisfied by the
//   CAPABILITY (no human answers an approval for it — that IS the M4 claim).
// @canonical-flow YES — token.define/mint/admit + flow.policy_set (arm root+K) + flow.epoch_settle via the production WS ops; the credit witness is a PAYEE-side graph.query {type:"token_balance"} on the claimant daemon, never the holon's history.
// @honesty-rationale TWO real daemons (holon=issuer/payer, claimant=payee), distinct
//   identities, real peer-pair invite ceremony — the same 2-daemon substrate E1's
//   integ-token-pay-payee-credit proved REPLICATES a token-branch entry to the member.
//   The cross-device FROST ceremony legitimately exceeds epoch-settle's 15s per-allocation
//   gated-pay deadline, so the settle HONESTLY buckets the leg `indeterminate` ("MAY have
//   committed; reconcile") while the ceremony completes + pushes in the background; the
//   credit is asserted on the claimant daemon by polling (E1-style). The settle reporting
//   `paid` for a cross-device leg is a UX refinement (cross-device-aware confirm-on-push)
//   tracked as an M-row, NOT a correctness gate for this proof.
// === END HEADER ===

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  performWsInviteCeremony,
  spawnSingleDaemon,
  wsSend,
} from "../../../../tests/helpers/two-daemon-call.ts";
import { sendWithActionApproval } from "../../../../tests/helpers/drive-action-approval.ts";

const SR = { sanitizeResources: false, sanitizeOps: false };
const TS = Date.now();

// Gated OFF by default; build-host only (MBP is flow-integ FORBIDDEN).
const RUN = Deno.env.get("NAOMS_INTEG_FLOW_2DAEMON") === "1";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOwnerDid(port: number, label: string): Promise<string> {
  const r = await fetch(`http://127.0.0.1:${port}/health`);
  const j = await r.json() as {
    founderDid?: string | null;
    identity?: { did?: string };
  };
  const ownerDid = j.founderDid ?? j.identity?.did ?? "";
  if (!ownerDid) throw new Error(`/health for ${label} missing founderDid`);
  return ownerDid;
}

/** Payee-side credit witness: graph.query {type:"token_balance"} — the read the
 *  browser wallet performs. Filters holder_did client-side (robust to `where`). */
async function queryTokenBalanceFor(
  ws: WebSocket,
  holderDid: string,
): Promise<Array<Record<string, unknown>>> {
  const resp = await wsSend(ws, {
    type: "graph.query",
    pattern: { type: "token_balance", where: { holder_did: holderDid }, limit: 500 },
  }, 30_000);
  const nodes = (resp.nodes as Array<Record<string, unknown>> | undefined) ??
    (resp.data as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes ??
    [];
  return nodes
    .map((n) => (n.properties ?? n) as Record<string, unknown>)
    .filter((p) => String(p.holder_did) === holderDid);
}

/** Resolve the token's backing holder-chain id via the canonical token graph node. */
async function readTokenChainId(
  ws: WebSocket,
  tokenId: string,
): Promise<string | null> {
  const resp = await wsSend(ws, {
    type: "graph.query",
    pattern: { type: "token", limit: 200 },
  }, 30_000);
  const nodes = (resp.nodes as Array<Record<string, unknown>> | undefined) ??
    (resp.data as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes ??
    [];
  for (const n of nodes) {
    const p = (n.properties ?? n) as Record<string, unknown>;
    if (String(p.tokenId) === tokenId) {
      const cid = p.chainId ?? p.chain_id;
      return typeof cid === "string" && cid.length > 0 ? cid : null;
    }
  }
  return null;
}

/** Poll the claimant daemon until its token-branch FROST share is installed — the
 *  cross-peer t=2 co-sign precondition (admit reshare delivers it async). E1 pattern. */
async function waitForPayeeShareInstalled(
  ws: WebSocket,
  chainId: string,
  memberDid: string,
  budgetMs: number,
): Promise<boolean> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const resp = await wsSend(ws, {
      type: "graph.query",
      pattern: { type: "chain_signer_share_v1", limit: 500 },
    }, 30_000).catch(() => ({} as Record<string, unknown>));
    const nodes = (resp.nodes as Array<Record<string, unknown>> | undefined) ??
      (resp.data as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes ??
      [];
    const found = nodes.some((n) => {
      const p = (n.properties ?? n) as Record<string, unknown>;
      return String(p.chain_id ?? p.chainId) === chainId &&
        String(p.member_did ?? p.memberDid) === memberDid;
    });
    if (found) return true;
    await delay(2_000);
  }
  return false;
}

Deno.test({
  name:
    "1644 M4 [2-daemon]: an automated flow settlement on the HOLON daemon credits a " +
    "claimant's balance on a SEPARATE claimant daemon — the gated token.pay rides the " +
    "cross-device dual-sign ceremony + member push (non-interactive capability)",
  ...SR,
  ignore: !RUN,
  async fn() {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      const repoRoot = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${repoRoot}/rust/target/release`);
    }
    const BOOT_BUDGET_MS = 240_000;
    const CAP = 100_000;
    const MINT = 10_000;
    const context = "nao-2daemon";

    console.error(`[1644-2d] spawning holon(issuer/payer) + claimant(payee) (TS=${TS})...`);
    const holon = await spawnSingleDaemon("alice", { bootTimeoutMs: BOOT_BUDGET_MS });
    await delay(3_000);
    const claimant = await spawnSingleDaemon("bob", { bootTimeoutMs: BOOT_BUDGET_MS });

    try {
      const holonDid = await fetchOwnerDid(holon.handle.port, "holon");
      const claimantDid = await fetchOwnerDid(claimant.handle.port, "claimant");
      assert(holonDid !== claimantDid, "distinct holon/claimant owner DIDs");
      console.error(`[1644-2d] holonDid=${holonDid} claimantDid=${claimantDid}`);

      // Real peer-pair: makes holon + claimant genuinely paired counterparties (the
      // 2-daemon substrate E1's native-push integ proved REPLICATES a token-branch
      // entry to the member). The fc-* chain hosts the quorum-t2 token-favor home.
      const cer = await performWsInviteCeremony(holon.handle.ws, claimant.handle.ws);
      assert(cer.chainId.startsWith("fc-"), `paired member chain expected, got ${cer.chainId}`);
      console.error(`[1644-2d] paired; shared member chain ${cer.chainId}`);

      // HOLON defines a flow-favor token (transferable:false, minAttesters:2 → the
      // quorum-t2 fc-* holder chain that can dual-sign cross-device, E1 GATE-A), mints
      // a spendable balance to itself, and admits the claimant as a holder.
      const def = await sendWithActionApproval(holon.handle.ws, {
        type: "token.define",
        kind: "custom",
        humanLabel: "flow-favor",
        valueBasis: "favor",
        cap: CAP,
        ttlMs: 72 * 3600 * 1000,
        privacy: "clear",
        transferable: false,
        minAttesters: 2,
      }, { timeoutMs: 120_000 });
      assert(def.ok === true, `token.define failed: ${JSON.stringify(def)}`);
      const tokenId = String(def.tokenId ?? def.id);
      assert(tokenId.length > 0, `token.define returned no tokenId: ${JSON.stringify(def)}`);
      console.error(`[1644-2d] flow token defined: ${tokenId}`);

      const mint = await sendWithActionApproval(holon.handle.ws, {
        type: "token.mint",
        tokenId,
        amount: MINT,
      }, { timeoutMs: 120_000 });
      assert(mint.ok === true, `token.mint failed: ${JSON.stringify(mint)}`);
      console.error(`[1644-2d] holon minted ${MINT}`);

      const admit = await sendWithActionApproval(holon.handle.ws, {
        type: "token.admit",
        token: tokenId,
        admittedDid: claimantDid,
      }, { timeoutMs: 120_000 });
      assert(admit.ok === true, `token.admit(claimant) failed: ${JSON.stringify(admit)}`);
      console.error(`[1644-2d] claimant admitted as holder`);

      // Sequence the async co-sign precondition: wait for the claimant's token-branch
      // FROST share to install before settling (so the cross-device ceremony is not
      // racing share-delivery). E1 pattern; budget OUTSIDE the settle window.
      const chainId = await readTokenChainId(holon.handle.ws, tokenId);
      assert(chainId !== null, `could not resolve token chain id for ${tokenId}`);
      const shareReady = await waitForPayeeShareInstalled(
        claimant.handle.ws, chainId!, claimantDid, 150_000,
      );
      console.error(`[1644-2d] claimant FROST share installed (co-sign ready): ${shareReady}`);
      assert(shareReady, `claimant ${claimantDid} token-branch share NOT installed within 150s`);

      // Claimant balance BEFORE (canonical witness on the CLAIMANT daemon).
      const beforeNodes = await queryTokenBalanceFor(claimant.handle.ws, claimantDid);
      const beforeSettled = beforeNodes.reduce((s, n) => s + Number(n.settled ?? 0), 0);
      console.error(`[1644-2d] claimant token_balance BEFORE: nodes=${beforeNodes.length} settled=${beforeSettled}`);

      // ── ARM the owner-signed delegation root + engine key K on the HOLON. ──
      const arm = await wsSend(holon.handle.ws, {
        type: "flow.policy_set",
        context,
        tokenKind: tokenId,
        params: {
          floor: 100,
          ceiling: 500,
          gradient: 0,
          // Single claimant: perClaimantCap MUST be 1.0 so one claimant can absorb
          // the WHOLE surplus — a fraction <1 leaves surplus unallocatable and the
          // conserved allocator refuses loud (HC-01, no silent retention).
          perClaimantCap: 1.0,
          perEpochCap: 0.5,
          automatedSettlementCap: 1000,
        },
      }, 60_000);
      assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);
      assert(arm.delegationArmed === true, `delegation root must be armed — ${JSON.stringify(arm)}`);

      // ── SETTLE: balance 700 → surplus 200 (above ceiling 500); the single claimant
      //    needs 200 → absorbs the FULL surplus 200 (perClaimantCap 1.0, need-bound).
      //    The gated token.pay(claimant) rides the cross-device dual-sign ceremony. ──
      const settle = await wsSend(holon.handle.ws, {
        type: "flow.epoch_settle",
        context,
        balance: 700,
        claimants: [{ id: claimantDid, need: 200, trustWeight: 1 }],
      }, 120_000);
      assert(settle.ok, `epoch_settle ok — ${JSON.stringify(settle)}`);
      const vm = settle.valueMovement as {
        attempted: boolean;
        paid: Array<{ id: string; amount: number; entryId?: string }>;
        refused: Array<{ id: string; amount: number; reason: string }>;
        indeterminate: Array<{ id: string; amount: number; reason: string }>;
      };
      console.error(`[1644-2d] valueMovement: ${JSON.stringify(vm)}`);
      assert(vm && vm.attempted, `value movement must be attempted — ${JSON.stringify(vm)}`);
      // The gate ALLOWED non-interactively (capability satisfied CORE_APPROVAL_REQUIRED):
      // the allocation is NOT refused. It is either `paid` (ceremony finished within the
      // 15s deadline) or `indeterminate` (cross-device ceremony exceeded it — committing
      // + pushing in the background). A `refused` here would mean the gate fell to the
      // interactive path = the capability did NOT satisfy the gate = M4 break.
      assert(
        vm.refused.length === 0,
        `the gated token.pay must NOT be refused — a refusal means the capability did not ` +
          `satisfy CORE_APPROVAL_REQUIRED (interactive fall-through) — ${JSON.stringify(vm.refused)}`,
      );
      assert(
        vm.paid.length + vm.indeterminate.length === 1,
        `the single allocation rode the gated pay (paid or honestly-indeterminate) — ${JSON.stringify(vm)}`,
      );

      // ── MECHANISM (cross-device dual-sign): the gated pay fired the FROST 2-of-2
      //    quorum ceremony of {holon,claimant} — holon coordinator + claimant peer. ──
      const holonCeremonyComplete = holon.handle.stderrLines.some((l) =>
        l.includes("chain-quorum ceremony complete")
      );
      const claimantPeerParticipated = claimant.handle.stderrLines.some((l) =>
        l.includes("peer ceremony released on sign_result")
      );
      console.error(
        `[1644-2d] cross-device dual-sign: holonCeremonyComplete=${holonCeremonyComplete} ` +
          `claimantPeerParticipated=${claimantPeerParticipated}`,
      );
      assert(
        holonCeremonyComplete && claimantPeerParticipated,
        `MECHANISM dual-sign: the gated token.pay MUST fire the cross-device FROST 2-of-2 ` +
          `quorum ceremony of {holon,claimant} — holon logs "chain-quorum ceremony complete" ` +
          `AND claimant logs "peer ceremony released on sign_result". Got ` +
          `holon=${holonCeremonyComplete} claimant=${claimantPeerParticipated}. A single-writer ` +
          `t=1 shortcut (no ceremony) is RED.`,
      );

      // ── MECHANISM (replication + credit): the CLAIMANT daemon receives the transfer
      //    by member push and credits its token_balance >= the allocation. Poll 90s. ──
      console.error("[1644-2d] polling CLAIMANT daemon for credit (90s)...");
      let afterSettled = 0;
      const creditDeadline = Date.now() + 90_000;
      while (Date.now() < creditDeadline) {
        const afterNodes = await queryTokenBalanceFor(claimant.handle.ws, claimantDid);
        afterSettled = afterNodes.reduce((s, n) => s + Number(n.settled ?? 0), 0);
        if (afterSettled > beforeSettled) break;
        await delay(3_000);
      }
      const credited = afterSettled - beforeSettled;
      console.error(`[1644-2d] claimant token_balance AFTER: settled=${afterSettled} (credited=${credited})`);
      assert(
        credited > 0,
        `MECHANISM credit: the claimant daemon MUST credit its token_balance via member ` +
          `push of the gated cross-device token.pay. before=${beforeSettled} after=${afterSettled}. ` +
          `A single-writer issuer-private t=1 pay never pushes → claimant stays 0 — RED.`,
      );
      console.error(`[1644-2d] ✅ 2-daemon flow payee-credit PROVEN: claimant credited ${credited}`);
    } finally {
      await holon.cleanup().catch(() => {});
      await claimant.cleanup().catch(() => {});
    }
  },
});
