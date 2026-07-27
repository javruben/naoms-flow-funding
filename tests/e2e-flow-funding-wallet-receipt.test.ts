// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 completion C4/G2 — the payee's wallet ATTRIBUTES a received flow
//   settlement to the payer (the owner's core complaint: today it shows only a
//   bigger bare number, no from/to, memo ignored).
// @gated-by: uc-wallet-receipt-attribution-wired
// @covers src/packages/token/ui/wallet-activity.js:buildRow (drops signerDid, no from/to, ignores flow-settle memo)
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:moveSettlementValue (cross-device token.pay carrying the flow-settle: memo)
// @covers src/packages/token/cli/index.ts (token define/mint/admit/balance — cross-daemon credit witness)
// @covers src/packages/contacts/cli/index.ts (contacts handshake CLI peer-pair)
// @owns-surface wallet-activity (receipt attribution)
// @bypasses db-unlock=fixture-password (spawnSingleDaemon unlocks each vault),
//   identity=pre-onboarded, iroh-mdns-disabled, approval=installActionApprovalAutoGrant
//   (SETUP only — disposed on the payer before the settlement). NO NAOMS_NO_AUTH,
//   NO NAOMS_TEST_MODE, NO pre-seed of the credit-under-test.
// @mechanism-asserted two real daemons → real CLI cross-identity flow settlement
//   (payer credits payee ~200 via the gated cross-device token.pay carrying a
//   flow-settle: memo) → payee wallet Activity feed shows a row ATTRIBUTING the
//   +200 to the PAYER identity (not merely a larger number). A bare balance bump
//   with no from/to attribution is RED.
// @canonical-flow YES — every state mutation goes through the production `naoms`
//   CLI verbs + real handlers; the receipt witness is the payee's real browser
//   wallet UI after a real cross-identity settlement.
// @honesty-rationale Two real fresh-founder daemons (distinct ownerDids), real
//   `naoms contacts handshake`. The settlement rides the M4 capability
//   (payer auto-grant disposed before it). The credit is materialized by real
//   member-push and read via `naoms token balance`, never pre-seeded. The RED is
//   a STRUCTURAL fact of buildRow (renders entryKind label OR a notice banner —
//   never signerDid, amount, or a from/to line), independent of cross-device
//   timing: even when the credit lands and the number grows, no row names the payer.
// @pre-seeds NONE
// === END HEADER ===
//
// 1644 COMPLETION C4/G2 — Wallet receipt attribution E2E (RED-first, 2-daemon,
// NOT env-gated: runs by default, HC-C5).
//
// Run (build-host — MBP is flow-integ-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test -A --no-check --unstable-sloppy-imports --config <repo>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-wallet-receipt.test.ts

import { assert } from "jsr:@std/assert";
import { join } from "node:path";
import puppeteer from "npm:puppeteer-core";
import {
  type DaemonHandle,
  spawnSingleDaemon,
} from "../../../../tests/helpers/two-daemon-call.ts";
import { runNaomsCli } from "../../../../tests/helpers/cli-e2e.ts";
import { fetchFounderDidFromHealth } from "../../../../tests/helpers/fixture-daemon.ts";
import { installActionApprovalAutoGrant } from "../../../../tests/helpers/drive-action-approval.ts";
import { findBrowser } from "../../../../tests/helpers/browser-e2e.ts";
import { testLogin } from "../../../../tests/helpers/login.ts";
import {
  registerBrowser,
  unregisterBrowser,
} from "../../../../tests/helpers/process-registry.ts";

