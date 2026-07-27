// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 completion C2/G3 — a person can SETTLE a flow epoch from the UI
// @gated-by: uc-flow-settle-surface-wired
// @covers flow-funding Flow surfaces (src/packages/flow-funding/ui/flow-tab.js + flow-surfaces.js)
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:handleEpochSettle (flow.epoch_settle)
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:handleGetSettlement (flow.get_settlement)
// @owns-surface flow-settle
// @bypasses action-approval=owner-credential-auto-grant, db-unlock=fixture-password, identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale The subject is the MISSING settle affordance. A FlowPolicy is
//   armed first via the already-wired Policy surface (a real Save gesture) purely as
//   SETUP so the (context) has a band to settle against. The claim under test is that
//   a REAL UI control in the Flow Funding surfaces triggers flow.epoch_settle — the
//   settle op is CLI/op-only today (manifest-operations.ts epoch_settle; never called
//   from ui/). The gesture under test uses a real-pointer click on the settle control;
//   its ABSENCE is detected by a DOM read (querySelector), which is why this REDs on
//   main. The terminal-effect witness (post-green) is a BACKEND read — flow.get_settlement
//   folds a flow_settlement node — plus the Flow surface rendering the settlement. UI
//   text is never the witness.
// @mechanism-asserted UI settle control → flow.epoch_settle → flow_settlement fold (flow.get_settlement returns a settlement leg)
// @canonical-flow YES
// @pre-seeds vault.unlocked, flow_policy(armed via real Save gesture)
// === END HEADER ===
//
// 1644 COMPLETION C2/G3 — Settle-from-UI E2E (RED-first).
//
// Gap: `flow.epoch_settle` is CLI/op-only. No control in ui/flow-tab.js or
// flow-surfaces.js settles an epoch (the surfaces are Policy / Agreement /
// Velocity / Simulate — Simulate is a dry-run that commits nothing). This test
// arms a policy through the real Policy surface, then asserts a REAL settle
// control exists and, when clicked, commits a flow_settlement the daemon folds
// back. On main it FAILS at control-presence: there is nothing to settle with.
//
// Run (build-host — MBP is flow-integ-forbidden):
//   NAOMS_FFI_LIB_PATH="<repo>/rust/target/release/" \
//     deno test -A --no-check --unstable-sloppy-imports --config <repo>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-settle-from-ui.test.ts

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

// A settle from the UI settles the SAME (context, tokenKind) the Policy surface
// arms. C1 removed the fabricated "awip" context (critic N-2); the wired Policy
// surface now defaults to the holon-local "Personal" self-context. Settle reads
// that same context back.
const CONTEXT = "personal";
const TOKEN_KIND = "custom";
// A band well under the balance we settle against so the epoch produces surplus.
const FLOOR = 100;
const CEILING = 500;
// The owner's real epoch balance (design HC-04: settlement is explicit — the
// caller supplies the balance). Above CEILING so there is surplus to flow out.
const EPOCH_BALANCE = 700;

const SR = { sanitizeResources: false, sanitizeOps: false } as const;

/** Backend witness: fold the holon's settlement records for CONTEXT. */
async function readSettlements(
  ws: WebSocket,
): Promise<Array<Record<string, unknown>>> {
  const resp = await wsSend(ws, {
    type: "flow.get_settlement",
    context: CONTEXT,
  });
  if (resp.ok !== true) return [];
  return (resp.settlements as Array<Record<string, unknown>>) ?? [];
}

