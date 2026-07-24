// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier e2e
// @intent 1644 COMPLETION C6/G5 — the STAR capstone (frozen-plan M7): the whole flow
//   loop is DRIVEN FROM THE UI on two REAL cross-identity daemons, and the surplus a
//   node holds above its ceiling is DIRECTED to a below-floor dependent and CROSSES the
//   boundary to that dependent as an attributed flow outcome.
// @covers flow-funding whole-loop UI (src/packages/flow-funding/ui/flow-tab.js,
//   src/packages/flow-funding/ui/flow-surfaces.js) + epoch-settle
//   (src/packages/flow-funding/handlers/epoch-settle.ts) +
//   src/packages/flow-funding/handlers/agreement.ts (agreement_accept via the UI) +
//   src/packages/flow-funding/sharing/flow-domain.ts (the cross-boundary flow_outcome)
// @flow-description two REAL cross-identity daemons (founder=payer w/ browser,
//   invitee-a=payee w/ browser), real peer-pair (withDevices friendship ceremony) →
//   payer UI: arm a FlowPolicy on a REAL context (Save gesture) → payer UI: propose a
//   flow agreement to the payee → payee UI: ACCEPT it (real [data-testid] pointer click)
//   → agreement folds `active` on BOTH daemons → payer opts into flow-funding
//   transparency toward the payee (the user's sharing decision) → payer UI: SETTLE THE
//   EPOCH (real #flow-settle-btn click) so surplus above the ceiling is allocated to the
//   below-floor claimant → the payer's flow_settlement allocation names the payee, and
//   the payee's daemon materializes a cross-boundary `flow_outcome` node ATTRIBUTED to
//   the payer (peer_did == payer) which the payee's Flow UI renders as "Received".
// @owns-surface flow-funding whole loop
// @mechanism-asserted the star loop is drivable end-to-end FROM THE UI on 2 real daemons:
//   (1) accept flips the agreement to `active` on BOTH daemons (bilateral fold, not a
//   one-sided flip); (2) the UI settle commits a flow_settlement whose allocation NAMES
//   the payee with amount>0 (surplus DIRECTED to the dependent, read on the payer daemon);
//   (3) a `flow_outcome` node ATTRIBUTED to the payer (peer_did) crosses to the SEPARATE
//   payee daemon and the payee's Flow UI renders it as "Received". Real-pointer gestures
//   only; the cross-boundary receipt is witnessed on the payee's own daemon, never seeded.
// @bypasses action-approval=owner-credential-auto-grant (owner-tier writes only),
//   db-unlock=fixture-password, identity=pre-onboarded (founder + invitee-a fixtures),
//   cross-browser-identity=puppeteer-fresh-context, iroh-mdns-disabled, kronos-disabled.
//   NO NAOMS_NO_AUTH, NO NAOMS_TEST_MODE, NO pre-seed of the settlement / flow_outcome
//   under test.
// @canonical-flow YES
// @pre-seeds NONE — the policy, agreement, acceptance, settlement, and cross-boundary
//   flow_outcome are all produced by real UI gestures / real op write paths; no
//   flow_policy / flow_agreement / flow_settlement / flow_outcome row is seeded.
// @cross-identity 2-daemon, real-pointer (HC-09) — NOT env-gated (HC-C5): runs by default.
// === END HEADER ===
//
// 1644 COMPLETION C6/G5 — the whole-loop narrative (original frozen-plan M7, the STAR:
// "What if money knew when to keep moving … so no node hoards while a dependent goes
// without?"). This is the capstone that drives EVERY MVP intent end-to-end from the UI.
//
// ── WHY THE WITNESS IS `flow_outcome`, NOT `flow_settlement` (critic B-1) ──────────────
// The prior version of this file polled the PAYEE daemon for a `flow_settlement` node.
// That node is single-writer / holon-local: `sharing/flow-domain.ts` declares
// `triggerKinds:["flow_settlement"], readTypes:["flow_settlement"],
// writesNodeTypes:["flow_outcome"]`, and the receive side (flow-domain.ts materialize)
// projects a peer's shared outcome into a LOCAL `flow_outcome`. `flow_settlement` never
// crosses the boundary, so the old assertion could never go GREEN even after every C-row
// landed. This version witnesses the node that DOES cross — the payee's `flow_outcome`,
// attributed to the payer via `peer_did` — plus the payer-side allocation that names the
// payee (proof the surplus was DIRECTED to the dependent), and drives the C3 ACCEPT
// gesture the C6 contract requires (previously skipped).
//
// ── WALLET-RECEIPT TERMINAL — now UI-driven end-to-end (gap CLOSED) ────────────────────
// The frozen C6 contract also asks the payee's WALLET to render "received N from <payer>
// · flow settlement". That row is real (token/ui/wallet-activity.js buildRow) and moves
// REAL token value ONLY when the FlowPolicy carries an armed delegation root; policy-set.ts
// arms that root ONLY when `params.automatedSettlementCap > 0`. This USED to be an
// UI-unreachable gap (savePolicy never sent the cap, no UI field existed) — so an earlier
// version of this capstone terminated at the cross-boundary flow_outcome + "Received" card
// and left the wallet terminal to the CLI-armed wallet-receipt test. The completion added
// a real Policy-surface affordance (#automatedSettlementCap → savePolicy sends it →
// policy-set.ts mints the delegation root). This capstone now ARMS the cap FROM THE UI
// (not CLI — the "driven from the UI" claim stays honest) so the UI settle moves value and
// the capstone asserts the payee WALLET row attributing the receipt to the payer. The
// stand-alone CLI-armed wallet-receipt test remains as the isolated backend witness.
//
// EXPECTED-RED-ON-MAC (run env): the canonical 2-daemon real-browser E2Es carry an
// EXPECTED-RED-ON-MAC note (see e2e-flow-funding-agreement-accept-ui.test.ts +
// M-1494-M25) — Mac iroh co-tenancy with sibling claude / rustc / git starves the
// cross-peer replication setup. Authored + intended to run GREEN on Kronos / gpu-host;
// on this Mac it is expected to fail at the cross-peer REPLICATION step (proposed→payee
// or flow_outcome→payee), NOT at a wrong-node / wrong-selector bug. Full 2-daemon GREEN
// pending Kronos.
//
// Run (build-host / gpu-host — NOT MBP for a GREEN pass):
//   NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release \
//     deno test -A --no-check --unstable-sloppy-imports --config <repoRoot>/deno.json \
//     src/packages/flow-funding/tests/e2e-flow-funding-narrative.test.ts

