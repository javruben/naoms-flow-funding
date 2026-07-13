// src/packages/flow-funding/tests/uc-flow-velocity-surface-wired.test.ts
//
// 1644 M6.2 — the Velocity surface (the flow "river") reads real flow data.
//
// Velocity is a READ aggregation: it queries the user's flow_agreement,
// flow_settlement and flow_policy graph nodes via ctx.graphQuery. With no flows
// it shows the M6-R1 first-run empty state; with flows it renders a real summary
// (settlements / flowed-out / received / armed band + active agreements). The
// old mock's synthetic "$17,400 / cup full" hero was purged (1710) — never
// synthetic-as-real.
//
// Runner: deno test --allow-read --no-check <path>
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (wired Velocity surface)
// @bypasses daemon=skipped, ws-server=stub-ctx-graphQuery (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the UI ↔ graph-read contract: the
//   Velocity surface MUST query flow_agreement/flow_settlement/flow_policy and
//   either show the empty state (no flows) or render REAL aggregates (no
//   synthetic numbers). The graph projections are covered by the M1/M2/M3 integ
//   tests. daemon/ws-server are stubbed; no state is pre-seeded.
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
const SELF = "did:self";

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

interface GraphData {
  agreements: unknown[];
  settlements: unknown[];
  policies: unknown[];
}

async function mountVelocity(
  data: GraphData,
): Promise<{ win: Record<string, unknown>; doc: AnyDoc }> {
  const env = buildEnv();
  await evalInto(env, SURFACES_PATH);
  await evalInto(env, TAB_PATH);

  const api = {
    get_policy: () => Promise.resolve({ ok: true, found: false }),
    policy_set: () => Promise.resolve({ ok: true, version: 1 }),
  };
  const ctx = {
    container: env.container,
    ownerDid: SELF,
    api,
    graphQuery: (pattern: Record<string, unknown>) => {
      const t = pattern.type;
      if (t === "flow_agreement") {
        return Promise.resolve({ nodes: data.agreements });
      }
      if (t === "flow_settlement") {
        return Promise.resolve({ nodes: data.settlements });
      }
      if (t === "flow_policy") return Promise.resolve({ nodes: data.policies });
      return Promise.resolve({ nodes: [] });
    },
  };
  // deno-lint-ignore no-explicit-any
  const feature = (env.win._naomsFeatures as any)["flow-funding"];
  feature.init(ctx);
  feature.activate();
  await new Promise((r) => setTimeout(r, 0));
  // deno-lint-ignore no-explicit-any
  (env.win as any).__flowShowSurface("velocity");
  await new Promise((r) => setTimeout(r, 0));
  return { win: env.win, doc: env.doc };
}

Deno.test("M6.2-vel source contract: flow-tab.js reads flow nodes via graphQuery + firstrun empty state", async () => {
  const src = await Deno.readTextFile(TAB_PATH);
  assert(src.includes("ctx.graphQuery"), "reads via ctx.graphQuery");
  assert(src.includes("flow_settlement"), "queries settlements");
  assert(src.includes("flow_agreement"), "queries agreements");
  assert(
    src.includes("__flowSurfaces.velocity"),
    "mounts the real velocity surface markup",
  );
  assert(/setState\("firstrun"\)/.test(src), "empty state on no flows");
});

Deno.test("M6.2-vel empty: no flows → first-run empty state (river hidden)", async () => {
  const { doc } = await mountVelocity({
    agreements: [],
    settlements: [],
    policies: [],
  });
  const fr = doc.querySelector("#flow-velocity #firstRun") as AnyEl;
  const rc = doc.querySelector("#flow-velocity #riverContent") as AnyEl;
  assert(fr, "firstRun present");
  assertEquals(
    fr.classList.contains("hidden"),
    false,
    "empty state shown when there are no flows",
  );
  assertEquals(
    rc.classList.contains("hidden"),
    true,
    "river hidden when there are no flows",
  );
});

Deno.test("M6.2-vel populated: real agreements + settlements render in the river (no synthetic hero)", async () => {
  const { doc } = await mountVelocity({
    agreements: [
      {
        id: "a1",
        properties: {
          proposer: SELF,
          counterparty: "did:peer",
          status: "active",
        },
      },
    ],
    settlements: [
      {
        id: "s1",
        properties: {
          holon: SELF,
          settledTotal: 740,
          allocations: '[{"id":"did:peer","amount":740}]',
        },
      },
    ],
    policies: [
      {
        id: "p1",
        properties: {
          holon: SELF,
          floor: 7000,
          ceiling: 15000,
          is_latest: true,
        },
      },
    ],
  });
  const rc = doc.querySelector("#flow-velocity #riverContent") as AnyEl;
  assertEquals(rc.classList.contains("hidden"), false, "river shown");
  assertEquals(
    doc.querySelector("#flow-velocity #stateHero"),
    null,
    "no synthetic cup-full hero in the real markup (purged 1710)",
  );
  const txt = rc.textContent || "";
  assert(txt.indexOf("740") !== -1, "real flowed-out total rendered");
  assert(
    txt.indexOf("did:peer") !== -1,
    "real agreement counterparty rendered",
  );
  assert(txt.indexOf("Flowed out") !== -1, "real aggregate label present");
});
