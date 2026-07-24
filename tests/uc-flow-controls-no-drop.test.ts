// src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts
//
// 1644 COMPLETION C5 (closes G6–G10) — NO INERT CONTROL (HC-C2).
//
// Every control the Flow surfaces render must either PERSIST its value to a
// real op OR be removed from the DOM. A control that collects input and
// silently drops it is banned (Honesty axiom: no silent drops).
//
// This is a RED-FIRST test authored against origin/main (e7d20737015) where the
// following controls render as functional but drop their value before the op:
//   G6 felt-threshold toggle  — flow-tab.js:265-270 (toggleFelt = status stub)
//   G7 commons-tithe slider   — flow-surfaces.js:177-181 (oninput → label only)
//   G8 policy transparency     — flow-surfaces.js:188-191 (name="transp", never read)
//   G9 contributor-tier grid   — flow-tab.js:716-722 (selectTier = class toggle only)
//   G9 duration control        — flow-tab.js:723-731 (selectDur = class toggle only)
//
// CONTRACT (written so BOTH resolutions of HC-C2 satisfy it):
//   control-present-in-DOM  ⇒  its value round-trips into the op payload.
// So after impl each control EITHER persists (payload carries it) OR is removed
// from the DOM (the antecedent is false and the test is vacuously satisfied).
//
// On main every control is still present AND dropped → each assertion FAILS.
//
// Runner:
//   NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release \
//     deno test -A --no-check --unstable-sloppy-imports --config <repo>/deno.json \
//     src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (control → op payload wiring)
// @covers src/packages/flow-funding/ui/flow-surfaces.js (felt/tithe/transparency/tier/duration controls)
// @bypasses daemon=skipped, ws-server=stub-ctx-api (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the UI-control → flow.* op-payload
//   contract. Each control is driven via its REAL exposed handler
//   (toggleFelt / savePolicy / selectTier / selectDur / handleCreate) mounted
//   from the REAL production markup (flow-surfaces.js) into a deno-dom Window,
//   and the assertion reads the payload the surface would send to the real op.
//   The daemon/WS path is not the subject — whether policy_set / agreement_
//   propose is actually dispatched over the wire is covered by
//   integ-flow-policy-set-and-read / integ-flow-agreement-bilateral. No flow
//   state is pre-seeded; the surface reads only the stubbed ctx it is given.
//   The contract is deliberately satisfiable by REMOVING a control from the DOM,
//   so a build-crew that deletes an unbacked control (rather than wiring it)
//   still turns this GREEN — it forbids only the silent-drop middle ground.
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
const SURFACES_PATH =
  `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-surfaces.js`;

