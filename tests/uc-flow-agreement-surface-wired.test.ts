// src/packages/flow-funding/tests/uc-flow-agreement-surface-wired.test.ts
//
// 1644 M6.2 — the Agreement surface mounts the mock's OWN renderer fed real data.
//
// Loads the generated mock module (window.__flowMockSurfaces) then flow-tab.js
// into a deno-dom Window, switches to the Agreement surface, and asserts the
// wired contract under a stubbed FeatureContext:
//   - mounting the surface injects a real counterparty field (the mock's "@jay"
//     party has no DID source) and drops the synthetic party row.
//   - Create dispatches ctx.api.agreement_propose with {counterparty, terms}
//     where terms.formality is the dial in [0,1] and terms.tier is derived.
//   - the fabricated "how this would have executed" preview is stripped.
//
// Runner: deno test --allow-read --no-check <path>
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (wired Agreement surface)
// @bypasses daemon=skipped, ws-server=stub-ctx-api (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the UI ↔ flow.* op contract: the wired
//   Agreement surface MUST dispatch ctx.api.agreement_propose with the correct
//   counterparty + terms (formality in [0,1], a valid tier). The real WS handler
//   + bilateral friendship-chain round-trip are covered by
//   integ-flow-agreement-bilateral (real daemons). daemon/ws-server are stubbed
//   because the server path is not what this tier asserts; no agreement state is
//   pre-seeded — the surface reads only what the stubbed ctx returns.
// @canonical-flow YES
// === END HEADER ===

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
// deno-lint-ignore no-explicit-any
type AnyDoc = any;
// deno-lint-ignore no-explicit-any
type AnyEl = any;
import { DOMParser } from "jsr:@b-fuze/deno-dom";

const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
const TAB_PATH = `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-tab.js`;
const MOCK_PATH = `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-mock.js`;

function ensureStyleShim(doc: AnyDoc): void {
  // deno-lint-ignore no-explicit-any
  const docAny = doc as any;
  if (docAny.__styleShimmed) return;
  const orig = docAny.createElement.bind(doc);
  docAny.createElement = (tagName: string) => {
    const el = orig(tagName);
    if (!el.style) (el as AnyEl).style = { cssText: "", setProperty() {} };
    return el;
  };
  for (const el of doc.querySelectorAll("*")) {
    if (!(el as AnyEl).style) {
      (el as AnyEl).style = { cssText: "", setProperty() {} };
    }
  }
  docAny.__styleShimmed = true;
}

interface ApiCalls {
  propose: Array<Record<string, unknown>>;
}

function buildEnv() {
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
  return { doc, container, win };
}

async function evalInto(
  env: { doc: AnyDoc; win: Record<string, unknown> },
  path: string,
): Promise<void> {
  const src = await Deno.readTextFile(path);
  const fn = new Function("window", "document", src);
  fn(env.win, env.doc);
}

async function mountAgreement(): Promise<{
  win: Record<string, unknown>;
  doc: AnyDoc;
  calls: ApiCalls;
}> {
  const env = buildEnv();
  await evalInto(env, MOCK_PATH);
  await evalInto(env, TAB_PATH);

  const calls: ApiCalls = { propose: [] };
  const api = {
    get_policy: () => Promise.resolve({ ok: true, found: false }),
    policy_set: () => Promise.resolve({ ok: true, version: 1 }),
    agreement_propose: (p: Record<string, unknown>) => {
      calls.propose.push(p);
      return Promise.resolve({ ok: true, agreementId: "flow-agreement-x" });
    },
  };
  // deno-lint-ignore no-explicit-any
  const feature = (env.win._naomsFeatures as any)["flow-funding"];
  feature.init({ container: env.container, api });
  feature.activate();
  await new Promise((r) => setTimeout(r, 0));
  // switch to the Agreement surface via the exposed nav hook
  // deno-lint-ignore no-explicit-any
  (env.win as any).__flowShowSurface("agreement");
  return { win: env.win, doc: env.doc, calls };
}

Deno.test("M6.2 source contract: flow-tab.js wires agreement_propose + reuses the agreement renderer", async () => {
  const src = await Deno.readTextFile(TAB_PATH);
  assert(
    src.includes("ctx.api.agreement_propose"),
    "proposes via ctx.api.agreement_propose",
  );
  assert(
    src.includes("__flowMockSurfaces.agreement"),
    "mounts the mock's OWN agreement renderer",
  );
  assert(
    /formalityToTier/.test(src),
    "derives a valid FlowAgreementTier from the formality dial",
  );
});

Deno.test("M6.2 mount: Agreement surface injects a real counterparty field", async () => {
  const { doc } = await mountAgreement();
  assert(
    doc.querySelector("#flow-mock-agreement"),
    "agreement surface mounted from the mock renderer",
  );
  assert(
    doc.querySelector("#flow-mock-agreement #flowAgreementCounterparty"),
    "a real counterparty field is injected (mock had only a fixed @jay)",
  );
  // the fabricated execution preview is removed (no synthetic-as-real)
  assertEquals(
    doc.querySelector("#flow-mock-agreement .sim-preview"),
    null,
    "synthetic 'how this would have executed' preview stripped",
  );
});

Deno.test("M6.2 create: Create dispatches agreement_propose with counterparty + terms{formality,tier}", async () => {
  const { win, doc, calls } = await mountAgreement();
  const cp = doc.querySelector(
    "#flow-mock-agreement #flowAgreementCounterparty",
  ) as AnyEl;
  cp.value = "did:key:zPeer";
  const dial = doc.querySelector("#flow-mock-agreement #formalityDial") as AnyEl;
  dial.value = "30"; // 0.30 → "channel"
  // deno-lint-ignore no-explicit-any
  await (win as any).handleCreate();

  assertEquals(calls.propose.length, 1, "agreement_propose dispatched once");
  const sent = calls.propose[0];
  assertEquals(sent.counterparty, "did:key:zPeer", "counterparty carried");
  const terms = sent.terms as Record<string, unknown>;
  assertEquals(terms.formality, 0.3, "dial mapped to formality in [0,1]");
  assertEquals(terms.tier, "channel", "tier derived from the dial position");
});

Deno.test("M6.2 create: missing counterparty does NOT dispatch (loud, no silent propose)", async () => {
  const { win, calls } = await mountAgreement();
  // deno-lint-ignore no-explicit-any
  await (win as any).handleCreate();
  assertEquals(
    calls.propose.length,
    0,
    "no propose without a counterparty (refuses loud)",
  );
});
