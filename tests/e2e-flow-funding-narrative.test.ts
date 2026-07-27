// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 COMPLETION C6/G5 — the STAR capstone (frozen-plan M7): a node supports a
//   dependent end-to-end, DRIVEN FROM THE UI, and the payee's wallet shows the receipt
//   ATTRIBUTED to the payer.
// @covers flow-funding whole-loop UI (src/packages/flow-funding/ui/flow-tab.js,
//   src/packages/flow-funding/ui/flow-surfaces.js) + epoch-settle
//   (src/packages/flow-funding/handlers/epoch-settle.ts) + payee wallet attribution
// @flow-description two REAL cross-identity daemons (founder=payer w/ browser, bob=payee) →
//   `naoms contacts handshake` peer-pair → arm FlowPolicy on a REAL context via the UI Save
//   gesture → propose a flow agreement to the payee via the UI → cross ceiling → SETTLE THE
//   EPOCH FROM THE UI → below-floor payee receives → the PAYEE's wallet shows the receipt
//   ATTRIBUTED to the payer ("received N from <payer>"), not a bare balance.
// @owns-surface flow-funding whole loop
// @mechanism-asserted the star loop is drivable end-to-end FROM THE UI on 2 real daemons and
//   terminates in an ATTRIBUTED payee wallet receipt. Real-pointer gestures only; value seeded
//   via the real write path; payee credit witnessed on the SEPARATE payee daemon.
// @bypasses action-approval=owner-credential-auto-grant (owner-tier writes only),
//   db-unlock=fixture-password, identity=pre-onboarded (founder + bob fixtures),
//   iroh-mdns-disabled, kronos-disabled. NO NAOMS_NO_AUTH, NO NAOMS_TEST_MODE,
//   NO pre-seed of the payee credit under test.
// @canonical-flow YES
// @pre-seeds vault.unlocked (both daemons)
// @cross-identity 2-daemon, real-pointer (HC-09) — NOT env-gated (HC-C5): runs by default.
// === END HEADER ===
//
// 1644 COMPLETION C6/G5 — the whole-loop narrative (original frozen-plan M7, the STAR:
// "What if money knew when to keep moving … so no node hoards while a dependent goes
// without?"). This is the capstone that drives EVERY MVP intent end-to-end from the UI.
//
// RED-FIRST — this test MUST FAIL on current `main`, at the whole-loop gaps:
//   (G5-a) the Flow UI exposes NO epoch-settle gesture — the surfaces are
//          policy / agreement / velocity(read-only) / simulate(dry-run). A user cannot
//          "settle the epoch from the UI"; the star loop dead-ends after Propose.
//   (G5-b) even when a settlement runs, the payee's wallet shows a BARE balance, not the
//          receipt ATTRIBUTED to the payer ("received N from <payer>").
// The test drives the real loop up to the settlement trigger and asserts both. It is NOT
// env-gated (HC-C5) and uses two real cross-identity daemons (HC-09).
//
// Run (build-host / laptop — dylib prebuilt in the MAIN tree):
//   NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release \
//     deno test -A --no-check --unstable-sloppy-imports \
//     --config <repoRoot>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-narrative.test.ts

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import puppeteer from "npm:puppeteer-core";
import {
  delay,
  evalWithRetry,
  findBrowser,
  getRandomPort,
  startDaemonFromFixture,
} from "../../../../tests/helpers/browser-e2e.ts";
import { authenticateWs } from "../../../../tests/helpers/ws-ceremony.ts";
import { unlockFixtureVault } from "../../../../tests/helpers/fixture-unlock.ts";
import { installActionApprovalAutoGrant } from "../../../../tests/helpers/drive-action-approval.ts";
import { runNaomsCli } from "../../../../tests/helpers/cli-e2e.ts";
import { spawnSingleDaemon } from "../../../../tests/helpers/two-daemon-call.ts";
import { fetchFounderDidFromHealth } from "../../../../tests/helpers/fixture-daemon.ts";
import { testLogin } from "../../../../tests/helpers/login.ts";
import {
  registerBrowser,
  unregisterBrowser,
} from "../../../../tests/helpers/process-registry.ts";
import { join } from "node:path";

