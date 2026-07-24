// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 COMPLETION C3 (closes G4) — a user ACCEPTS an incoming flow
//   agreement from the UI. On main flow.agreement_accept is op + CLI only
//   (manifest-operations.ts:129-142); the surface tells the user the
//   counterparty will "co-sign" (flow-tab.js:807-816) but there is NO
//   incoming-proposal list and NO accept/co-sign control in ui/. This test is
//   RED-FIRST against origin/main (e7d20737015): it fails because daemon B's
//   Flow UI never surfaces an accept control for the replicated proposal.
// @covers src/packages/flow-funding/ui/flow-tab.js (incoming-proposals + accept control — ABSENT on main)
// @covers src/packages/flow-funding/ui/flow-surfaces.js (incoming-proposals surface — ABSENT on main)
// @covers src/packages/flow-funding/handlers/agreement.ts:1 (flow.agreement_accept — reached via the UI control)
// @mechanism-asserted UI accept gesture on daemon B → ctx.api.agreement_accept → bilateral fold `active` on BOTH daemons (A proposer + B accepter)
// @success-covered-by this test (the bilateral SUCCESS ceremony, now UI-driven)
// @failure-mode-sibling src/packages/flow-funding/tests/e2e-flow-funding-agreement.test.ts
//   (solo founder → Create → daemon loud no-friendship refusal + no node) — the
//   propose-refusal leg; this file is its accept-success bilateral counterpart.
// @bypasses cross-browser-identity=puppeteer-fresh-context, db-unlock=fixture-password, identity=pre-onboarded, keychain=fixture-shares-file, kronos-disabled, vault-unlock=fixture-mnemonic-file, biometric=disabled, iroh-mdns-disabled
// @honesty-rationale Two REAL peer-paired daemons (founder + invitee-a) spawned
//   via the canonical spawnNDaemonNBrowser (withDevices + puppeteer-core; real
//   peer-pair ceremony, NO copied fixtures — tests/AGENTS.md §multi-daemon
//   discipline). The proposal is created by driving the REAL WS write path on
//   daemon A (flow.agreement_propose) — legitimate setup, not a pre-seed of the
//   state under test (the state under test is B's UI ACCEPT path + the bilateral
//   fold, neither of which is seeded). Daemon B's browser drives the real
//   feature (`_naoms.activateApp("flow-funding")`) and the ACCEPT gesture is a
//   real puppeteer pointer click on the accept control — the control does not
//   exist on main, so waitForSelector times out and the test is RED for the
//   right reason (missing UI wiring). The fold-to-`active` witness is read from
//   BOTH daemons' real flow.get_agreement, so a status flip on one side alone
//   cannot pass. Also names: cross, unlock, identity, keychain, kronos, vault,
//   biometric, iroh.
// @canonical-flow YES — A proposes (WS) → proposed lane replicates to B → B's
//   Flow UI renders the incoming proposal → real ACCEPT click → agreement_accept
//   → accepted lane replicates to A → bilateral fold `active` on both.
// @pre-seeds NONE — the agreement is produced by the real propose write path; no
//   flow_agreement / flow-state row is seeded.
//
// EXPECTED-RED-ON-MAC (run env): the canonical 2-daemon real-browser E2Es carry
// an EXPECTED-RED-ON-MAC note (see e2e-trust-notifications-peer-pair.test.ts +
// M-1494-M25) — Mac co-tenancy with sibling claude / rustc / git starves
// real-browser E2Es. This file follows the same policy: authored + intended to
// run on gpu-host; on main it is structurally RED (the accept control has no
// producer in flow-tab.js / flow-surfaces.js).
//
// Run (build-host / gpu-host — NOT MBP):
//   NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release \
//     deno test -A --no-check --unstable-sloppy-imports --config <repo>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-agreement-accept-ui.test.ts
// === END HEADER ===

import { assert, assertEquals } from "jsr:@std/assert";
import { withNDaemonNBrowser } from "../../../../tests/helpers/n-daemon-n-browser.ts";
import { wsSend } from "../../../../tests/helpers/shared-harness.ts";

// Contract selector the C3 implementation MUST expose on the accept affordance
// for the incoming proposal. RED-first: absent on main.
const ACCEPT_SELECTOR = '[data-testid="flow-agreement-accept"]';

