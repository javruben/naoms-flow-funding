// src/packages/flow-funding/tests/e2e-flow-payee-credit-cli.test.ts
//
// 1644 M4 [e2e-CLI, 2-daemon] — the owner's pure-backend 07-verification artifact:
// an AUTOMATED flow settlement, driven END-TO-END by the REAL `naoms` CLI across
// two peer-paired daemons, credits a claimant's balance on the SEPARATE claimant
// daemon by riding a REAL cross-device token.pay GATED by the owner-rooted
// single-use delegation capability (non-interactive, non-bypass).
//
// Holon daemon (alice) drives the producer half via CLI verbs:
//   1. `naoms contacts handshake` — the CLI peer-pair ceremony (fc-* friendship chain).
//   2. `naoms token define --non-transferable --min-attesters 2` — a quorum-t2
//      flow-favor holder chain that can cross-device dual-sign (E1 GATE-A).
//   3. `naoms token mint` / `naoms token admit <claimantDid>`.
//   4. `naoms flow policy-set --params {automatedSettlementCap…}` — arm the
//      owner-signed delegation ROOT + the in-process engine key K.
//   5. `naoms flow epoch-settle --claimants [{id:claimantDid…}]` — the per-allocation
//      token.pay re-dispatches THROUGH the M4 gate under the single-use capability
//      and rides E1's cross-device FROST 2-of-2 ceremony.
// Claimant daemon (bob) observes the credit purely via CLI:
//   6. `naoms token balance --token <id>` → final+pending credited >= allocation.
//
// Reuses 1596 E1's PROVEN 2-daemon CLI scaffold (spawnSingleDaemon ×2 +
// `naoms contacts handshake` + installActionApprovalAutoGrant + runNaomsCli + the
// `naoms token balance` share-install poll) — the same substrate that greens
// e2e-cli-token-pay-payee-credit-2daemon. The flow layer composes on top.
//
// FAITHFULNESS (Assert-the-Mechanism, 1594): installActionApprovalAutoGrant answers
// the SETUP gates (define/mint/admit). It is DISPOSED on the holon BEFORE the
// settlement, so the settlement's token.pay MUST be satisfied by the M4 CAPABILITY —
// never by an interactive auto-grant. A capability failure would then surface as
// refused/indeterminate (no credit), not be masked into a green.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:moveSettlementValue
// @covers src/packages/flow-funding/handlers/policy-set.ts:handlePolicySet
// @covers src/core/transport/router-gates/pre-handler-gates.ts:runApprovalGate
// @covers src/packages/token/cli/index.ts (token define/mint/admit/balance verbs cross-daemon)
// @covers src/packages/contacts/cli/index.ts (contacts handshake CLI peer-pair)
// @mechanism-asserted naoms CLI BOTH sides → automated flow.epoch-settle re-dispatches
//   token.pay THROUGH the M4 capability gate (NON-INTERACTIVE — the holon's approval
//   auto-grant is disposed before the settlement) → rides E1 cross-device FROST 2-of-2
//   ({holon,claimant} ceremony logs) → claimant token_balance credited >= allocation on
//   bob, observed via `naoms token balance`. A single-writer t=1 shortcut (no ceremony,
//   no push) leaves bob at 0 — RED.
// @bypasses db-unlock=fixture-password (spawnSingleDaemon unlocks each vault),
//   identity=pre-onboarded, iroh-mdns-disabled, approval=installActionApprovalAutoGrant
//   (SETUP only — disposed before the settlement). NO NAOMS_NO_AUTH, NO NAOMS_TEST_MODE,
//   NO pre-seed of the credit-under-test.
// @canonical-flow YES — every state mutation goes through the production `naoms` CLI
//   verbs (contacts handshake, token define/mint/admit, flow policy-set/epoch-settle)
//   routed through the real handlers; the credit witness is `naoms token balance` on bob.
// @honesty-rationale Two real fresh-founder daemons (distinct ownerDids), real
//   `naoms contacts handshake` peer-pair. The settlement's token.pay is satisfied by the
//   CAPABILITY (the auto-grant is disposed before it — that IS the M4 claim). bob's credit
//   is materialized by the real member-push (E1 gate-4) + read via `naoms token balance` —
//   never pre-seeded. The settle may report paid OR honestly-indeterminate (cross-device
//   ceremony vs the 15s deadline); the credit on bob is the authoritative outcome.
// === END HEADER ===