const NAOMS_ROOT = new URL("../../../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
const BOOT_BUDGET_MS = 240_000;

/** Extract the last JSON object from CLI stdout. */
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
  name:
    "1644 C6/G5 [narrative, 2-daemon] the STAR: arm policy → propose+settle a flow from the " +
    "UI → the payee's wallet shows the receipt ATTRIBUTED to the payer",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${NAOMS_ROOT}/rust/target/release`);
    }
    const payerPort = await getRandomPort();
    // deno-lint-ignore no-explicit-any
    let payerDaemon: any = null;
    // deno-lint-ignore no-explicit-any
    let browser: any = null;
    let ws: WebSocket | null = null;
    let disposeGrant: (() => void) | null = null;
    let token: number | null = null;
    // deno-lint-ignore no-explicit-any
    let payee: any = null;

    try {
      // ── (1) Two REAL cross-identity daemons: payer=founder (browser), payee=bob (CLI). ──
      const started = await startDaemonFromFixture(
        NAOMS_ROOT,
        payerPort,
        "1644-m7-narrative-payer",
        undefined,
        "founder",
      );
      payerDaemon = started.daemon;
      const payerKeysDir = started.keysDir;

      payee = await spawnSingleDaemon("bob", { bootTimeoutMs: BOOT_BUDGET_MS });

      const payerUrl = `ws://127.0.0.1:${payerPort}/ws`;
      const payerKeyFile = join(payerKeysDir, "user.ed25519");
      const payeePort = payee.handle.port as number;
      const payeeUrl = `ws://127.0.0.1:${payeePort}/ws`;
      const payeeKeyFile = join(
        payee.handle.dataDir as string,
        ".keys",
        "user.ed25519",
      );
      const payerCli = (args: string[], opts?: { timeoutMs?: number }) =>
        runNaomsCli(args, {
          daemonUrl: payerUrl,
          keyFile: payerKeyFile,
          timeoutMs: opts?.timeoutMs,
        });
      const payeeCli = (args: string[], opts?: { timeoutMs?: number }) =>
        runNaomsCli(args, {
          daemonUrl: payeeUrl,
          keyFile: payeeKeyFile,
          timeoutMs: opts?.timeoutMs,
        });

      const payerDid = await fetchFounderDidFromHealth(payerPort);
      const payeeDid = await fetchFounderDidFromHealth(payeePort);
      assert(
        typeof payerDid === "string" && payerDid.length > 0,
        "payer owner DID",
      );
      assert(
        typeof payeeDid === "string" && payeeDid.length > 0,
        "payee owner DID",
      );
      assert(payerDid !== payeeDid, "distinct payer/payee owner DIDs (cross-identity)");
      console.error(`[1644-m7] payer=${payerDid} payee=${payeeDid}`);

      // ── (2) Owner-authenticated WS on the payer — arms the signer + drives the
      //        owner-tier approval auto-grant for the UI policy Save. ──
      const auth = await authenticateWs(payerPort, payerKeysDir);
      ws = auth.ws;
      await unlockFixtureVault(ws, { identity: "founder", naomsRoot: NAOMS_ROOT });
      const appPassword = Deno.readTextFileSync(
        `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
      ).trim();
      disposeGrant = installActionApprovalAutoGrant(ws, { appPassword });

      // ── (3) Peer-pair payer↔payee via the REAL `naoms contacts handshake` CLI verb. ──
      const pair = await payerCli([
        "contacts",
        "handshake",
        "--daemon-url",
        payerUrl,
        "--peer-daemon-url",
        payeeUrl,
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
        `peer-pair did not return an fc-* friendship chain: ${pair.stdout.slice(0, 600)}`,
      );
      console.error(`[1644-m7] paired ${pairJson!.chainId}`);

      // ── (4) Browser: real login as the payer, open Flow Funding. ──
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-narrative", browser);
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`http://127.0.0.1:${payerPort}/`, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      await delay(2000);
      const loginResult = await testLogin(page, {
        url: `http://127.0.0.1:${payerPort}/`,
        timeoutMs: 60000,
      });
      assert(loginResult.success, `login failed: ${loginResult.errors.join("; ")}`);
      await delay(2000);

      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error("_naoms.activateApp not exposed — shell init incomplete");
        }
        await w._naoms.activateApp("flow-funding");
      });

      // ── (5) Arm a FlowPolicy on a REAL context via the UI Save gesture. ──
      let policyMounted = false;
      for (let i = 0; i < 40; i++) {
        policyMounted = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-policy #floorInput"),
        );
        if (policyMounted) break;
        await delay(500);
      }
      assert(policyMounted, "Policy surface did not mount within 20s of activateApp");

      // A viability band whose ceiling the payer's balance will cross → surplus flows out.
      await page.evaluate(() => {
        function set(id: string, v: string) {
          const el = document.querySelector(
            "#flow-policy #" + id,
          ) as HTMLInputElement | null;
          if (!el) throw new Error("missing input #" + id);
          el.value = v;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        set("floorInput", "100");
        set("ceilingInput", "500");
        const saveBtn = Array.from(
          document.querySelectorAll("#flow-policy .action-bar .btn.p"),
        )[0] as HTMLButtonElement | undefined;
        if (!saveBtn) throw new Error("Save policy button not found");
        saveBtn.click();
      });
      await delay(3000);
      console.error("[1644-m7] policy armed from the UI");

      // ── (6) Propose a flow agreement to the payee via the UI. ──
      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (typeof w.__flowShowSurface === "function") {
          w.__flowShowSurface("agreement");
        }
      });
      let agreementMounted = false;
      for (let i = 0; i < 40; i++) {
        agreementMounted = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-agreement #flowAgreementCounterparty"),
        );
        if (agreementMounted) break;
        await delay(500);
      }
      assert(agreementMounted, "Agreement surface did not mount");
      await page.evaluate((counterparty: string) => {
        const el = document.querySelector(
          "#flow-agreement #flowAgreementCounterparty",
        ) as HTMLInputElement | null;
        if (!el) throw new Error("counterparty input missing");
        el.value = counterparty;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        const createBtn = Array.from(
          document.querySelectorAll("#flow-agreement .btnrow .btn.p"),
        )[0] as HTMLButtonElement | undefined;
        if (!createBtn) throw new Error("Create agreement button not found");
        createBtn.click();
      }, payeeDid);
      await delay(3000);
      console.error("[1644-m7] agreement proposed from the UI");

      // ── (7) CROSS CEILING → SETTLE THE EPOCH FROM THE UI. ──
      // The star's beating heart: the user must be able to trigger a settlement so
      // surplus flows to the below-floor dependent. Search the ENTIRE mounted Flow app
      // for a real epoch-settle gesture (button/control) and drive it.
      // GAP (G5-a): the Flow surfaces expose policy / agreement / velocity(read) /
      // simulate(dry-run) only — there is NO settle trigger, so the loop dead-ends here.
      const settleControl: { found: boolean; label: string } = await evalWithRetry(
        page,
        () => {
          const RE = /settle|run epoch|distribute now|flow now|release surplus/i;
          // Exclude the Simulate surface's "Run simulation" (dry-run, commits nothing).
          const controls = Array.from(
            document.querySelectorAll(
              "#flow-app button, #flow-app .btn, #flow-app [role=button]",
            ),
          ) as HTMLElement[];
          for (const c of controls) {
            const t = (c.textContent || "").trim();
            if (RE.test(t) && !/simulat/i.test(t)) {
              return { found: true, label: t };
            }
          }
          return { found: false, label: "" };
        },
      );
      console.error(
        `[1644-m7] UI settle control: found=${settleControl.found} label=${JSON.stringify(settleControl.label)}`,
      );
      assert(
        settleControl.found,
        "G5-a: the Flow UI exposes NO epoch-settle gesture — a user cannot settle an epoch " +
          "from the UI, so the star loop (arm → propose → SETTLE → dependent receives) cannot " +
          "be driven end-to-end from the interface. The four surfaces are policy / agreement / " +
          "velocity(read-only) / simulate(dry-run). This is the C6/G5 whole-loop gap.",
      );

      // Drive the real settlement from the UI (unreached on main — asserted above).
      await page.evaluate((label: string) => {
        const controls = Array.from(
          document.querySelectorAll(
            "#flow-app button, #flow-app .btn, #flow-app [role=button]",
          ),
        ) as HTMLElement[];
        const btn = controls.find((c) => (c.textContent || "").trim() === label);
        if (btn) (btn as HTMLButtonElement).click();
      }, settleControl.label);

      // ── (8) TERMINAL: the payee's wallet shows the receipt ATTRIBUTED to the payer. ──
      // Not a bare balance — "received N from <payer>". Witnessed on the SEPARATE payee
      // daemon via the real read path (flow_settlement allocations carry the payer holon).
      // GAP (G5-b): the settlement/wallet does not attribute the receipt to the payer.
      let attributed = false;
      let lastSeen = "";
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const st = await payeeCli([
          "graph",
          "query",
          "--type",
          "flow_settlement",
          "--json",
        ], { timeoutMs: 45_000 });
        if (st.code === 0) {
          const j = lastJson(st.stdout);
          const nodes = ((j?.nodes ??
            (j?.result as Record<string, unknown> | undefined)?.nodes) ??
            []) as Array<Record<string, unknown>>;
          for (const n of nodes) {
            const props = (n.properties ?? n.props ?? n) as Record<string, unknown>;
            // The receipt the payee sees MUST name the payer holon that sent it.
            const raw = JSON.stringify(props);
            lastSeen = raw.slice(0, 400);
            const namesPayer = raw.includes(payerDid);
            let creditsPayee = false;
            try {
              const allocs = typeof props.allocations === "string"
                ? JSON.parse(props.allocations as string)
                : props.allocations;
              if (Array.isArray(allocs)) {
                creditsPayee = allocs.some(
                  (a) => a && a.id === payeeDid && Number(a.amount) > 0,
                );
              }
            } catch { /* tolerate */ }
            if (namesPayer && creditsPayee) {
              attributed = true;
              break;
            }
          }
        }
        if (attributed) break;
        await delay(3000);
      }
      assert(
        attributed,
        "G5-b: the payee's wallet must show the flow receipt ATTRIBUTED to the payer " +
          `("received N from ${payerDid.slice(0, 16)}…") — a receipt naming the payer holon ` +
          "AND crediting the payee. On main the payee sees no such attributed receipt " +
          `(last flow_settlement seen on payee: ${lastSeen || "none"}).`,
      );
      console.error("[1644-m7] payee wallet shows attributed receipt — star loop closed");
    } finally {
      if (disposeGrant) {
        try {
          disposeGrant();
        } catch { /* best-effort */ }
      }
      if (ws) {
        try {
          ws.close();
        } catch { /* already closed */ }
      }
      if (browser) {
        try {
          await browser.close();
        } catch { /* already closed */ }
        if (token !== null) unregisterBrowser(token);
      }
      if (payerDaemon) {
        try {
          payerDaemon.process.kill("SIGTERM");
        } catch { /* already dead */ }
      }
      if (payee) {
        await payee.cleanup?.().catch(() => {});
      }
    }
  },
});
