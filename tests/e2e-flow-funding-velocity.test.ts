// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent M6 Velocity surface real-render
// @gated-by: flow.policy_set chain-write + flow_policy materialize (M1) + Velocity graphQuery read (M6.2)
// @covers flow-funding Velocity surface (src/packages/flow-funding/ui/flow-tab.js)
// @flow-description seed-policy-via-real-op → real-onboarded-founder → open-Flow-Funding → switch-to-Velocity → assert river renders the REAL armed band (not the first-run empty state)
// @owns-surface flow-velocity
// @bypasses action-approval=owner-credential-auto-grant, db-unlock=fixture-password, identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale The Velocity "river" is a READ surface: it queries the
//   user's real flow_policy/flow_agreement/flow_settlement graph nodes via
//   ctx.graphQuery. The policy it reads is armed by the REAL flow.policy_set
//   write path over an owner WS (no _graphPut). The browser then opens the
//   surface under real auth and the assertion is that the river renders the REAL
//   band values (floor/ceiling that equal the backend flow.get_policy fold) and
//   is NOT in the first-run empty state — i.e. it read and rendered real chain
//   data, never the mock's synthetic "$17,400 cup full" hero. The render IS the
//   terminal effect for a read surface; it is cross-checked against the backend
//   fold so it cannot pass on fabricated text.
// @mechanism-asserted Velocity graphQuery(flow_policy) → river shows armed band == get_policy fold
// @canonical-flow YES
// @pre-seeds vault.unlocked
// === END HEADER ===
//
// 1644 M6 — Velocity surface E2E. Proves the flow "river" reads + renders real
// flow data (the armed band) rather than the synthetic mock hero, on a real
// onboarded daemon. Build on the same harness as e2e-flow-funding-policy.
//
// Run (build-host — MBP is flow-e2e-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test --allow-all --no-check --unstable-ffi --unstable-worker-options \
//     src/packages/flow-funding/tests/e2e-flow-funding-velocity.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import puppeteer from "npm:puppeteer-core";
import {
  delay,
  evalWithRetry,
  findBrowser,
  getRandomPort,
  startDaemonFromFixture,
} from "../../../../tests/helpers/browser-e2e.ts";
import { authenticateWs, wsSend } from "../../../../tests/helpers/ws-ceremony.ts";
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

const CONTEXT = "awip";
const TOKEN_KIND = "custom";
const FLOOR = 4321;
const CEILING = 8765;

Deno.test({
  name:
    "1644 M6: the Velocity river renders the REAL armed band (reads flow_policy, not the synthetic hero)",
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
        "1644-m6-velocity",
        undefined,
        "founder",
      );
      daemon = started.daemon;

      const auth = await authenticateWs(port, started.keysDir);
      ws = auth.ws;
      await unlockFixtureVault(ws, { identity: "founder", naomsRoot: NAOMS_ROOT });
      const appPassword = Deno.readTextFileSync(
        `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
      ).trim();
      disposeGrant = installActionApprovalAutoGrant(ws, { appPassword });

      // ── Seed a real FlowPolicy via the real write path (no _graphPut).
      const set = await wsSend(ws, {
        type: "flow.policy_set",
        context: CONTEXT,
        tokenKind: TOKEN_KIND,
        params: { floor: FLOOR, ceiling: CEILING },
      });
      assert(set.ok === true, `seed flow.policy_set failed: ${JSON.stringify(set)}`);

      // Backend cross-check: the band the river must equal.
      let found = false;
      for (let i = 0; i < 40 && !found; i++) {
        const got = await wsSend(ws, {
          type: "flow.get_policy",
          context: CONTEXT,
          tokenKind: TOKEN_KIND,
        });
        found = got.found === true;
        if (found) {
          const p = got.params as { floor: number; ceiling: number };
          assertEquals(p.floor, FLOOR, "seeded floor folds");
          assertEquals(p.ceiling, CEILING, "seeded ceiling folds");
        } else await delay(250);
      }
      assert(found, "seeded policy not visible in the fold");

      // ── Browser: real login, open Flow Funding, switch to Velocity.
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-velocity", browser);
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
      assert(loginResult.success, `login failed: ${loginResult.errors.join("; ")}`);
      await delay(2000);

      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error("_naoms.activateApp not exposed");
        }
        await w._naoms.activateApp("flow-funding");
      });
      // wait for the wired shell, then switch to Velocity.
      let navReady = false;
      for (let i = 0; i < 40; i++) {
        navReady = await evalWithRetry(
          page,
          () => typeof (window as { __flowShowSurface?: unknown })
            .__flowShowSurface === "function",
        );
        if (navReady) break;
        await delay(500);
      }
      assert(navReady, "wired flow shell did not initialise");
      await page.evaluate(() => {
        (window as unknown as { __flowShowSurface: (n: string) => void })
          .__flowShowSurface("velocity");
      });

      // ── Assert: the river rendered the REAL band, NOT the first-run empty state.
      let render: { riverHidden: boolean; firstrunHidden: boolean; text: string } =
        { riverHidden: true, firstrunHidden: false, text: "" };
      // The river formats amounts with locale separators ("4,321"); strip all
      // non-digits before matching so the assertion is format-agnostic.
      const digits = (s: string) => s.replace(/[^0-9]/g, "");
      for (let i = 0; i < 40; i++) {
        render = await evalWithRetry(page, () => {
          const rc = document.querySelector("#flow-mock-velocity #riverContent");
          const fr = document.querySelector("#flow-mock-velocity #firstRun");
          const hidden = (el: Element | null) =>
            !el || el.classList.contains("hidden");
          return {
            riverHidden: hidden(rc),
            firstrunHidden: hidden(fr),
            text: (rc?.textContent ?? ""),
          };
        });
        if (!render.riverHidden && digits(render.text).indexOf(String(FLOOR)) !== -1) {
          break;
        }
        await delay(500);
      }
      assert(!render.riverHidden, "river is shown (a policy exists → not first-run)");
      assert(
        render.firstrunHidden,
        "first-run empty state is hidden (real flow data present)",
      );
      const riverDigits = digits(render.text);
      assert(
        riverDigits.indexOf(String(FLOOR)) !== -1 &&
          riverDigits.indexOf(String(CEILING)) !== -1,
        `river renders the REAL armed band ${FLOOR}-${CEILING} (got: ${
          render.text.slice(0, 200)
        })`,
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