import { assert, assertEquals } from "jsr:@std/assert";
import { withNDaemonNBrowser } from "../../../../tests/helpers/n-daemon-n-browser.ts";
import { wsSend } from "../../../../tests/helpers/shared-harness.ts";

const NAOMS_ROOT = new URL("../../../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);

// The holon-local self-context the wired Policy surface defaults to after C1
// removed the fabricated "awip" literal (matches e2e-flow-funding-settle-from-ui).
const CONTEXT = "personal";
// The flow-funding sharing domain key (flow-domain.ts `domain`). The payer's
// transparency decision opts this in toward the payee so the settle reshares.
const FLOW_DOMAIN = "sharing.flow-funding";
// A viability band whose ceiling the payer's balance crosses → surplus flows out.
const FLOOR = 100;
const CEILING = 500;
const EPOCH_BALANCE = 700; // above CEILING → real surplus for the dependent.
// The owner-signed absolute ceiling that ARMS the delegation root (policy-set.ts
// mints it only when automatedSettlementCap > 0). Set from the UI (the affordance
// added for the completion) so the UI-driven settle moves REAL token value — the
// payee wallet receipt terminal below depends on it. > the ~200 surplus directed.
const AUTOMATED_CAP = 1000;

const SR = { sanitizeResources: false, sanitizeOps: false } as const;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Parse a flow_settlement node's `allocations` (native array OR JSON string). */
function parseAllocations(
  raw: unknown,
): Array<{ id: string; amount: number }> {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: Array<{ id: string; amount: number }> = [];
  for (const a of arr) {
    const o = (a ?? {}) as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (id) out.push({ id, amount: Number(o.amount ?? 0) });
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function graphNodes(
  ws: WebSocket,
  type: string,
  where?: Record<string, unknown>,
): Promise<Array<{ id?: string; properties?: Record<string, unknown> }>> {
  const resp = await wsSend(ws, {
    type: "graph.query",
    pattern: { type, ...(where ? { where } : {}), limit: 200 },
  }) as { nodes?: Array<{ id?: string; properties?: Record<string, unknown> }> };
  return resp.nodes ?? [];
}

Deno.test({
  ...SR,
  name:
    "1644 C6/G5 [narrative, 2-daemon] the STAR: arm policy → propose+ACCEPT a flow → " +
    "settle from the UI → surplus is DIRECTED to the below-floor dependent and CROSSES " +
    "to the payee as an attributed flow_outcome",
  fn: async () => {
    if (!Deno.env.get("NAOMS_FFI_LIB_PATH")) {
      Deno.env.set("NAOMS_FFI_LIB_PATH", `${NAOMS_ROOT}/rust/target/release`);
    }

    await withNDaemonNBrowser(
      {
        // Two REAL cross-identity daemons + one real browser each. invitee-a is a
        // real peer (a real active friendship = a real below-floor dependent) —
        // the same real-claimant sourcing Agent A used for the settle test, here
        // realized as a LIVE second daemon so the flow_outcome actually crosses.
        groups: [
          { identity: "founder", devices: 1 }, // 0 = payer
          { identity: "invitee-a", devices: 1 }, // 1 = payee (dependent)
        ],
        peerPairAcrossGroups: true,
        headless: true,
        auth: true, // real first-launch / vault-unlock so _naomsFeatures populate
        convergenceTimeoutMs: 60_000,
      },
      async (ctx) => {
        const [a, b] = ctx.devices.allHandles; // a=payer, b=payee
        const payerB = ctx.browsers[0];
        const payeeB = ctx.browsers[1];
        assert(a.ws && b.ws, "both daemons have an authenticated WS");
        assert(payerB && payeeB, "both browsers present");
        const payerDid = a.ownerDid!;
        const payeeDid = b.ownerDid!;
        assert(
          payerDid && payeeDid && payerDid !== payeeDid,
          `two DISTINCT peer identities required — payer=${payerDid} payee=${payeeDid}`,
        );
        const fcId = ctx.devices.friendshipChainIds["0-1"];
        assert(
          typeof fcId === "string" && fcId.startsWith("fc-"),
          `real peer-pair friendship chain required — got ${fcId}`,
        );
        console.error(
          `[1644-m7] payer=${payerDid} payee=${payeeDid} fc=${fcId.slice(0, 14)}`,
        );

        // ── (1) Payer UI: open Flow Funding, arm a FlowPolicy via the Save gesture. ──
        await payerB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          if (!w._naoms || typeof w._naoms.activateApp !== "function") {
            throw new Error("_naoms.activateApp not exposed — shell init incomplete");
          }
          await w._naoms.activateApp("flow-funding");
        });
        await payerB.page.waitForFunction(
          () => !!document.querySelector("#flow-policy #floorInput"),
          { timeout: 30_000 },
        );
        await payerB.page.evaluate(
          (floor: number, ceiling: number, cap: number) => {
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
            // Arm the delegation root FROM THE UI so the settle moves real value.
            set("automatedSettlementCap", String(cap));
            const saveBtn = Array.from(
              document.querySelectorAll("#flow-policy .action-bar .btn.p"),
            )[0] as HTMLButtonElement | undefined;
            if (!saveBtn) throw new Error("Save policy button not found");
            saveBtn.click();
          },
          FLOOR,
          CEILING,
          AUTOMATED_CAP,
        );
        // Confirm the band armed on the payer daemon before proceeding.
        {
          let armed = false;
          for (let i = 0; i < 40; i++) {
            const p = await wsSend(a.ws!, {
              type: "flow.get_policy",
              context: CONTEXT,
              tokenKind: "custom",
            }) as { found?: boolean };
            if (p.found === true) {
              armed = true;
              break;
            }
            await delay(250);
          }
          assert(armed, "policy did not arm on the payer daemon after the UI Save");
        }
        console.error("[1644-m7] policy armed from the UI");

        // ── (2) Payer UI: propose a flow agreement to the payee. ──
        await payerB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          if (typeof w.__flowShowSurface === "function") {
            w.__flowShowSurface("agreement");
          }
        });
        await payerB.page.waitForFunction(
          () => !!document.querySelector("#flow-agreement #flowAgreementCounterparty"),
          { timeout: 30_000 },
        );
        await payerB.page.evaluate((counterparty: string) => {
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
        // Read the proposed agreement id back off the payer daemon (a real graph
        // read of the UI's write — not a shortcut for the gesture).
        let agreementId = "";
        for (let i = 0; i < 60; i++) {
          const nodes = await graphNodes(a.ws!, "flow_agreement");
          const mine = nodes
            .map((n) => n.properties ?? {})
            .find((p) =>
              p.proposer === payerDid && p.counterparty === payeeDid &&
              typeof p.agreementId === "string"
            );
          if (mine) {
            agreementId = String(mine.agreementId);
            break;
          }
          await delay(500);
        }
        assert(agreementId, "UI propose did not commit a flow_agreement on the payer");
        console.error(`[1644-m7] agreement proposed from the UI: ${agreementId}`);

        // ── (3) Proposed lane must REPLICATE to the payee before its UI can render it.
        //        (On this Mac this is the first likely EXPECTED-RED-ON-MAC point.) ──
        {
          let seen = false;
          for (let i = 0; i < 80; i++) {
            const r = await wsSend(b.ws!, {
              type: "flow.get_agreement",
              agreementId,
            }) as { found?: boolean; proposer?: string };
            if (r.found === true && r.proposer === payerDid) {
              seen = true;
              break;
            }
            await delay(500);
          }
          assert(
            seen,
            `[replication] proposed agreement ${agreementId} did not replicate to the ` +
              `payee within 40s — cross-peer setup (EXPECTED-RED-ON-MAC; GREEN on Kronos)`,
          );
        }

        // ── (4) Payee UI: open Flow Funding, view Flow, ACCEPT via the real control. ──
        await payeeB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          await w._naoms.activateApp("flow-funding");
        });
        await payeeB.page.waitForFunction(
          () =>
            typeof (window as { __flowShowSurface?: unknown }).__flowShowSurface ===
              "function",
          { timeout: 30_000 },
        );
        await payeeB.page.evaluate(() => {
          (window as unknown as { __flowShowSurface: (n: string) => void })
            .__flowShowSurface("velocity");
        });
        // The incoming proposal must surface the real accept control (C3/G4).
        const acceptEl = await payeeB.page.waitForSelector(
          '[data-testid="flow-agreement-accept"]',
          { timeout: 30_000 },
        ).catch(() => null);
        assert(
          acceptEl,
          `no accept control surfaced on the payee for incoming proposal ${agreementId}`,
        );
        await payeeB.page.click('[data-testid="flow-agreement-accept"]');
        console.error("[1644-m7] payee ACCEPTED the agreement from the UI");

        // Bilateral fold: `active` on BOTH daemons (a one-sided flip cannot pass).
        for (const [label, ws] of [["payee", b.ws!], ["payer", a.ws!]] as const) {
          let active = false;
          for (let i = 0; i < 80; i++) {
            const r = await wsSend(ws, {
              type: "flow.get_agreement",
              agreementId,
            }) as { status?: string };
            if (r.status === "active") {
              active = true;
              break;
            }
            await delay(500);
          }
          assert(
            active,
            `[replication] agreement ${agreementId} did not fold active on the ${label} ` +
              `within 40s (EXPECTED-RED-ON-MAC; GREEN on Kronos)`,
          );
        }
        console.error("[1644-m7] agreement is ACTIVE on both daemons");

        // ── (5) Payer's transparency decision: opt flow-funding into `detailed` toward
        //        the payee so the post-settle reshare crosses. This is the user's
        //        sharing decision (UI home: sharing-decision-modal.js); driven here
        //        over WS as a documented precondition, not the state under test. The
        //        sharing domain defaults to `off` (flow-domain.ts defaultLevel). ──
        {
          const resp = await wsSend(a.ws!, {
            type: "sharing.apply_decisions",
            connectionId: fcId,
            peerDid: payeeDid,
            chainId: fcId,
            decisions: { [FLOW_DOMAIN]: "detailed" },
          }) as { ok?: boolean; error?: string };
          assert(
            resp.ok === true,
            `payer flow-funding transparency opt-in failed: ${
              resp.error ?? JSON.stringify(resp)
            }`,
          );
          await delay(1500); // let the opt-in reshare + suppress window drain
        }
        console.error("[1644-m7] payer opted flow-funding transparency=detailed → payee");

        // ── (6) Payer UI: SETTLE THE EPOCH. The claimant is sourced from the now-active
        //        agreement counterparty (deriveClaimants); surplus above the ceiling is
        //        allocated to the below-floor dependent. ──
        await payerB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          if (typeof w.__flowShowSurface === "function") {
            w.__flowShowSurface("velocity");
          }
        });
        // The settle affordance (Velocity surface). RED-first witness on main was its
        // absence; here it MUST be present (C2/G3 landed).
        const settleBtn = await payerB.page.waitForSelector(
          "#flow-app #flow-settle-btn, #flow-app [data-flow-settle], " +
            "#flow-app [data-flow-action='settle']",
          { timeout: 30_000 },
        ).catch(() => null);
        assert(
          settleBtn,
          "C2/G3: the Flow UI exposes NO epoch-settle gesture — the star loop cannot be " +
            "driven from the interface",
        );
        await payerB.page.evaluate((bal: number) => {
          const el = document.querySelector(
            "#flow-velocity #settleBalance, #flow-app #settleBalance",
          ) as HTMLInputElement | null;
          if (!el) throw new Error("settle balance input not found");
          el.value = String(bal);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, EPOCH_BALANCE);
        await payerB.page.click(
          "#flow-app #flow-settle-btn, #flow-app [data-flow-settle], " +
            "#flow-app [data-flow-action='settle']",
        );
        console.error("[1644-m7] epoch settled from the UI");

        // ── (7a) Payer-side witness: the settlement DIRECTED surplus to the payee —
        //         a flow_settlement whose allocation names the payee with amount>0. ──
        let directed: { id: string; amount: number } | null = null;
        for (let i = 0; i < 40; i++) {
          const nodes = await graphNodes(a.ws!, "flow_settlement");
          for (const n of nodes) {
            const p = n.properties ?? {};
            if (Number(p.settledTotal ?? 0) <= 0) continue;
            const alloc = parseAllocations(p.allocations)
              .find((x) => x.id === payeeDid && x.amount > 0);
            if (alloc) {
              directed = alloc;
              break;
            }
          }
          if (directed) break;
          await delay(500);
        }
        assert(
          directed,
          "the UI settle did not DIRECT surplus to the below-floor dependent — no " +
            `flow_settlement allocates amount>0 to the payee (${payeeDid.slice(0, 16)}…)`,
        );
        console.error(
          `[1644-m7] surplus DIRECTED to payee: ${directed!.amount} (payer allocation)`,
        );

        // ── (7b) TERMINAL cross-boundary witness: a `flow_outcome` node ATTRIBUTED to
        //         the payer crosses to the SEPARATE payee daemon (peer_did == payer,
        //         total_flowed>0), and the payee's Flow UI renders it as "Received".
        //         (Second likely EXPECTED-RED-ON-MAC point: cross-peer reshare.) ──
        let crossed: Record<string, unknown> | null = null;
        for (let i = 0; i < 80; i++) {
          const nodes = await graphNodes(b.ws!, "flow_outcome");
          const hit = nodes
            .map((n) => n.properties ?? {})
            .find((p) =>
              p.source === "received" && p.peer_did === payerDid &&
              Number(p.total_flowed ?? 0) > 0
            );
          if (hit) {
            crossed = hit;
            break;
          }
          await delay(500);
        }
        assert(
          crossed,
          `[replication] the payer's flow outcome did not CROSS to the payee as an ` +
            `attributed flow_outcome (peer_did==payer, total_flowed>0) within 40s ` +
            `(EXPECTED-RED-ON-MAC; GREEN on Kronos)`,
        );
        console.error(
          `[1644-m7] flow_outcome CROSSED to payee, attributed to payer: ` +
            `total_flowed=${crossed!.total_flowed}`,
        );

        // The payee's Flow UI must SURFACE the received outcome (real UI witness, not a
        // window.__ read): the Velocity surface renders a "Received" aggregate card.
        await payeeB.page.evaluate(() => {
          (window as unknown as { __flowShowSurface: (n: string) => void })
            .__flowShowSurface("velocity");
        });
        let uiReceived = false;
        for (let i = 0; i < 30; i++) {
          uiReceived = await payeeB.page.evaluate(() => {
            const rc = document.querySelector("#flow-velocity #riverContent, #flow-app #riverContent");
            const txt = (rc?.textContent || "");
            // "Received" simCard label present with a non-zero value beside it.
            return /Received/i.test(txt) && !/Received[^0-9]*0\b/i.test(txt);
          });
          if (uiReceived) break;
          await delay(500);
        }
        assert(
          uiReceived,
          "the payee's Flow UI did not render the cross-boundary receipt as a non-zero " +
            "'Received' card after the flow_outcome crossed",
        );

        // Sanity: the amount the payer directed equals what the payee saw flow (single
        // epoch, single claimant → the shared aggregate equals the directed allocation).
        assertEquals(
          Number(crossed!.total_flowed),
          directed!.amount,
          "the crossed flow_outcome total must equal the surplus the payer directed",
        );
        console.error(
          "[1644-m7] STAR loop closed from the UI: policy → propose → ACCEPT → settle → " +
            "surplus DIRECTED to the dependent → attributed flow_outcome CROSSED + shown.",
        );

        // ── CAPSTONE TERMINAL: the payee WALLET shows the received value ATTRIBUTED
        // to the payer — the owner's core requirement ("see tokens arrive from
        // another"), now reachable because the UI armed the delegation root via the
        // automatedSettlementCap affordance (set above). Because the policy carries
        // an armed root, epoch-settle.ts moveSettlementValue fires a real cross-device
        // token.pay carrying the flow-settle: memo, so the row can render. Mirrors
        // e2e-flow-funding-wallet-receipt.test.ts, but the delegation is UI-armed here.
        const directedAmt = directed!.amount;
        await payeeB.page.evaluate(async () => {
          // deno-lint-ignore no-explicit-any
          const w = window as any;
          if (!w._naoms || typeof w._naoms.activateApp !== "function") {
            throw new Error("_naoms.activateApp not exposed");
          }
          await w._naoms.activateApp("token");
        });
        let walletUp = false;
        for (let i = 0; i < 60; i++) {
          walletUp = await payeeB.page.evaluate(
            () => !!document.querySelector('[data-feature="wallet"]'),
          );
          if (walletUp) break;
          await delay(500);
        }
        assert(walletUp, "payee wallet did not mount for the capstone terminal");
        await delay(2000);
        await payeeB.page.evaluate(async () => {
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
          feedUp = await payeeB.page.evaluate(
            () => !!document.querySelector("[data-wallet-activity]"),
          );
          if (feedUp) break;
          await delay(500);
        }
        assert(feedUp, "payee Activity feed did not mount for the capstone terminal");
        await delay(2000);
        const feed = await payeeB.page.evaluate(() => {
          const root = document.querySelector("[data-wallet-activity]");
          const rows = Array.from(
            document.querySelectorAll(".wallet-activity__row"),
          ).map((r) => (r.textContent || "").trim());
          return { text: (root?.textContent || "").trim(), rows };
        });
        console.error(
          `[1644-m7] payee wallet Activity rows: ${JSON.stringify(feed.rows)}`,
        );
        const payerShort = payerDid.replace(/^did:[a-z]+:/, "").slice(0, 12);
        const feedHay = feed.text.toLowerCase();
        const walletAttributes =
          feedHay.includes(payerDid.toLowerCase()) ||
          (payerShort.length >= 6 &&
            feedHay.includes(payerShort.toLowerCase())) ||
          (/(from|received from)/.test(feedHay) &&
            feed.text.replace(/[^0-9]/g, " ").includes(String(directedAmt)));
        assert(
          walletAttributes,
          `[capstone] after the UI-armed, UI-driven settle moved +${directedAmt} to the ` +
            `payee, the payee wallet Activity feed does NOT attribute it to the payer ` +
            `(${payerDid}). If the credit itself never landed this is EXPECTED-RED-ON-MAC ` +
            `(iroh co-tenancy; GREEN on Kronos). Feed rows seen: ` +
            `${JSON.stringify(feed.rows)}.`,
        );
        console.error(
          "[1644-m7] CAPSTONE: payee WALLET row attributes the received value to the payer " +
            "— the full star loop is UI-driven AND wallet-visible.",
        );
      },
    );
  },
});
