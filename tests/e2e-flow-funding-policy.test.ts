// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent M6 Policy surface real-gesture
// @gated-by: flow.policy_set chain-write + flow_policy materialize legs (M1)
// @covers flow-funding Policy surface (src/packages/flow-funding/ui/flow-tab.js)
// @flow-description real-onboarded-founder → open-Flow-Funding → fill+Save Policy form → assert flow.get_policy backend fold
// @owns-surface flow-policy
// @bypasses action-approval=owner-credential-auto-grant, db-unlock=fixture-password, identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale The Policy is armed by a REAL browser gesture — the wired
//   Policy surface (non-NAOMS_UI_MOCK path) is filled and its Save button clicked
//   in a real Chrome under real WS auth, dispatching flow.policy_set over the
//   owner socket (no _graphPut, no db.exec). The terminal-effect witness is a
//   BACKEND read — the canonical flow.get_policy fold of the flow_policy node —
//   never UI text. The ONLY simulated step is the owner Approve keystroke for the
//   owner-tier write, via installActionApprovalAutoGrant with the fixture app
//   password (the documented acceptable bypass). identity=pre-onboarded-founder
//   because onboarding is not this surface's subject; the founder fixture stands
//   in for completed boot.
// @mechanism-asserted flow.policy_set → flow_policy fold (get_policy found+floor+ceiling)
// @canonical-flow YES
// @pre-seeds vault.unlocked
// === END HEADER ===
//
// 1644 M6 — Policy surface E2E. The real-gesture verification that the wired
// Policy surface saves a FlowPolicy a person can later read back. GREEN requires
// flow.policy_set + the flow_policy materializer to run end-to-end on a spawned
// founder daemon; nothing is stubbed.
//
// Run (build-host — MBP is flow-integ-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test --allow-all --no-check --unstable-ffi --unstable-worker-options \
//     src/packages/flow-funding/tests/e2e-flow-funding-policy.test.ts

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

const CONTEXT = "awip"; // the wired Policy surface's default context
const TOKEN_KIND = "custom"; // default denomination mechanism
const FLOOR = 1234;
const CEILING = 5678;

/** Backend witness: the canonical flow.get_policy fold for (context, tokenKind). */
async function readPolicyOnce(
  ws: WebSocket,
): Promise<{ found: boolean; floor?: number; ceiling?: number; version?: number }> {
  const resp = await wsSend(ws, {
    type: "flow.get_policy",
    context: CONTEXT,
    tokenKind: TOKEN_KIND,
  });
  const params = resp.params as { floor?: number; ceiling?: number } | null;
  return {
    found: resp.found === true,
    floor: params?.floor,
    ceiling: params?.ceiling,
    version: resp.version as number | undefined,
  };
}

async function readPolicyUntilFound(
  ws: WebSocket,
): Promise<{ found: boolean; floor?: number; ceiling?: number; version?: number }> {
  let last = await readPolicyOnce(ws);
  for (let i = 0; i < 40 && !last.found; i++) {
    await delay(250);
    last = await readPolicyOnce(ws);
  }
  return last;
}

Deno.test({
  name:
    "1644 M6: the wired Policy surface arms a FlowPolicy a person reads back (flow.get_policy fold)",
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
        "1644-m6-policy",
        undefined,
        "founder",
      );
      daemon = started.daemon;

      // Owner-authenticated WS — drives the owner Approve auto-grant + the witness.
      const auth = await authenticateWs(port, started.keysDir);
      ws = auth.ws;
      await unlockFixtureVault(ws, { identity: "founder", naomsRoot: NAOMS_ROOT });
      const appPassword = Deno.readTextFileSync(
        `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
      ).trim();
      disposeGrant = installActionApprovalAutoGrant(ws, { appPassword });

      // Pre-state: no policy armed for (awip, custom) yet — honest RED baseline.
      const pre = await readPolicyOnce(ws);
      assertEquals(pre.found, false, "no FlowPolicy before the gesture");

      // ── Browser: real login, then open Flow Funding.
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-policy", browser);
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

      // Open the Flow Funding feature via the canonical shell entry.
      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error("_naoms.activateApp not exposed — shell init incomplete");
        }
        await w._naoms.activateApp("flow-funding");
      });

      // Wait for the wired Policy surface to mount (its own renderer).
      let mounted = false;
      for (let i = 0; i < 40; i++) {
        mounted = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-mock-policy #floorInput"),
        );
        if (mounted) break;
        await delay(500);
      }
      assert(mounted, "Policy surface did not mount within 20s of activateApp");

      // ── REAL GESTURE: fill floor + ceiling and click Save policy.
      await page.evaluate((floor: number, ceiling: number) => {
        function set(id: string, v: string) {
          const el = document.querySelector(
            "#flow-mock-policy #" + id,
          ) as HTMLInputElement | null;
          if (!el) throw new Error("missing input #" + id);
          el.value = v;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        set("floorInput", String(floor));
        set("ceilingInput", String(ceiling));
        const saveBtn = Array.from(
          document.querySelectorAll("#flow-mock-policy .action-bar .btn.p"),
        )[0] as HTMLButtonElement | undefined;
        if (!saveBtn) throw new Error("Save policy button not found");
        saveBtn.click();
      }, FLOOR, CEILING);

      // ── BACKEND WITNESS: the armed FlowPolicy is readable via the real fold.
      const post = await readPolicyUntilFound(ws);
      assert(
        post.found,
        "flow.get_policy did not find the policy the Save gesture armed",
      );
      assertEquals(post.floor, FLOOR, "armed floor folds back");
      assertEquals(post.ceiling, CEILING, "armed ceiling folds back");
      assert(
        (post.version ?? 0) >= 1,
        `policy version should be >=1, got ${post.version}`,
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