const SR = { sanitizeResources: false, sanitizeOps: false } as const;
const BOOT_BUDGET_MS = 240_000;
const CAP = 100_000;
const MINT = 10_000;
const NEED = 200; // the payee's below-floor need → the allocation attributed to the payer

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
  name:
    "1644 C4/G2 [e2e 2-daemon]: after a real cross-identity flow settlement, the " +
    "payee wallet ATTRIBUTES the +200 to the payer (a bare balance bump with no " +
    "from/to attribution is RED)",
  fn: async () => {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      const repoRoot = new URL("../../../../", import.meta.url).pathname
        .replace(
          /\/$/,
          "",
        );
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${repoRoot}/rust/target/release`);
    }
    console.error(`[1644-receipt] spawning payer(alice) + payee(bob)...`);
    const holon = await spawnSingleDaemon("alice", {
      bootTimeoutMs: BOOT_BUDGET_MS,
    });
    await delay(3_000);
    const claimant = await spawnSingleDaemon("bob", {
      bootTimeoutMs: BOOT_BUDGET_MS,
    });

    let disposeHolon: (() => void) | undefined = installActionApprovalAutoGrant(
      holon.handle.ws,
    );
    const disposeClaimant = installActionApprovalAutoGrant(claimant.handle.ws);

    // deno-lint-ignore no-explicit-any
    let browser: any = null;
    let browserTok: number | null = null;
    try {
      const holonCli = cliFor(holon.handle);
      const claimantCli = cliFor(claimant.handle);
      const holonDid = await fetchFounderDidFromHealth(holon.handle.port);
      const claimantDid = await fetchFounderDidFromHealth(claimant.handle.port);
      assert(
        holonDid && claimantDid && holonDid !== claimantDid,
        "distinct DIDs",
      );
      const holonUrl = `ws://127.0.0.1:${holon.handle.port}/ws`;
      const claimantUrl = `ws://127.0.0.1:${claimant.handle.port}/ws`;
      const context = "nao-receipt";
      console.error(`[1644-receipt] payer=${holonDid} payee=${claimantDid}`);

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

      // ── (2) payer defines a quorum-t2 flow-favor token, mints, admits payee. ──
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
        mint.code === 0 && lastJson(mint.stdout)?.ok === true,
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
        admit.code === 0 && lastJson(admit.stdout)?.ok === true,
        `token admit not ok: ${admit.stdout.slice(0, 600)}`,
      );

      // ── (3) Poll payee `naoms token balance` until the token chain replicated. ──
      console.error(`[1644-receipt] polling payee token replication (150s)...`);
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
      assert(replicated, `payee never replicated the token within 150s`);

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
      >) ??
        [];
      const beforeCredit = beforeBals.reduce(
        (s, b) => s + Number(b.final ?? 0) + Number(b.pending ?? 0),
        0,
      );

      // ── DISPOSE payer auto-grant — the SETTLEMENT pay must ride the capability. ──
      if (disposeHolon) {
        disposeHolon();
        disposeHolon = undefined;
      }

      // ── (4) payer arms the delegation root + K. ──
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
        arm.code === 0 && lastJson(arm.stdout)?.ok === true,
        `policy-set not ok: ${arm.stdout.slice(0, 600)}`,
      );

      // ── (5) payer settles (balance 700 → surplus 200; payee need 200). ──
      const settle = await holonCli([
        "flow-funding",
        "epoch-settle",
        "--context",
        context,
        "--balance",
        "700",
        "--claimants",
        JSON.stringify([{ id: claimantDid, need: NEED, trustWeight: 1 }]),
        "--daemon-url",
        holonUrl,
        "--json",
      ], { timeoutMs: 120_000 });
      assert(
        settle.code === 0 && lastJson(settle.stdout)?.ok === true,
        `epoch-settle not ok: ${settle.stdout.slice(0, 600)}`,
      );
      console.error(
        `[1644-receipt] settle valueMovement: ${
          JSON.stringify(lastJson(settle.stdout)?.valueMovement)
        }`,
      );

      // ── (6) Poll payee for the credit landing (real member push). ──
      console.error(`[1644-receipt] polling payee for credit (120s)...`);
      let afterCredit = beforeCredit;
      const creditDeadline = Date.now() + 120_000;
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
        >) ??
          [];
        afterCredit = bals.reduce(
          (s, b) => s + Number(b.final ?? 0) + Number(b.pending ?? 0),
          0,
        );
        if (afterCredit > beforeCredit) break;
        await delay(3_000);
      }
      const credited = afterCredit - beforeCredit;
      console.error(
        `[1644-receipt] payee credit before=${beforeCredit} after=${afterCredit} credited=${credited}`,
      );
      assert(
        credited > 0,
        `PRECONDITION: payee must be credited by the real cross-device settlement ` +
          `before the wallet-attribution claim can be judged. before=${beforeCredit} ` +
          `after=${afterCredit}. (A single-writer t=1 pay never pushes → payee stays 0.)`,
      );

      // ── (7) PAYEE BROWSER: real login, open wallet, open Activity feed. ──
      console.error(`[1644-receipt] launching payee browser + real login...`);
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
      browserTok = registerBrowser(
        "e2e:e2e-flow-funding-wallet-receipt",
        browser,
      );
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      const url = `http://127.0.0.1:${claimant.handle.port}/`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await delay(2000);
      const loginResult = await testLogin(page, {
        url,
        fixtureIdentity: "invitee-b",
        timeoutMs: 90_000,
        retries: 3,
      });
      assert(
        loginResult.success,
        `payee login failed: screen=${loginResult.screen} errors=${
          JSON.stringify(loginResult.errors)
        }`,
      );
      await delay(2000);

      // Open the wallet (registered under manifest id "token").
      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error("_naoms.activateApp not exposed");
        }
        await w._naoms.activateApp("token");
      });
      // Wait for the wallet root + let holdings load.
      let walletUp = false;
      for (let i = 0; i < 60; i++) {
        walletUp = await page.evaluate(
          () => !!document.querySelector('[data-feature="wallet"]'),
        );
        if (walletUp) break;
        await delay(500);
      }
      assert(walletUp, "payee wallet did not mount");
      await delay(3000);

      // The owner's complaint: the credit shows only as a BIGGER BARE NUMBER.
      // Confirm the number IS visible (so the RED is about attribution, not a
      // missing credit) — read the wallet total / any card amount.
      const numberVisible = await page.evaluate((amt: number) => {
        const texts: string[] = [];
        const bal = document.querySelector("[data-wallet-balance] .amt");
        if (bal) texts.push(bal.textContent || "");
        for (
          const c of Array.from(
            document.querySelectorAll(".wallet-card__amount"),
          )
        ) {
          texts.push(c.textContent || "");
        }
        const joined = texts.join(" ").replace(/[^0-9]/g, " ");
        return { shows: joined.includes(String(amt)), texts };
      }, credited);
      console.error(
        `[1644-receipt] payee wallet numbers: ${
          JSON.stringify(numberVisible.texts)
        }`,
      );

      // Open the Activity feed via the registered feature's imperative nav
      // surface (documented non-window.__ path; wallet-tab.js openActivity).
      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        const feat = w._naomsFeatures && w._naomsFeatures.token;
        if (!feat || typeof feat.openActivity !== "function") {
          throw new Error("wallet openActivity nav surface not exposed");
        }
        await feat.openActivity();
      });
      let feedUp = false;
      for (let i = 0; i < 40; i++) {
        feedUp = await page.evaluate(
          () => !!document.querySelector("[data-wallet-activity]"),
        );
        if (feedUp) break;
        await delay(500);
      }
      assert(feedUp, "payee Activity feed did not mount");
      await delay(2000);

      // Capture the whole feed for diagnostics + attribution search.
      const feed = await page.evaluate(() => {
        const root = document.querySelector("[data-wallet-activity]");
        const rows = Array.from(
          document.querySelectorAll(".wallet-activity__row"),
        ).map((r) => (r.textContent || "").trim());
        return { text: (root?.textContent || "").trim(), rows };
      });
      console.error(
        `[1644-receipt] payee Activity feed rows: ${JSON.stringify(feed.rows)}`,
      );

      // Attribution witness: does ANY row name the PAYER identity together with a
      // received-value signal? A short-DID of the payer or a "from/received from"
      // line beside the amount. buildRow renders neither signerDid nor amount —
      // so this is absent on main.
      const payerShort = holonDid.replace(/^did:[a-z]+:/, "").slice(0, 12);
      const feedHay = feed.text.toLowerCase();
      const attributesToPayer =
        // full or short payer DID present anywhere in the feed
        feedHay.includes(holonDid.toLowerCase()) ||
        (payerShort.length >= 6 &&
          feedHay.includes(payerShort.toLowerCase())) ||
        // a from/received-from line carrying the amount
        (/(from|received from)/.test(feedHay) &&
          feed.text.replace(/[^0-9]/g, " ").includes(String(credited)));

      assert(
        attributesToPayer,
        "1644 C4/G2 RED: after a real cross-identity settlement crediting the payee " +
          `+${credited}, the payee wallet Activity feed does NOT attribute it to the ` +
          `payer (${holonDid}). The credit is visible as a number ` +
          `(shows=${numberVisible.shows}) but no row names who it came from — ` +
          `wallet-activity.js buildRow drops signerDid, renders no amount and no ` +
          `from/to line, and ignores the flow-settle: memo. Feed rows seen: ` +
          `${JSON.stringify(feed.rows)}.`,
      );
    } finally {
      if (disposeHolon) disposeHolon();
      disposeClaimant();
      if (browser) {
        try {
          await browser.close();
        } catch { /* already closed */ }
        if (browserTok !== null) unregisterBrowser(browserTok);
      }
      await holon.cleanup?.().catch(() => {});
      await claimant.cleanup?.().catch(() => {});
    }
  },
});
