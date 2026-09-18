// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent M6 Agreement surface real-gesture (wiring proof)
// @gated-by: uc-flow-agreement-surface-wired
// @covers flow-funding Agreement surface (src/packages/flow-funding/ui/flow-tab.js)
// @flow-description real-onboarded-founder (solo) → open-Flow-Funding → switch-to-Agreement → fill counterparty + Create → assert the daemon-originated LOUD refusal surfaces and NO flow_agreement node is created
// @owns-surface flow-agreement
// @bypasses db-unlock=fixture-password, identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled, auth=skip-browser-flow, biometric=disabled, cross-browser-identity=puppeteer-fresh-context, device-pair=pre-onboarded-fixture, keychain=fixture-mnemonic-file, keychain=fixture-shares-file, llm-mocked, mls-real-ffi-forced, vault-unlock=fixture-mnemonic-file
// @honesty-rationale TIER-SPLIT (economics QM doctrine 2026-06-19, Honor tier
//   order): the bilateral SUCCESS ceremony (propose+accept over two peer-paired
//   daemons) is already proven at the INTEGRATION tier by
//   integ-flow-agreement-bilateral (@mechanism-asserted, real `withDevices`
//   two-daemon pairing). Re-proving it as a two-daemon BROWSER ceremony would be
//   redundant heavy work. This e2e's job is the UI-GESTURE → REAL-BACKEND path:
//   on a SOLO founder daemon (no friendship chain), the real Create gesture
//   dispatches flow.agreement_propose and the backend refuses LOUD ("no
//   friendship chain … pair first"). The witness is that daemon-originated
//   refusal string surfacing in the UI status (the UI cannot fabricate it →
//   proves the surface is really wired to the op, not stubbed — kills the 1677
//   theatre) PLUS a backend check that NO flow_agreement node was created. So:
//   success-at-integ, refusal+wiring-at-e2e — coverage complete across tiers.
// @mechanism-asserted Create gesture → flow.agreement_propose → daemon loud refusal in UI + no flow_agreement node
// @success-covered-by integ-flow-agreement-bilateral (M2, two-daemon @mechanism-asserted)
// @canonical-flow YES
// @pre-seeds vault.unlocked
// === END HEADER ===
//
// 1644 M6 — Agreement surface E2E (wiring/refusal leg). Same harness as
// e2e-flow-funding-policy.
//
// Run (build-host — MBP is flow-e2e-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test --allow-all --no-check --unstable-ffi --unstable-worker-options \
//     src/packages/flow-funding/tests/e2e-flow-funding-agreement.test.ts

import {
  assert,
  assertEquals,
} from "@std/assert";
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
import { installActionApprovalAutoGrant } from "../../../../tests/helpers/drive-action-approval.ts";
import { testLogin } from "../../../../tests/helpers/login.ts";
import {
  registerBrowser,
  unregisterBrowser,
} from "../../../../tests/helpers/process-registry.ts";

const NAOMS_ROOT = new URL("../../../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);

// A well-formed but UNPAIRED peer DID — no friendship chain exists with it.
const UNPAIRED_PEER =
  "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH";

async function countAgreements(ws: WebSocket): Promise<number> {
  const resp = await wsSend(ws, {
    type: "graph.query",
    pattern: { type: "flow_agreement", limit: 500 },
  });
  const nodes = (resp.nodes as unknown[] | undefined) ??
    ((resp.data as { nodes?: unknown[] } | undefined)?.nodes) ?? [];
  return nodes.length;
}

Deno.test({
  name:
    "1644 M6: the Agreement Create gesture reaches the real backend (loud no-friendship refusal; no node created)",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const port = await getRandomPort();
    // deno-lint-ignore no-explicit-any
    let daemon: any = null;
    // deno-lint-ignore no-explicit-any
    let browser: any = null;
    let ws: WebSocket | null = null;
    let disposeGrant: (() => void) | null = null;
    let token: number | null = null;
    try {
      const started = await startDaemonFromFixture(
        NAOMS_ROOT,
        port,
        "1644-m6-agreement",
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
      const appPassword = Deno.readTextFileSync(
        `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
      ).trim();
      disposeGrant = installActionApprovalAutoGrant(ws, { appPassword });

      // Pre-state: no flow_agreement nodes for a solo founder.
      const before = await countAgreements(ws);
      assertEquals(before, 0, "no flow_agreement nodes before the gesture");

      // ── Browser: real login, open Flow Funding, switch to Agreement.
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-agreement", browser);
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
          .__flowShowSurface("agreement");
      });

      // ── Wait for the Agreement surface (its injected counterparty field).
      let mounted = false;
      for (let i = 0; i < 40; i++) {
        mounted = await evalWithRetry(
          page,
          () =>
            !!document.querySelector(
              "#flow-agreement #flowAgreementCounterparty",
            ),
        );
        if (mounted) break;
        await delay(500);
      }
      assert(mounted, "Agreement surface / counterparty field did not mount");

      // ── REAL GESTURE: fill the counterparty + click Create (page.evaluate
      //    passes the peer arg into the browser context).
      await page.evaluate((peer: string) => {
        const cp = document.querySelector(
          "#flow-agreement #flowAgreementCounterparty",
        ) as HTMLInputElement | null;
        if (!cp) throw new Error("counterparty field missing");
        cp.value = peer;
        const create = Array.from(
          document.querySelectorAll("#flow-agreement .btnrow .btn.p"),
        )[0] as HTMLButtonElement | undefined;
        if (!create) throw new Error("Create button missing");
        create.click();
      }, UNPAIRED_PEER);

      // ── WITNESS: the daemon-originated loud refusal surfaces in the UI status.
      let status = "";
      for (let i = 0; i < 40; i++) {
        status = await evalWithRetry(page, () => {
          const el = document.querySelector("#flow-status");
          return (el?.textContent ?? "");
        });
        if (status.toLowerCase().indexOf("friendship") !== -1) break;
        await delay(500);
      }
      assert(
        status.toLowerCase().indexOf("no friendship chain") !== -1 ||
          status.toLowerCase().indexOf("friendship") !== -1,
        `UI must surface the daemon's loud no-friendship refusal (got: ${status})`,
      );

      // ── WITNESS: the refused propose created NO flow_agreement node.
      const after = await countAgreements(ws);
      assertEquals(
        after,
        0,
        "a refused propose must NOT create a flow_agreement node",
      );
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
      if (daemon) {
        try {
          daemon.process.kill("SIGTERM");
        } catch { /* already dead */ }
      }
    }
  },
});