async function pollAgreement(
  ws: WebSocket,
  agreementId: string,
  want: (r: Record<string, unknown>) => boolean,
  budgetMs: number,
  label: string,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + budgetMs;
  let last: Record<string, unknown> = {};
  while (Date.now() < deadline) {
    const r = await wsSend(ws, {
      type: "flow.get_agreement",
      agreementId,
    }) as Record<string, unknown>;
    last = r;
    if (want(r)) return r;
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(
    `pollAgreement[${label}] did not converge within ${budgetMs}ms — last=${
      JSON.stringify(last).slice(0, 300)
    }`,
  );
}

Deno.test({
  name:
    "1644 C3: a user ACCEPTS an incoming flow agreement from the UI — bilateral fold flips active on both daemons",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withNDaemonNBrowser(
      {
        groups: [
          { identity: "founder", devices: 1 },
          { identity: "invitee-a", devices: 1 },
        ],
        peerPairAcrossGroups: true,
        headless: true,
        convergenceTimeoutMs: 60_000,
        // drive real first-launch / vault-unlock so `_naomsFeatures` is
        // populated from daemon-discovered manifests (flow-funding included).
        auth: true,
      },
      async (ctx) => {
        const [a, b] = ctx.devices.allHandles;
        assert(a.ws && b.ws, "both daemons have an authenticated WS");
        assert(
          a.ownerDid && b.ownerDid && a.ownerDid !== b.ownerDid,
          `two DISTINCT peer identities required — A=${a.ownerDid} B=${b.ownerDid}`,
        );
        const bobB = ctx.browsers[1];
        assert(bobB, "daemon B (invitee-a) browser present");

        // ── SETUP (real write path on A, NOT a pre-seed of the accept state) ──
        const propose = await wsSend(a.ws!, {
          type: "flow.agreement_propose",
          counterparty: b.ownerDid,
          terms: { formality: 0.8, tier: "revenue-share", sharePct: 0.1 },
        }) as { ok?: boolean; agreementId?: string; error?: string };
        assert(
          propose.ok && typeof propose.agreementId === "string",
          `propose failed — ${JSON.stringify(propose).slice(0, 300)}`,
        );
        const agreementId = propose.agreementId!;

        // proposed lane must replicate to B before its UI can render it.
        await pollAgreement(
          b.ws!,
          agreementId,
          (r) => r.found === true && r.proposer === a.ownerDid,
          40_000,
          "proposed replicated to B",
        );

        // ── Daemon B's browser: open the Flow feature, view "Flow" (your
        //    flows / incoming agreements).
        await bobB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          await w._naoms.activateApp("flow-funding");
        });
        // wait for the wired flow shell (its exposed surface-nav hook).
        await bobB.page.waitForFunction(
          () =>
            typeof (window as { __flowShowSurface?: unknown })
              .__flowShowSurface === "function",
          { timeout: 30_000 },
        );
        await bobB.page.evaluate(() => {
          (window as unknown as { __flowShowSurface: (n: string) => void })
            .__flowShowSurface("velocity");
        });

        // ── RED POINT: the incoming proposal must surface an ACCEPT control.
        //    On main there is NO incoming-proposals list and NO accept control
        //    anywhere in ui/, so this times out → the test fails for the RIGHT
        //    reason (missing UI wiring for flow.agreement_accept, gap G4).
        const acceptEl = await bobB.page.waitForSelector(ACCEPT_SELECTOR, {
          timeout: 30_000,
        }).catch(() => null);
        assert(
          acceptEl,
          `no accept control (${ACCEPT_SELECTOR}) surfaced on daemon B for the ` +
            `incoming proposal ${agreementId} — flow.agreement_accept has no UI ` +
            `on main (op + CLI only). The Flow UI renders proposals but a user ` +
            `cannot co-sign from the app (gap G4).`,
        );

        // ── GREEN PATH (post-impl): real pointer click accepts → both fold active.
        await bobB.page.click(ACCEPT_SELECTOR);

        const activeOnB = await pollAgreement(
          b.ws!,
          agreementId,
          (r) => r.status === "active",
          30_000,
          "active on B (accepter)",
        );
        assertEquals(activeOnB.accepter, b.ownerDid, "B recorded as accepter");

        const activeOnA = await pollAgreement(
          a.ws!,
          agreementId,
          (r) => r.status === "active",
          30_000,
          "active on A (cross-peer fold)",
        );
        assertEquals(activeOnA.proposer, a.ownerDid, "proposer is A");
        assertEquals(
          activeOnA.counterparty,
          b.ownerDid,
          "counterparty is B",
        );

        // UI reflects `active` on B (the surface must not lie about the fold).
        const uiShowsActive = await bobB.page.evaluate(() => {
          const app = document.querySelector("#flow-app");
          return !!app && /active/i.test(app.textContent ?? "");
        });
        assert(
          uiShowsActive,
          "daemon B's Flow UI must reflect the agreement as active after accept",
        );
      },
    );
  },
});