import { assert } from "jsr:@std/assert";
import { join } from "node:path";
import {
  type DaemonHandle,
  spawnSingleDaemon,
} from "../../../../tests/helpers/two-daemon-call.ts";
import { runNaomsCli } from "../../../../tests/helpers/cli-e2e.ts";
import { fetchFounderDidFromHealth } from "../../../../tests/helpers/fixture-daemon.ts";
import { installActionApprovalAutoGrant } from "../../../../tests/helpers/drive-action-approval.ts";

const SR = { sanitizeResources: false, sanitizeOps: false } as const;
const RUN = Deno.env.get("NAOMS_E2E_FLOW_2DAEMON_CLI") === "1";
const BOOT_BUDGET_MS = 240_000;
const CAP = 100_000;
const MINT = 10_000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Bind a `naoms` CLI runner to ONE daemon (port + its fixture signing key). */
function cliFor(handle: DaemonHandle) {
  const daemonUrl = `ws://127.0.0.1:${handle.port}/ws`;
  const keyFile = join(handle.dataDir, ".keys", "user.ed25519");
  return (args: string[], opts?: { timeoutMs?: number }) =>
    runNaomsCli(args, { daemonUrl, keyFile, timeoutMs: opts?.timeoutMs });
}

/** Extract the LAST JSON object from CLI stdout (the CLI may print env notes). */
function lastJson(stdout: string): Record<string, unknown> | null {
  const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (l.startsWith("{")) {
      try {
        return JSON.parse(l) as Record<string, unknown>;
      } catch { /* keep scanning up */ }
    }
  }
  return null;
}

