// src/packages/flow-funding/tests/uc-flow-simulation-surface-wired.test.ts
//
// 1644 M6.2 — the Simulation surface runs the REAL flow engine via flow.simulate
// and renders the real report (no fabricated results anywhere).
//
// flow.simulate is a dry-run over SYNTHETIC state by design (§6.5): the surface
// builds an illustrative 3-holon network as INPUT, calls ctx.api.simulate, and
// renders the engine's real report — never hard-coded history.
//
// Runner: deno test --allow-read --no-check <path>
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (wired Simulation surface)
// @bypasses daemon=skipped, ws-server=stub-ctx-api (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the UI ↔ flow.simulate contract: Run
//   dispatches ctx.api.simulate with a holons[] network + epochs, and the REAL
//   report (not synthetic numbers) is rendered. The engine itself is covered
//   by uc-flow-simulation + integ-flow-simulation-no-commit. daemon/ws-server are
//   stubbed; no state is pre-seeded.
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
  simulate: Array<Record<string, unknown>>;
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

const REPORT = {
  epochs: 3,
  totalFlowed: 1480,
  conserved: true,
  refusals: [],
  perHolon: [
    {
      id: "you",
      startBalance: 12000,
      accrued: 0,
      surplus: 1480,
      outflow: 1480,
      received: 0,
      endBalance: 10520,
    },
    {
      id: "peer-a",
      startBalance: 2000,
      accrued: 0,
      surplus: 0,
      outflow: 0,
      received: 900,
      endBalance: 2900,
    },
  ],
};

async function mountSimulate(): Promise<{
  win: Record<string, unknown>;
  doc: AnyDoc;
  calls: ApiCalls;
}> {
  const env = buildEnv();
  await evalInto(env, SURFACES_PATH);
  await evalInto(env, TAB_PATH);

  const calls: ApiCalls = { simulate: [] };
  const api = {
    get_policy: () => Promise.resolve({ ok: true, found: false }),
    policy_set: () => Promise.resolve({ ok: true, version: 1 }),
    simulate: (p: Record<string, unknown>) => {
      calls.simulate.push(p);
      return Promise.resolve({ ok: true, committed: false, report: REPORT });
    },
  };
  // deno-lint-ignore no-explicit-any
  const feature = (env.win._naomsFeatures as any)["flow-funding"];
  feature.init({ container: env.container, api });
  feature.activate();
  await new Promise((r) => setTimeout(r, 0));
  // deno-lint-ignore no-explicit-any
  (env.win as any).__flowShowSurface("simulate");
  return { win: env.win, doc: env.doc, calls };
}

Deno.test("M6.2-sim source contract: flow-tab.js wires flow.simulate + reuses the sim renderer", async () => {
  const src = await Deno.readTextFile(TAB_PATH);
  assert(src.includes("ctx.api.simulate"), "runs via ctx.api.simulate");
  assert(
    src.includes("__flowSurfaces.simulate"),
    "mounts the real simulate surface markup",
  );
  assert(src.includes("buildSimHolons"), "builds a synthetic holons[] network");
});

Deno.test("M6.2-sim mount: Simulation surface mounts from flow-surfaces.js", async () => {
  const { doc } = await mountSimulate();
  assert(
    doc.querySelector("#flow-simulate"),
    "simulate surface mounted from flow-surfaces.js",
  );
});

Deno.test("M6.2-sim run: Run dispatches simulate(holons, epochs) and renders the REAL report", async () => {
  const { win, doc, calls } = await mountSimulate();
  // deno-lint-ignore no-explicit-any
  await (win as any).runSimulation();

  assertEquals(calls.simulate.length, 1, "simulate dispatched once");
  const sent = calls.simulate[0];
  const holons = sent.holons as unknown[];
  assertEquals(Array.isArray(holons), true, "holons[] sent");
  assertEquals(holons.length, 3, "illustrative 3-holon network");
  assertEquals(sent.epochs, 3, "epochs sent");

  // the REAL report is rendered
  const results = doc.querySelector(
    "#flow-simulate #resultsState",
  ) as AnyEl;
  assert(results, "results panel present");
  const txt = results.textContent || "";
  assert(
    txt.indexOf("1,480") !== -1,
    "real totalFlowed (1,480) rendered, not a synthetic figure",
  );
  assert(
    txt.indexOf("you") !== -1 && txt.indexOf("peer-a") !== -1,
    "per-holon engine rows rendered",
  );
});
