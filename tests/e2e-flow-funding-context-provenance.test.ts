// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 completion C1/G1 — Policy-surface context list is provenance-real
// @covers flow-funding Policy surface context enumeration
//   (src/packages/flow-funding/ui/flow-tab.js:41-47 CONTEXTS,
//    src/packages/flow-funding/ui/flow-surfaces.js:39-45 POLICY_CONTEXTS)
// @flow-description real-onboarded-founder → create TWO real hives via `naoms hive create`
//   → open Flow Funding Policy surface → assert the rendered context list is enumerated
//   from the user's REAL hives (Alpha Hive / Beta Hive), NOT the fabricated hardcoded
//   literals (AWIP core team / Watershed hive / …).
// @owns-surface flow-policy
// @bypasses action-approval=owner-credential-auto-grant, db-unlock=fixture-password,
//   identity=pre-onboarded-founder, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale The hives are created through the REAL `naoms hive create` CLI verb
//   (the same handler the product uses) against a real founder daemon; the M0 hive.create
//   approval gate is answered by installActionApprovalAutoGrant with the fixture app
//   password (the documented acceptable bypass). The Policy surface is mounted by a REAL
//   browser gesture (activateApp) under real WS auth. The witness is the DOM the user sees:
//   the context pills/nav rendered by the wired Policy surface. No pre-seed of the DOM, no
//   window.__ shortcut, no synthetic list.
// @mechanism-asserted rendered Policy context list == the user's real hives (graph type=hive),
//   NOT the hardcoded CONTEXTS/POLICY_CONTEXTS literals
// @canonical-flow YES
// @pre-seeds vault.unlocked
// === END HEADER ===
//
// 1644 COMPLETION C1/G1 — Context provenance. RED-first: on current `main` the Policy
// surface renders a HARDCODED context list (awip/nao/circle/household/stewardship, incl.
// the fabricated "Watershed hive" + "AWIP core team"). The design contract is that the
// list is enumerated from the user's REAL hives. This test creates two real hives and
// asserts the rendered list reflects THEM — it MUST FAIL on main (list is hardcoded).
//
// Run (build-host / laptop — dylib prebuilt in the MAIN tree):
//   NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release \
//     deno test -A --no-check --unstable-sloppy-imports \
//     --config <repoRoot>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-context-provenance.test.ts

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
import { authenticateWs } from "../../../../tests/helpers/ws-ceremony.ts";
import { unlockFixtureVault } from "../../../../tests/helpers/fixture-unlock.ts";
import { installActionApprovalAutoGrant } from "../../../../tests/helpers/drive-action-approval.ts";
import { runNaomsCli } from "../../../../tests/helpers/cli-e2e.ts";
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

// The two REAL hives this test creates via `naoms hive create`. Deliberately
// distinct from every hardcoded literal so their presence/absence in the DOM is
// unambiguous evidence of provenance.
const HIVE_ALPHA = "Alpha Hive";
const HIVE_BETA = "Beta Hive";

// The fabricated labels baked into the hardcoded CONTEXTS/POLICY_CONTEXTS list
// (flow-tab.js:41-47 / flow-surfaces.js:39-45). A provenance-real list MUST NOT
// contain these — they correspond to no real hive of this founder.
const FABRICATED = ["Watershed hive", "AWIP core team", "Mutual-aid circle"];