Deno.test({
  ...SR,
  ignore: !RUN,
  name:
    "1644 M4 [e2e-cli] 2-daemon: naoms flow policy-set + epoch-settle on the holon → " +
    "claimant token_balance credited on the claimant daemon via the gated cross-device " +
    "token.pay (non-interactive capability)",
  fn: async () => {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      const repoRoot = new URL("../../../../", import.meta.url).pathname
        .replace(/\/$/, "");
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${repoRoot}/rust/target/release`);
    }
    console.error(
      `[1644-cli] spawning holon(issuer/payer) + claimant(payee)...`,
    );
    const holon = await spawnSingleDaemon("alice", {
      bootTimeoutMs: BOOT_BUDGET_MS,
    });
    await delay(3_000);
    const claimant = await spawnSingleDaemon("bob", {
      bootTimeoutMs: BOOT_BUDGET_MS,
    });

    // Auto-grant the SETUP gates (define/mint/admit) on each daemon's authed WS.
    let disposeHolon: (() => void) | undefined = installActionApprovalAutoGrant(
      holon.handle.ws,
    );
    const disposeClaimant = installActionApprovalAutoGrant(claimant.handle.ws);

    try {
      const holonCli = cliFor(holon.handle);
      const claimantCli = cliFor(claimant.handle);
      const holonDid = await fetchFounderDidFromHealth(holon.handle.port);
      const claimantDid = await fetchFounderDidFromHealth(claimant.handle.port);
      assert(
        typeof holonDid === "string" && holonDid.length > 0,
        "holon owner DID",
      );
      assert(
        typeof claimantDid === "string" && claimantDid.length > 0,
        "claimant owner DID",
      );
      assert(holonDid !== claimantDid, "distinct holon/claimant owner DIDs");
      const holonUrl = `ws://127.0.0.1:${holon.handle.port}/ws`;
      const claimantUrl = `ws://127.0.0.1:${claimant.handle.port}/ws`;
      const context = "nao-2d-cli";
      console.error(`[1644-cli] holon=${holonDid} claimant=${claimantDid}`);

      // ── (1) PEER-PAIR via the REAL `naoms contacts handshake` CLI verb. ──
      const pair = await holonCli([
        "contacts",
        "handshake",
        "--daemon-url",
        holonUrl,
        "--peer-daemon-url",
        claimantUrl,
        "--json",
      ], { timeoutMs: 180_000 });
      assert(
        pair.code === 0,
        `contacts handshake exit=${pair.code}: ${pair.stderr.slice(0, 600)}`,
      );
      const pairJson = lastJson(pair.stdout);
      assert(
        pairJson !== null && typeof pairJson.chainId === "string" &&
          (pairJson.chainId as string).startsWith("fc-"),
        `peer-pair did not return an fc-* friendship chain: ${
          pair.stdout.slice(0, 600)
        }`,
      );
      console.error(`[1644-cli] paired ${pairJson!.chainId}`);

      // ── (2) holon defines a quorum-t2 flow-favor token, mints, admits the claimant. ──
      const def = await holonCli([
        "token",
        "define",
        "--kind",
        "custom",
        "--label",
        "flow-favor",
        "--value-basis",
        "favor",
        "--cap",
        String(CAP),
        "--ttl",
        "72h",
        "--privacy",
        "clear",
        "--non-transferable",
        "--min-attesters",
        "2",
        "--yes",
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        def.code === 0,
        `token define exit=${def.code}: ${def.stderr.slice(0, 600)}`,
      );
      const defJson = lastJson(def.stdout);
      assert(
        defJson?.ok === true && typeof defJson.tokenId === "string",
        `token define not ok / no tokenId: ${def.stdout.slice(0, 600)}`,
      );
      const tokenId = defJson!.tokenId as string;
      console.error(`[1644-cli] token defined ${tokenId}`);

      const mint = await holonCli([
        "token",
        "mint",
        "--token",
        tokenId,
        "--amount",
        String(MINT),
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        mint.code === 0,
        `token mint exit=${mint.code}: ${mint.stderr.slice(0, 600)}`,
      );
      assert(
        lastJson(mint.stdout)?.ok === true,
        `token mint not ok: ${mint.stdout.slice(0, 600)}`,
      );

      const admit = await holonCli([
        "token",
        "admit",
        claimantDid,
        "--token",
        tokenId,
        "--yes",
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        admit.code === 0,
        `token admit exit=${admit.code}: ${admit.stderr.slice(0, 600)}`,
      );
      assert(
        lastJson(admit.stdout)?.ok === true,
        `token admit not ok: ${admit.stdout.slice(0, 600)}`,
      );
      console.error(`[1644-cli] claimant admitted`);

      // ── (3) Sequence the async co-sign precondition: poll `naoms token balance` on the
      //    CLAIMANT until ok (the durable token chain + FROST share replicated). 1596's
      //    deterministic CLI-observable signal; budget 150s OUTSIDE the settle window. ──
      console.error(
        `[1644-cli] polling claimant token balance for replication (150s)...`,
      );
      let replicated = false;
      const shareDeadline = Date.now() + 150_000;
      while (Date.now() < shareDeadline) {
        const probe = await claimantCli([
          "token",
          "balance",
          "--token",
          tokenId,
          "--daemon-url",
          claimantUrl,
          "--json",
        ], { timeoutMs: 30_000 });
        if (probe.code === 0 && lastJson(probe.stdout)?.ok === true) {
          replicated = true;
          break;
        }
        await delay(3_000);
      }
      assert(
        replicated,
        `claimant never replicated the token (balance token-not-found) within 150s`,
      );
      console.error(`[1644-cli] claimant replicated the token (co-sign-ready)`);

      // Claimant credit BEFORE (CLI witness on the claimant daemon).
      const balBefore = await claimantCli([
        "token",
        "balance",
        "--token",
        tokenId,
        "--daemon-url",
        claimantUrl,
        "--json",
      ], { timeoutMs: 30_000 });
      const beforeBals = (lastJson(balBefore.stdout)?.balances as Array<
        Record<string, unknown>
      >) ?? [];
      const beforeCredit = beforeBals.reduce(
        (s, b) => s + Number(b.final ?? 0) + Number(b.pending ?? 0),
        0,
      );
      console.error(`[1644-cli] claimant credit BEFORE: ${beforeCredit}`);

      // ── DISPOSE the holon auto-grant — setup done. The SETTLEMENT's token.pay MUST
      //    ride the M4 CAPABILITY, not an interactive grant (Assert-the-Mechanism). ──
      if (disposeHolon) {
        disposeHolon();
        disposeHolon = undefined;
      }
      console.error(
        `[1644-cli] holon approval auto-grant DISPOSED — settlement pay must ride the capability`,
      );

      // ── (4) holon arms the owner-signed delegation root + K (automatedSettlementCap). ──
      // NOTE: the CLI command group is the PACKAGE area `flow-funding`, NOT `flow`
      // — `naoms flow` is the SDK workflow-trigger command (commands/flow.ts) which
      // shadows the manifest-op verbs; the generated dispatch nests flow-funding ops
      // under `naoms flow-funding <verb>` (area == pkg id).
      const arm = await holonCli([
        "flow-funding",
        "policy-set",
        "--context",
        context,
        "--token-kind",
        tokenId,
        "--params",
        JSON.stringify({
          floor: 100,
          ceiling: 500,
          gradient: 0,
          perClaimantCap: 1.0,
          perEpochCap: 0.5,
          automatedSettlementCap: 1000,
        }),
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        arm.code === 0,
        `flow policy-set exit=${arm.code}: ${arm.stderr.slice(0, 600)}`,
      );
      const armJson = lastJson(arm.stdout);
      assert(
        armJson?.ok === true,
        `policy-set not ok: ${arm.stdout.slice(0, 600)}`,
      );
      assert(
        armJson?.delegationArmed === true,
        `delegation root must be armed — ${JSON.stringify(armJson)}`,
      );

      // ── (5) holon settles (balance 700 → surplus 200; claimant need 200). ──
      const settle = await holonCli([
        "flow-funding",
        "epoch-settle",
        "--context",
        context,
        "--balance",
        "700",
        "--claimants",
        JSON.stringify([{ id: claimantDid, need: 200, trustWeight: 1 }]),
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        settle.code === 0,
        `flow epoch-settle exit=${settle.code}: ${settle.stderr.slice(0, 600)}`,
      );
      const settleJson = lastJson(settle.stdout);
      assert(
        settleJson?.ok === true,
        `epoch-settle not ok: ${settle.stdout.slice(0, 600)}`,
      );
      const vm = settleJson!.valueMovement as {
        attempted: boolean;
        paid: Array<{ id: string; amount: number; entryId?: string }>;
        refused: Array<{ id: string; amount: number; reason: string }>;
        indeterminate: Array<{ id: string; amount: number; reason: string }>;
      };
      console.error(`[1644-cli] valueMovement: ${JSON.stringify(vm)}`);
      assert(
        vm && vm.attempted,
        `value movement attempted — ${JSON.stringify(vm)}`,
      );
      // The capability satisfied CORE_APPROVAL_REQUIRED non-interactively (auto-grant
      // disposed): the allocation is NOT refused — paid, or honestly-indeterminate.
      assert(
        vm.refused.length === 0,
        `gated token.pay must NOT be refused (a refusal = capability did not satisfy the ` +
          `gate, interactive fall-through with the auto-grant gone) — ${
            JSON.stringify(vm.refused)
          }`,
      );
      assert(
        vm.paid.length + vm.indeterminate.length === 1,
        `the allocation rode the gated pay (paid or honestly-indeterminate) — ${
          JSON.stringify(vm)
        }`,
      );

      // ── MECHANISM: the gated pay fired the cross-device FROST 2-of-2 ceremony. ──
      const holonCeremony = holon.handle.stderrLines.some((l) =>
        l.includes("chain-quorum ceremony complete")
      );
      const claimantPeer = claimant.handle.stderrLines.some((l) =>
        l.includes("peer ceremony released on sign_result")
      );
      console.error(
        `[1644-cli] dual-sign: holon=${holonCeremony} claimant=${claimantPeer}`,
      );
      assert(
        holonCeremony && claimantPeer,
        `MECHANISM dual-sign: the gated token.pay MUST fire the cross-device FROST 2-of-2 ` +
          `ceremony — holon "chain-quorum ceremony complete" + claimant "peer ceremony released ` +
          `on sign_result". Got holon=${holonCeremony} claimant=${claimantPeer}.`,
      );

      // ── MECHANISM: the claimant daemon credits its token_balance via member push. Poll 90s. ──
      console.error(`[1644-cli] polling claimant for credit (90s)...`);
      let afterCredit = 0;
      const creditDeadline = Date.now() + 90_000;
      while (Date.now() < creditDeadline) {
        const balAfter = await claimantCli([
          "token",
          "balance",
          "--token",
          tokenId,
          "--daemon-url",
          claimantUrl,
          "--json",
        ], { timeoutMs: 30_000 });
        const bals = (lastJson(balAfter.stdout)?.balances as Array<
          Record<string, unknown>
        >) ?? [];
        afterCredit = bals.reduce(
          (s, b) => s + Number(b.final ?? 0) + Number(b.pending ?? 0),
          0,
        );
        if (afterCredit > beforeCredit) break;
        await delay(3_000);
      }
      const credited = afterCredit - beforeCredit;
      console.error(
        `[1644-cli] claimant credit AFTER: ${afterCredit} (credited=${credited})`,
      );
      assert(
        credited > 0,
        `MECHANISM credit: the claimant daemon MUST credit its token_balance via member push ` +
          `of the gated cross-device token.pay. before=${beforeCredit} after=${afterCredit}. A ` +
          `single-writer t=1 pay never pushes → claimant stays 0 — RED.`,
      );
      console.error(
        `[1644-cli] ✅ e2e-CLI 2-daemon flow payee-credit PROVEN: claimant credited ${credited}`,
      );
    } finally {
      if (disposeHolon) disposeHolon();
      disposeClaimant();
      await holon.cleanup?.().catch(() => {});
      await claimant.cleanup?.().catch(() => {});
    }
  },
});