function ensureStyleShim(doc: AnyDoc): void {
  // deno-lint-ignore no-explicit-any
  const docAny = doc as any;
  if (docAny.__styleShimmed) return;
  const orig = docAny.createElement.bind(doc);
  docAny.createElement = (tagName: string) => {
    const el = orig(tagName);
    if (!el.style) {
      (el as AnyEl).style = { cssText: "", setProperty() {} };
    }
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
  get: Array<Record<string, unknown>>;
  set: Array<Record<string, unknown>>;
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

/** Mount the feature down the real (non-mock) path with a spy ctx.api. */
async function mount(): Promise<{
  win: Record<string, unknown>;
  doc: AnyDoc;
  calls: ApiCalls;
}> {
  const env = buildEnv();
  await evalInto(env, SURFACES_PATH);
  await evalInto(env, TAB_PATH);

  const calls: ApiCalls = { get: [], set: [], propose: [] };
  const api = {
    get_policy: (p: Record<string, unknown>) => {
      calls.get.push(p);
      return Promise.resolve({ ok: true, found: false });
    },
    policy_set: (p: Record<string, unknown>) => {
      calls.set.push(p);
      return Promise.resolve({ ok: true, version: 1 });
    },
    agreement_propose: (p: Record<string, unknown>) => {
      calls.propose.push(p);
      return Promise.resolve({ ok: true, agreementId: "flow-agreement-x" });
    },
  };
  // deno-lint-ignore no-explicit-any
  const feature = (env.win._naomsFeatures as any)["flow-funding"];
  assert(feature, "flow-funding feature registered");
  feature.init({ container: env.container, api });
  feature.activate();
  // flush the get_policy .then so the Policy surface finishes loading
  await new Promise((r) => setTimeout(r, 0));
  return { win: env.win, doc: env.doc, calls };
}

// ── deep-search helpers (impl-name tolerant round-trip assertions) ──────────

/** True if any key name anywhere in the object tree matches `re`. */
function deepHasKey(obj: unknown, re: RegExp): boolean {
  if (obj == null || typeof obj !== "object") return false;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (re.test(k)) return true;
    if (deepHasKey(v, re)) return true;
  }
  return false;
}

/**
 * True if any primitive value anywhere in the tree, stringified + lowercased,
 * contains `needle` (also lowercased). Used to prove a distinctive selected
 * value (e.g. "active", "1y", "7") actually reached the payload.
 */
function deepHasValue(obj: unknown, needle: string): boolean {
  const n = needle.toLowerCase();
  const walk = (v: unknown): boolean => {
    if (v == null) return false;
    if (typeof v === "object") {
      return Object.values(v as Record<string, unknown>).some(walk);
    }
    return String(v).toLowerCase().includes(n);
  };
  return walk(obj);
}

function setBand(doc: AnyDoc): void {
  // savePolicy() refuses to dispatch unless floor+ceiling are finite — set a
  // valid band so policy_set FIRES and we can inspect what it dropped.
  const floor = doc.querySelector("#flow-policy #floorInput") as AnyEl;
  const ceil = doc.querySelector("#flow-policy #ceilingInput") as AnyEl;
  assert(floor && ceil, "policy band inputs mounted from real markup");
  floor.value = "1000";
  ceil.value = "5000";
}

// ── G6 — felt-threshold toggle ──────────────────────────────────────────────

Deno.test("C5/G6: felt-threshold toggle — present ⇒ value persists to policy_set (not a status stub)", async () => {
  const { win, doc, calls } = await mount();
  setBand(doc);
  // Engage the felt toggle via its REAL handler (the only user action wired).
  // deno-lint-ignore no-explicit-any
  (win as any).toggleFelt();
  // deno-lint-ignore no-explicit-any
  await (win as any).savePolicy();

  assertEquals(calls.set.length, 1, "policy_set dispatched (band valid)");
  const params = calls.set[0].params as Record<string, unknown>;
  const feltPresent = !!doc.querySelector(
    "#flow-policy #feltToggle, #flow-policy .felt-toggle",
  );
  if (feltPresent) {
    assert(
      deepHasKey(params, /felt/i),
      "felt-threshold control is in the DOM but its state is NOT carried in " +
        "the policy_set params — HC-C2 silent drop (toggleFelt is a status stub)",
    );
  }
});

// ── G7 — commons-tithe slider ────────────────────────────────────────────────

Deno.test("C5/G7: commons-tithe slider — present ⇒ value round-trips into policy_set", async () => {
  const { win, doc, calls } = await mount();
  setBand(doc);
  const tithe = doc.querySelector(
    "#flow-policy .range-row input[type=range]",
  ) as AnyEl | null;
  if (tithe) tithe.value = "7"; // distinctive, != default "3"
  // deno-lint-ignore no-explicit-any
  await (win as any).savePolicy();

  assertEquals(calls.set.length, 1, "policy_set dispatched (band valid)");
  const params = calls.set[0].params as Record<string, unknown>;
  const tithePresent = !!tithe;
  if (tithePresent) {
    assert(
      deepHasKey(params, /tithe/i) && deepHasValue(params, "7"),
      "commons-tithe slider is in the DOM but its value (7) never reaches the " +
        "policy_set params — HC-C2 silent drop (oninput only updates a label)",
    );
  }
});

// ── G8 — policy transparency radios ──────────────────────────────────────────

Deno.test("C5/G8: policy transparency radios — present ⇒ selection round-trips into policy_set", async () => {
  const { win, doc, calls } = await mount();
  setBand(doc);
  // Select a NON-default transparency radio via the real DOM property.
  const radios = doc.querySelectorAll(
    '#flow-policy input[name="transp"]',
  ) as unknown as AnyEl[];
  const arr = Array.prototype.slice.call(radios) as AnyEl[];
  if (arr.length) {
    arr.forEach((r) => {
      r.checked = false;
      r.removeAttribute("checked");
    });
    // "Fully transparent" is the 3rd option in the real markup.
    const pick = arr[2] || arr[arr.length - 1];
    pick.checked = true;
    pick.setAttribute("checked", "");
  }
  // deno-lint-ignore no-explicit-any
  await (win as any).savePolicy();

  assertEquals(calls.set.length, 1, "policy_set dispatched (band valid)");
  const params = calls.set[0].params as Record<string, unknown>;
  const transpPresent = arr.length > 0;
  if (transpPresent) {
    assert(
      deepHasKey(params, /transp/i),
      'policy transparency radios (name="transp") are in the DOM but the ' +
        "selection never reaches the policy_set params — HC-C2 silent drop " +
        "(the radios are never read)",
    );
  }
});

// ── G9 — agreement contributor-tier grid ─────────────────────────────────────

Deno.test("C5/G9: agreement contributor-tier grid — present ⇒ selection round-trips into agreement_propose terms", async () => {
  const { win, doc, calls } = await mount();
  // deno-lint-ignore no-explicit-any
  (win as any).__flowShowSurface("agreement");

  const cp = doc.querySelector(
    "#flow-agreement #flowAgreementCounterparty",
  ) as AnyEl;
  assert(cp, "agreement counterparty field mounted");
  cp.value = "did:key:zPeer";
  const dial = doc.querySelector("#flow-agreement #formalityDial") as AnyEl;
  dial.value = "70"; // contract mode (>= 60) so the tier grid applies

  const tiers = Array.prototype.slice.call(
    doc.querySelectorAll("#flow-agreement .tier-opt"),
  ) as AnyEl[];
  const tierPresent = tiers.length > 0;
  if (tierPresent) {
    // Select "Active" (index 1) — a value distinct from the dial-derived
    // formality tier ("revenue-share" at 0.70), so a match proves the
    // CONTRIBUTOR tier reached the payload.
    // deno-lint-ignore no-explicit-any
    (win as any).selectTier(tiers[1] || tiers[0]);
  }
  // deno-lint-ignore no-explicit-any
  await (win as any).handleCreate();

  assertEquals(calls.propose.length, 1, "agreement_propose dispatched once");
  const terms = calls.propose[0].terms as Record<string, unknown>;
  if (tierPresent) {
    assert(
      deepHasValue(terms, "active"),
      "contributor-tier grid is in the DOM but the selected tier (Active) " +
        "never enters agreement_propose terms — HC-C2 silent drop " +
        "(selectTier only toggles a CSS class)",
    );
  }
});

// ── G9 — agreement duration control ──────────────────────────────────────────

Deno.test("C5/G9: agreement duration — present ⇒ selection round-trips into agreement_propose terms", async () => {
  const { win, doc, calls } = await mount();
  // deno-lint-ignore no-explicit-any
  (win as any).__flowShowSurface("agreement");

  const cp = doc.querySelector(
    "#flow-agreement #flowAgreementCounterparty",
  ) as AnyEl;
  assert(cp, "agreement counterparty field mounted");
  cp.value = "did:key:zPeer";
  const dial = doc.querySelector("#flow-agreement #formalityDial") as AnyEl;
  dial.value = "70";

  const durSeg = doc.querySelector("#flow-agreement #durSeg") as AnyEl | null;
  const durPresent = !!durSeg;
  if (durPresent) {
    const btns = Array.prototype.slice.call(
      durSeg.querySelectorAll("button"),
    ) as AnyEl[];
    // "1 year" is the 2nd button (value '1y') in the real markup.
    // deno-lint-ignore no-explicit-any
    (win as any).selectDur(btns[1] || btns[0], "1y");
  }
  // deno-lint-ignore no-explicit-any
  await (win as any).handleCreate();

  assertEquals(calls.propose.length, 1, "agreement_propose dispatched once");
  const terms = calls.propose[0].terms as Record<string, unknown>;
  if (durPresent) {
    assert(
      deepHasValue(terms, "1y"),
      "duration control is in the DOM but the selected duration (1y) never " +
        "enters agreement_propose terms — HC-C2 silent drop " +
        "(selectDur only toggles a CSS class)",
    );
  }
});
