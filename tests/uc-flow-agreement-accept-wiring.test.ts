// src/packages/flow-funding/tests/uc-flow-agreement-accept-wiring.test.ts
//
// 1644 COMPLETION C3 (closes G4) — runnable single-process PROOF of the
// accept-from-UI wiring. The canonical C3 witness is the 2-daemon real-browser
// e2e (e2e-flow-funding-agreement-accept-ui.test.ts), which proves the bilateral
// fold to `active` across two peers but is FLAKY on this Mac (iroh co-tenancy).
// This uc-tier test isolates the UI CONTRACT that test drives: an incoming
// `flow_agreement` proposal (proposed, self == counterparty) renders an Accept
// control carrying `[data-testid="flow-agreement-accept"]`, and clicking it
// calls `ctx.api.agreement_accept({agreementId})` with the proposal's id.
//
// It complements (does not replace) the 2-daemon fold test — the daemon-side
// bilateral `active` fold is out of scope here; the wiring is not.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (incoming-proposals render + accept wiring)
// @covers src/packages/flow-funding/ui/flow-surfaces.js (velocity surface host)
// @bypasses daemon=skipped, ws-server=stub-ctx-api (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the incoming-proposal → agreement_accept
//   op wiring. The velocity surface is mounted from the REAL production markup
//   (flow-surfaces.js) into a deno-dom Window with a spy ctx.api; the incoming
//   proposal is returned by a stubbed ctx.graphQuery (legitimate uc-tier input,
//   NOT the state under test — the accept CALL + payload is). The real bilateral
//   `active` fold is covered by the 2-daemon e2e sibling.
// @canonical-flow YES
// === END HEADER ===

import {
  assert,
  assertEquals,
} from "@std/assert";
import {
  ensureStyleShim,
  flowFeature,
  type ShimDoc as AnyDoc,
  type ShimEl as AnyEl,
  winFn,
} from "./_flow-ui-dom-shim.ts";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
const TAB_PATH = `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-tab.js`;
const SURFACES_PATH =
  `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-surfaces.js`;

const SELF = "did:key:zSelfAccepter";
const PEER = "did:key:zPeerProposer";
const AGREEMENT_ID = "flow-agreement-incoming-1";


async function evalInto(
  env: { doc: AnyDoc; win: Record<string, unknown> },
  path: string,
): Promise<void> {
  const src = await Deno.readTextFile(path);
  const fn = new Function("window", "document", src);
  fn(env.win, env.doc);
}

Deno.test("C3/G4: an incoming flow proposal renders an Accept control that calls agreement_accept({agreementId})", async () => {
  const doc = new DOMParser().parseFromString(
    "<!doctype html><html><head></head><body><div id='root'></div></body></html>",
    "text/html",
  );
  ensureStyleShim(doc);
  const container = doc.querySelector("#root") as AnyEl;
  const win: Record<string, unknown> = {
    _naomsFeatures: {},
    document: doc,
    __naomsBuild: "test",
    HTMLElement: (globalThis as Record<string, unknown>).HTMLElement ??
      function () {},
  };
  await evalInto({ doc, win }, SURFACES_PATH);
  await evalInto({ doc, win }, TAB_PATH);

  const acceptCalls: Array<Record<string, unknown>> = [];
  // Stub graph: one INCOMING proposal (proposed, self == counterparty).
  const graphQuery = (q: Record<string, unknown>) => {
    if (q.type === "flow_agreement") {
      return Promise.resolve({
        nodes: [{
          properties: {
            agreementId: AGREEMENT_ID,
            proposer: PEER,
            counterparty: SELF,
            status: "proposed",
          },
        }],
      });
    }
    return Promise.resolve({ nodes: [] });
  };
  const api = {
    get_policy: () => Promise.resolve({ ok: true, found: false }),
    policy_set: () => Promise.resolve({ ok: true, version: 1 }),
    agreement_accept: (p: Record<string, unknown>) => {
      acceptCalls.push(p);
      return Promise.resolve({ ok: true });
    },
  };
  const feature = flowFeature(win);
  assert(feature, "flow-funding feature registered");
  feature.init({ container, api, graphQuery, ownerDid: SELF });
  feature.activate();
  // flush loadContexts + mountWired microtasks
  await new Promise((r) => setTimeout(r, 0));

  // Show the Flow (velocity) surface where incoming proposals + accept live.
  winFn(win, "__flowShowSurface")("velocity");
  // flush loadVelocity graphQuery .then chain
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  const acceptEl = doc.querySelector(
    '#flow-velocity [data-testid="flow-agreement-accept"]',
  ) as AnyEl | null;
  assert(
    acceptEl,
    "incoming proposal did NOT render an accept control " +
      '([data-testid="flow-agreement-accept"]) — C3/G4 wiring absent',
  );
  assertEquals(
    acceptEl.getAttribute("data-agreement-id"),
    AGREEMENT_ID,
    "accept control must carry the incoming proposal's agreementId",
  );

  // Drive the accept via its real exposed handler and assert the op fired with
  // the right id (the same call the 2-daemon e2e makes via a real pointer click).
  await winFn(win, "agreementAccept")(AGREEMENT_ID);
  assertEquals(
    acceptCalls.length,
    1,
    "agreement_accept dispatched exactly once",
  );
  assertEquals(
    acceptCalls[0].agreementId,
    AGREEMENT_ID,
    "agreement_accept called with the incoming proposal's agreementId",
  );
});