Deno.test({
  ...SR,
  name:
    "1644 C2/G3: a person settles a flow epoch from the Flow Funding UI — a real " +
    "settle control commits a flow_settlement the daemon folds back (flow.get_settlement)",
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
      // founder-with-friend-invitee-a: the founder has a REAL active friendship
      // (a real non-self contact), so the settle UI sources a REAL claimant DID
      // from a real relationship (HC-C1) — a bare founder fixture has zero peers
      // and a settle would refuse loud (no claimant to absorb surplus). Vault +
      // founder identity/password are the SAME as the plain founder fixture, so
      // unlockFixtureVault(identity:"founder") still applies.
      const started = await startDaemonFromFixture(
        NAOMS_ROOT,
        port,
        "1644-settle-ui",
        undefined,
        "founder-with-friend-invitee-a",
      );
      daemon = started.daemon;

      // Owner-authenticated WS — drives the owner Approve auto-grant + the witness.
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

      // Honest RED baseline: no settlement exists for this context yet.
      const preSettlements = await readSettlements(ws);
      assertEquals(
        preSettlements.length,
        0,
        "no flow_settlement should exist before the settle gesture",
      );

      // ── Browser: real login, then open Flow Funding.
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser("e2e:e2e-flow-funding-settle-from-ui", browser);
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

      // Open the Flow Funding feature via the canonical shell entry.
      await page.evaluate(async () => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error(
            "_naoms.activateApp not exposed — shell init incomplete",
          );
        }
        await w._naoms.activateApp("flow-funding");
      });

      // Wait for the wired flow app to mount.
      let mounted = false;
      for (let i = 0; i < 40; i++) {
        mounted = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-app"),
        );
        if (mounted) break;
        await delay(500);
      }
      assert(mounted, "Flow app did not mount within 20s of activateApp");

      // ── SETUP (already-wired Policy surface): arm a band for CONTEXT via the
      //    real Save gesture, so the epoch has a policy to settle against.
      let policyReady = false;
      for (let i = 0; i < 40; i++) {
        policyReady = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-policy #floorInput"),
        );
        if (policyReady) break;
        await delay(500);
      }
      assert(policyReady, "Policy surface did not mount for setup");
      await page.evaluate(
        (floor: number, ceiling: number) => {
          function set(id: string, v: string) {
            const el = document.querySelector(
              "#flow-policy #" + id,
            ) as HTMLInputElement | null;
            if (!el) throw new Error("missing input #" + id);
            el.value = v;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
          set("floorInput", String(floor));
          set("ceilingInput", String(ceiling));
          const saveBtn = Array.from(
            document.querySelectorAll("#flow-policy .action-bar .btn.p"),
          )[0] as HTMLButtonElement | undefined;
          if (!saveBtn) throw new Error("Save policy button not found");
          saveBtn.click();
        },
        FLOOR,
        CEILING,
      );
      // Confirm the band armed on the backend before hunting for a settle control.
      let armed = false;
      for (let i = 0; i < 40; i++) {
        const p = await wsSend(ws, {
          type: "flow.get_policy",
          context: CONTEXT,
          tokenKind: TOKEN_KIND,
        });
        if (p.found === true) {
          armed = true;
          break;
        }
        await delay(250);
      }
      assert(armed, "SETUP failed: policy did not arm — cannot test settle");

      // ── GESTURE UNDER TEST: locate a REAL settle control across the Flow
      //    surfaces. A settle affordance would live on the Velocity ("Flow") or
      //    Policy surface (settle the epoch for this context). Scan both. On
      //    main there is NONE — flow.epoch_settle is CLI/op-only.
      async function scanForSettleControl(): Promise<
        { found: boolean; how?: string; buttons: string[] }
      > {
        return await page.evaluate(() => {
          const app = document.querySelector("#flow-app");
          if (!app) return { found: false, buttons: [] as string[] };
          // Explicit affordance an implementer would add.
          const byAttr = app.querySelector(
            "[data-flow-settle],[data-flow-action='settle'],#flow-settle-btn",
          );
          if (byAttr) return { found: true, how: "attribute", buttons: [] };
          // A button whose accessible text names the settle act (exclude
          // "Simulate", which is the dry-run, not a real settlement).
          const btns = Array.from(app.querySelectorAll("button"));
          const labels = btns.map((b) => (b.textContent || "").trim());
          const byText = btns.find((b) => {
            const t = (b.textContent || "").toLowerCase();
            return (/settle/.test(t) || /run epoch/.test(t)) &&
              !/simulate/.test(t);
          });
          if (byText) {
            return { found: true, how: "button-text", buttons: labels };
          }
          return { found: false, buttons: labels };
        });
      }

      // Visit the Velocity ("Flow") surface where a settle control most plausibly
      // lives, then re-scan (the scan also sees the Policy surface's controls
      // when that surface is active).
      await page.evaluate(() => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (typeof w.__flowShowSurface === "function") {
          w.__flowShowSurface("velocity");
        }
      });
      await delay(1500);
      const velScan = await scanForSettleControl();

      await page.evaluate(() => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (typeof w.__flowShowSurface === "function") {
          w.__flowShowSurface("policy");
        }
      });
      await delay(1000);
      const polScan = await scanForSettleControl();

      const settleControlFound = velScan.found || polScan.found;
      assert(
        settleControlFound,
        "1644 C2/G3 RED: no UI control in the Flow Funding surfaces triggers " +
          "flow.epoch_settle. Settlement is CLI/op-only — a person cannot settle " +
          "an epoch from the UI. Buttons seen on Flow surface: " +
          JSON.stringify(velScan.buttons) + "; on Policy surface: " +
          JSON.stringify(polScan.buttons) + ".",
      );

      // ── Post-green witness (reached once a settle control exists): click it with
      //    a REAL pointer, then confirm the daemon folded a flow_settlement whose
      //    leg is paid or honestly-indeterminate, and the surface renders it.
      const controlSurface = velScan.found ? "velocity" : "policy";
      await page.evaluate((surface: string) => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (typeof w.__flowShowSurface === "function") {
          w.__flowShowSurface(surface);
        }
      }, controlSurface);
      await delay(800);
      // Supply the owner's real epoch balance (design HC-04 — settlement is an
      // explicit gesture, the caller supplies the balance). Above CEILING so the
      // gradient engine produces surplus for the real claimant to absorb.
      await page.evaluate((bal: number) => {
        const el = document.querySelector(
          "#flow-velocity #settleBalance",
        ) as HTMLInputElement | null;
        if (!el) throw new Error("settle balance input not found");
        el.value = String(bal);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, EPOCH_BALANCE);
      // Real-pointer click on the settle control (CDP mouse, not evaluate-click).
      const settleSel =
        "#flow-app [data-flow-settle], #flow-app [data-flow-action='settle'], " +
        "#flow-app #flow-settle-btn";
      const handle = await page.$(settleSel);
      assert(handle, "settle control present but not clickable by selector");
      await handle.click();

      // Backend witness: a flow_settlement is folded for this context.
      let settlements: Array<Record<string, unknown>> = [];
      for (let i = 0; i < 40; i++) {
        settlements = await readSettlements(ws);
        if (settlements.length > 0) break;
        await delay(500);
      }
      assert(
        settlements.length > 0,
        "flow.get_settlement folded no flow_settlement after the UI settle gesture",
      );
      const legs = (settlements[0].legs as Array<Record<string, unknown>>) ??
        [];
      assert(
        legs.some((l) => l.status === "paid" || l.status === "unconfirmed"),
        `settlement has no paid/indeterminate leg — ${JSON.stringify(legs)}`,
      );

      // UI witness: the Flow (velocity) surface renders the settlement count.
      await page.evaluate(() => {
        // deno-lint-ignore no-explicit-any
        const w = window as any;
        if (typeof w.__flowShowSurface === "function") {
          w.__flowShowSurface("velocity");
        }
      });
      let rendered = false;
      for (let i = 0; i < 30; i++) {
        rendered = await evalWithRetry(page, () => {
          const rc = document.querySelector("#flow-velocity #riverContent");
          return !!rc && /settlement/i.test(rc.textContent || "");
        });
        if (rendered) break;
        await delay(500);
      }
      assert(
        rendered,
        "Flow surface did not render the settlement after the UI settle gesture",
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
