// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent M6 Simulation surface real-render
// @gated-by: uc-flow-simulation-surface-wired
// @covers flow-funding Simulation surface (src/packages/flow-funding/ui/flow-tab.js)
// @flow-description real-onboarded-founder → open-Flow-Funding → switch-to-Simulate → Run → assert the rendered report equals an INDEPENDENT flow.simulate over the same synthetic network (real engine, not the mock's fabricated results)
// @owns-surface flow-simulate
// @bypasses db-unlock=fixture-password, identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled, auth=skip-browser-flow, biometric=disabled, cross-browser-identity=puppeteer-fresh-context, device-pair=pre-onboarded-fixture, keychain=fixture-mnemonic-file, keychain=fixture-shares-file, llm-mocked, mls-real-ffi-forced, vault-unlock=fixture-mnemonic-file
// @honesty-rationale flow.simulate is a DRY-RUN over synthetic state (design §6.5)
//   — it commits nothing, so there is no chain witness by design. The honest
//   witness ties the browser render to an INDEPENDENT real-op result: the test
//   drives the SAME flow.simulate over the owner WS (the same illustrative 3-holon
//   network the surface builds) and asserts the browser-rendered report carries
//   that real totalFlowed + the engine's per-holon rows (you/peer-a/peer-b) — NOT
//   the mock's fabricated "$4,280 / synthetic months / cascade" panel. The UI
//   render equalling an independent real-engine result is the terminal effect for
//   a dry-run surface; it cannot pass on the mock's synthetic text.
// @mechanism-asserted Run → flow.simulate over the real engine; UI render == independent WS flow.simulate totalFlowed + per-holon rows
// @canonical-flow YES
// @pre-seeds vault.unlocked
// === END HEADER ===
//
// 1644 M6 — Simulation surface E2E. Same harness as e2e-flow-funding-policy.
//
// Run (build-host — MBP is flow-e2e-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test --allow-all --no-check --unstable-ffi --unstable-worker-options \
//     src/packages/flow-funding/tests/e2e-flow-funding-simulation.test.ts

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import puppeteer from "npm:puppeteer-core";
import {
  delay,
  evalWithRetry,
  findBrowser,
  getRandomPort,
  startDaemonFromFixture,
} from "../../../../tests/helpers/browser-e2e.ts";
import {
  authenticateWs,
  wsSend,
} from "../../../../tests/helpers/ws-ceremony.ts";
import { unlockFixtureVault } from "../../../../tests/helpers/fixture-unlock.ts";
import { testLogin } from "../../../../tests/helpers/login.ts";
import {
  registerBrowser,
  unregisterBrowser,
} from "../../../../tests/helpers/process-registry.ts";