/** Extract the last JSON object from CLI stdout (the CLI may print env notes). */
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
    "1644 C1/G1: the Policy surface context list is enumerated from the user's REAL hives " +
    "(Alpha/Beta), not the hardcoded CONTEXTS/POLICY_CONTEXTS literals",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${NAOMS_ROOT}/rust/target/release`);
    }
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
        "1644-c1-context-provenance",
        undefined,
        "founder",
      );
      daemon = started.daemon;
      const keysDir = started.keysDir;

      // Owner-authenticated WS — arms the signer + drives the hive.create M0
      // approval auto-grant.
      const auth = await authenticateWs(port, keysDir);
      ws = auth.ws;
      await unlockFixtureVault(ws, {
        identity: "founder",
        naomsRoot: NAOMS_ROOT,
      });
      const appPassword = Deno.readTextFileSync(
        `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
      ).trim();
      disposeGrant = installActionApprovalAutoGrant(ws, { appPassword });

      // ── Create TWO real hives via the REAL `naoms hive create` CLI verb. ──
      const daemonUrl = `ws://127.0.0.1:${port}/ws`;
      const keyFile = join(keysDir, "user.ed25519");
      const createHive = async (name: string): Promise<string> => {
        const res = await runNaomsCli(
          ["hive", "create", "--name", name, "--json"],
          { daemonUrl, keyFile, timeoutMs: 180_000 },
        );
        assert(
          res.code === 0,
          `naoms hive create "${name}" exit=${res.code}: ${
            res.stderr.slice(0, 800)
          }`,
        );
        const j = lastJson(res.stdout);
        const id = (j?.hiveChainId ?? j?.hiveId ??
          (j?.raw as Record<string, unknown> | undefined)?.hive_chain_id ??
          (j?.raw as Record<string, unknown> | undefined)?.hiveId) as
            | string
            | undefined;
        assert(
          typeof id === "string" && id.length > 0,
          `hive create "${name}" returned no hive id: ${
            res.stdout.slice(0, 800)
          }`,
        );
        return id;
      };
      const alphaId = await createHive(HIVE_ALPHA);
      const betaId = await createHive(HIVE_BETA);
      assert(alphaId !== betaId, "the two hives have distinct chain ids");
      console.error(`[1644-c1] created hives: ${alphaId} / ${betaId}`);

      // Confirm both hives materialized into the graph (the enumeration source
      // a provenance-real Policy surface would read). This proves the RED below
      // is a UI-wiring gap, not a hive-create failure.
      let hiveNames: string[] = [];
      for (let i = 0; i < 20; i++) {
        const gq = await runNaomsCli(
          ["graph", "query", "--type", "hive", "--json"],
          { daemonUrl, keyFile, timeoutMs: 60_000 },
        );
        if (gq.code === 0) {
          const j = lastJson(gq.stdout);
          const nodes = ((j?.nodes ??
            (j?.result as Record<string, unknown> | undefined)?.nodes) ??
            []) as Array<Record<string, unknown>>;
          hiveNames = nodes.map((n) => {
            const props = (n.properties ?? n.props ?? n) as Record<
              string,
              unknown
            >;
            return String(props.name ?? props.label ?? n.label ?? "");
          });
          if (
            hiveNames.includes(HIVE_ALPHA) && hiveNames.includes(HIVE_BETA)
          ) {
            break;
          }
        }
        await delay(1000);
      }
      assert(
        hiveNames.includes(HIVE_ALPHA) && hiveNames.includes(HIVE_BETA),
        `both real hives must materialize into the graph before we assert the UI ` +
          `(so a wiring gap — not a create failure — is what fails below). Got: ${
            JSON.stringify(hiveNames)
          }`,
      );

      // ── Browser: real login, then open Flow Funding. ──
      browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      token = registerBrowser(
        "e2e:e2e-flow-funding-context-provenance",
        browser,
      );
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
        if (!w._naoms || typeof w._naoms.activateApp !== "function") {
          throw new Error(
            "_naoms.activateApp not exposed — shell init incomplete",
          );
        }
        await w._naoms.activateApp("flow-funding");
      });

      // Wait for the wired Policy surface to mount.
      let mounted = false;
      for (let i = 0; i < 40; i++) {
        mounted = await evalWithRetry(
          page,
          () => !!document.querySelector("#flow-policy .ctx-pills"),
        );
        if (mounted) break;
        await delay(500);
      }
      assert(mounted, "Policy surface did not mount within 20s of activateApp");

      // ── WITNESS: the rendered context list the user actually sees. ──
      const renderedContexts: string[] = await evalWithRetry(page, () => {
        const out: string[] = [];
        document
          .querySelectorAll("#flow-policy .ctx-pill")
          .forEach((el) => out.push((el.textContent || "").trim()));
        document
          .querySelectorAll("#flow-policy .cfg-nav .it")
          .forEach((el) => out.push((el.textContent || "").trim()));
        return out.filter(Boolean);
      });
      console.error(
        `[1644-c1] rendered Policy contexts: ${
          JSON.stringify(renderedContexts)
        }`,
      );
      assert(
        renderedContexts.length > 0,
        "the Policy surface rendered no context labels at all",
      );

      // The provenance contract: the user's REAL hives appear …
      assert(
        renderedContexts.includes(HIVE_ALPHA),
        `Policy context list must contain the real hive "${HIVE_ALPHA}" — ` +
          `enumerated from the user's hives, not a hardcoded literal. Rendered: ${
            JSON.stringify(renderedContexts)
          }`,
      );
      assert(
        renderedContexts.includes(HIVE_BETA),
        `Policy context list must contain the real hive "${HIVE_BETA}". Rendered: ${
          JSON.stringify(renderedContexts)
        }`,
      );

      // … and the fabricated hardcoded labels do NOT.
      for (const fake of FABRICATED) {
        assertEquals(
          renderedContexts.includes(fake),
          false,
          `Policy context list must NOT contain the fabricated hardcoded label ` +
            `"${fake}" (it corresponds to no real hive). Rendered: ${
              JSON.stringify(renderedContexts)
            }`,
        );
      }
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