const NAOMS_ROOT = new URL("../../../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);

// The illustrative network the wired surface builds for scenario "steady"
// (buildSimHolons in flow-tab.js — self gradient defaults to 0.5 with no prior
// Policy interaction). Mirrored here to drive the INDEPENDENT witness op.
const HOLONS = [
  {
    id: "you",
    balance: 12000,
    floor: 7000,
    ceiling: 10000,
    gradient: 0.5,
    channels: [
      { to: "peer-a", trustWeight: 1 },
      { to: "peer-b", trustWeight: 0.6 },
    ],
  },
  { id: "peer-a", balance: 2000, floor: 5000, ceiling: 8000 },
  { id: "peer-b", balance: 1000, floor: 4000, ceiling: 7000 },
];

Deno.test({
  name:
    "1644 M6: the Simulation surface renders the REAL engine report (== independent flow.simulate, not the mock's fabricated results)",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const port = await getRandomPort();
    // deno-lint-ignore no-explicit-any
    let daemon: any = null;
    // deno-lint-ignore no-explicit-any
    let browser: any = null;
    let ws: WebSocket | null = null;
    let token: number | null = null;
    try {
      const started = await startDaemonFromFixture(
        NAOMS_ROOT,
        port,
        "1644-m6-simulation",
        undefined,
        "founder",
      );
      daemon = started.daemon;

      const auth = await authenticateWs(port, started.keysDir);
      ws = auth.ws;
      await unlockFixtureVault(ws, {
        identity: "founder",
        naomsRoot: NAOMS_ROOT,
      });

      // ── Independent witness: the REAL engine result for the same network.
      const witness = await wsSend(ws, {
        type: "flow.simulate",
        holons: HOLONS,
        epochs: 3,
      });
      assert(
        witness.ok === true,
        `witness flow.simulate failed: ${JSON.stringify(witness)}`,
      );
      assert(
        witness.committed === false,
        "flow.simulate must commit nothing (dry-run)",
      );
      const report = witness.report as {
        epochs: number;
        totalFlowed: number;
        perHolon: Array<{ id: string }>;
      };
      // The UI renders fmtNum(totalFlowed) = toLocaleString (maxFrac 2). Compare
      // digit-stripped so locale separators don't matter.
      const expectedTotal = report.totalFlowed.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
      const expectedTotalDigits = expectedTotal.replace(/[^0-9]/g, "");
      // a sanity floor: a 12000-balance holon above a 10000 ceiling MUST flow > 0
      assert(
        report.totalFlowed > 0,
        "engine should flow surplus for this network",
      );

      // ── Browser: real login, open Flow Funding, switch to Simulate, Run.
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-simulation", browser);
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      await delay(2000);
      const loginResult = await testLogin(page, {
        url: `http://127.0.0.1:${port}/`,
        timeoutMs: 60000,
      });
      assert(
        loginResult.success,
        `login failed: ${loginResult.errors.join("; ")}`,
      );
      await delay(2000);

      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        await w._naoms.activateApp("flow-funding");
      });
      let navReady = false;
      for (let i = 0; i < 40; i++) {
        navReady = await evalWithRetry(
          page,
          () =>
            typeof (window as { __flowShowSurface?: unknown })
              .__flowShowSurface === "function",
        );
        if (navReady) break;
        await delay(500);
      }
      assert(navReady, "wired flow shell did not initialise");
      await page.evaluate(() => {
        (window as unknown as { __flowShowSurface: (n: string) => void })
          .__flowShowSurface("simulate");
      });
      // pin the scenario to "steady" (deterministic network) then Run.
      let ran = false;
      for (let i = 0; i < 40; i++) {
        ran = await evalWithRetry(page, () => {
          const sel = document.querySelector(
            "#flow-simulate #simScenario",
          ) as HTMLSelectElement | null;
          if (!sel) return false;
          sel.value = "steady";
          const w = window as { runSimulation?: () => void };
          if (typeof w.runSimulation !== "function") return false;
          w.runSimulation();
          return true;
        });
        if (ran) break;
        await delay(500);
      }
      assert(
        ran,
        "Simulation surface did not mount / runSimulation unavailable",
      );

      // ── Assert: the rendered report == the independent real engine result.
      let text = "";
      for (let i = 0; i < 40; i++) {
        text = await evalWithRetry(page, () => {
          const rs = document.querySelector("#flow-simulate #resultsState");
          return rs && !rs.classList.contains("hidden")
            ? (rs.textContent ?? "")
            : "";
        });
        if (text && text.indexOf("you") !== -1) break;
        await delay(500);
      }
      const digits = text.replace(/[^0-9]/g, "");
      assert(text.length > 0, "results panel rendered");
      assert(
        text.indexOf("you") !== -1 && text.indexOf("peer-a") !== -1,
        `engine per-holon rows rendered (got: ${text.slice(0, 220)})`,
      );
      // totalFlowed (×100, integer) must appear in the rendered digits — ties the
      // UI to the independent real-op result, not the mock's $4,280.
      assert(
        digits.indexOf(expectedTotalDigits) !== -1,
        `UI total flowed must equal the independent engine totalFlowed ${report.totalFlowed} (got: ${
          text.slice(0, 220)
        })`,
      );
      // the mock's fabricated headline figure must NOT be present.
      assert(
        text.indexOf("4,280") === -1,
        "the mock's synthetic $4,280 result must be gone (real engine, not mock)",
      );
    } finally {
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
      if (daemon) {
        try {
          daemon.process.kill("SIGTERM");
        } catch { /* already dead */ }
      }
    }
  },
});
