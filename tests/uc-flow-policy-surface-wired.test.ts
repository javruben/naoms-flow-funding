// src/packages/flow-funding/tests/uc-flow-policy-surface-wired.test.ts
//
// 1644 M6.1b — the Policy surface mounts the REAL surface markup (flow-surfaces.js) fed real data.
//
// Loads the real surfaces module (window.__flowSurfaces) then flow-tab.js
// into a deno-dom Window, runs init + activate down the NON-uiMock (real-app)
// path, and asserts the wired contract under a stubbed FeatureContext:
//   - on mount, the surface loads via ctx.api.get_policy({context, tokenKind})
//   - Save dispatches ctx.api.policy_set with the band params + humanLabel
//   - a saved policy folds back into the surface's own inputs (renderer reuse)
//   - C7: the flow UI targets a REAL tokenId the user holds (reuse token.list),
//     NEVER the hardcoded string "custom"; get_policy/policy_set carry that
//     tokenId, and an honest empty-state refuses arming when no token is held.
//
// Runner: deno test --allow-read --no-check <path>
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/ui/flow-tab.js (wired Policy surface)
// @bypasses daemon=skipped, ws-server=stub-ctx-api (UC tier), fixture-stage=none
// @honesty-rationale Unit tier isolates the UI ↔ flow.* op contract: the wired
//   Policy surface MUST load via ctx.api.get_policy and save via
//   ctx.api.policy_set with the correct (context, tokenKind, params). The real
//   WS handlers + chain round-trip are covered by
//   integ-flow-policy-set-and-read (build-host, real daemon). daemon/ws-server
//   are stubbed because the server path is not what this tier asserts; no flow
//   state is pre-seeded — the surface reads only what the stubbed ctx returns.
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


interface ApiCalls {
  get: Array<Record<string, unknown>>;
  set: Array<Record<string, unknown>>;
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
  // head.appendChild for ensureMockCss
  return { doc, container, win };
}

async function evalInto(
  env: { doc: AnyDoc; win: Record<string, unknown> },
  path: string,
  tail = "",
): Promise<unknown> {
  const src = await Deno.readTextFile(path);
  const fn = new Function("window", "document", src + "\n" + tail);
  return fn(env.win, env.doc);
}

// C7: the REAL token the flow UI targets (reuse of the token.list op). A single
// held token whose real id the UI must carry into get_policy / policy_set — NOT
// the hardcoded string "custom".
const DEFAULT_TOKENS: Array<Record<string, unknown>> = [
  {
    id: "tok-favor-1",
    humanLabel: "Flow Favor",
    kind: "custom",
    final: 100,
    pending: 0,
    role: "issuer",
  },
];

async function mountWired(
  getResult: Record<string, unknown>,
  tokens: Array<Record<string, unknown>> = DEFAULT_TOKENS,
): Promise<{
  win: Record<string, unknown>;
  doc: AnyDoc;
  calls: ApiCalls;
}> {
  const env = buildEnv();
  // 1) load the real surfaces module → window.__flowSurfaces
  await evalInto(env, SURFACES_PATH);
  // 2) load the feature tab → window._naomsFeatures["flow-funding"]
  await evalInto(env, TAB_PATH);

  const calls: ApiCalls = { get: [], set: [] };
  const api = {
    get_policy: (p: Record<string, unknown>) => {
      calls.get.push(p);
      return Promise.resolve(getResult);
    },
    policy_set: (p: Record<string, unknown>) => {
      calls.set.push(p);
      return Promise.resolve({ ok: true, version: 1 });
    },
  };
  // C7: the flow feature ctx exposes ctx.sendReq (feature-context-factory).
  // The UI reuses the token.list op to target a REAL token the user holds.
  const sendReq = (msg: Record<string, unknown>) =>
    msg && msg.type === "token.list"
      ? Promise.resolve({ ok: true, tokens })
      : Promise.resolve({ ok: true });
  const feature = flowFeature(env.win);
  assert(feature, "flow-funding feature registered");
  feature.init({ container: env.container, api, sendReq });
  feature.activate();
  // flush loadTokens (token.list) → mount → the get_policy .then
  await new Promise((r) => setTimeout(r, 0));
  return { win: env.win, doc: env.doc, calls };
}

Deno.test("M6.1b/C7 source contract: flow-tab.js wires get_policy/policy_set with a REAL tokenId (token.list), not the hardcoded string custom", async () => {
  const src = await Deno.readTextFile(TAB_PATH);
  assert(
    src.includes("ctx.api.get_policy"),
    "loads via ctx.api.get_policy",
  );
  assert(
    src.includes("ctx.api.policy_set"),
    "saves via ctx.api.policy_set",
  );
  // C7: the UI reuses the token.list op to target a REAL token the user holds…
  assert(
    src.includes("token.list"),
    "C7: reuses the token.list op (no new token-list widget/API)",
  );
  // …and carries that real tokenId (state.tokenId) into the flow ops.
  assert(
    src.includes("state.tokenId"),
    "C7: the flow ops target state.tokenId (the real held token)",
  );
  // …and NEVER falls back to the hardcoded string "custom" in the flow paths.
  assert(
    !/tokenKind:\s*"custom"/.test(src),
    'C7: no get_policy/policy_set hardcodes tokenKind:"custom"',
  );
  assert(
    !/token:\s*"custom"/.test(src),
    'C7: no balance() hardcodes token:"custom"',
  );
  assert(
    src.includes("humanLabel"),
    "binds the denomination selector to humanLabel (not a kind id)",
  );
  assert(
    src.includes("__flowSurfaces"),
    "mounts the real surface registry (flow-surfaces.js)",
  );
  // 1710 mock purge guard: the mock module is gone from EVERY path.
  assert(
    !src.includes("__flowMockSurfaces") && !src.includes("mountFlowMock"),
    "flow-tab.js has no mock-module consumer left (1710 purge)",
  );
  const surfacesSrc = await Deno.readTextFile(SURFACES_PATH);
  assert(
    !/\$[0-9][\d,]{3,}/.test(surfacesSrc),
    "flow-surfaces.js carries no seeded dollar figures (honest static markup)",
  );
  let mockGone = false;
  try {
    await Deno.stat(
      `${NAOMS_ROOT}/src/packages/flow-funding/ui/flow-mock.js`,
    );
  } catch (_e) {
    mockGone = true;
  }
  assert(mockGone, "ui/flow-mock.js deleted (1710 mock purge)");
});

Deno.test("M6.1b/C7 mount: surface loads via get_policy(context, tokenKind=<real tokenId>)", async () => {
  const { doc, calls } = await mountWired({ ok: true, found: false });
  // the real Policy surface markup is mounted
  assert(
    doc.querySelector("#flow-policy"),
    "policy surface mounted from flow-surfaces.js",
  );
  assert(
    doc.querySelector("#flow-policy #floorInput"),
    "the floor input is present in the real markup",
  );
  // it loaded via the real op
  assertEquals(calls.get.length, 1, "get_policy called once on mount");
  assertEquals(
    calls.get[0].context,
    "personal",
    "default context (holon-local self-context, C1)",
  );
  assertEquals(
    calls.get[0].tokenKind,
    "tok-favor-1",
    "C7: tokenKind is the REAL held tokenId, not the string custom",
  );
});

Deno.test("M6.1b save: Save dispatches policy_set with band params + humanLabel", async () => {
  const { win, doc, calls } = await mountWired({ ok: true, found: false });
  const floor = doc.querySelector("#flow-policy #floorInput") as AnyEl;
  const ceil = doc.querySelector("#flow-policy #ceilingInput") as AnyEl;
  floor.value = "1200";
  ceil.value = "5000";
  // pick a denomination (NAO hours) via the surface's own handler
  winFn(win, "setCurrency")("NAO");
  await winFn(win, "savePolicy")();

  assertEquals(calls.set.length, 1, "policy_set dispatched once");
  const sent = calls.set[0];
  assertEquals(
    sent.context,
    "personal",
    "context carried (holon-local self-context, C1)",
  );
  assertEquals(
    sent.tokenKind,
    "tok-favor-1",
    "C7: policy_set carries the REAL held tokenId, not the string custom",
  );
  const params = sent.params as Record<string, unknown>;
  assertEquals(params.floor, 1200, "floor from the surface input");
  assertEquals(params.ceiling, 5000, "ceiling from the surface input");
  assertEquals(
    params.humanLabel,
    "NAO hours",
    "denomination bound to humanLabel",
  );
  assertEquals(typeof params.gradient, "number", "gradient param sent");
});

Deno.test("M6.1b load: a saved policy folds back into the surface's own inputs", async () => {
  const { doc, calls } = await mountWired({
    ok: true,
    found: true,
    version: 3,
    params: {
      floor: 800,
      ceiling: 4200,
      gradient: 0.8,
      humanLabel: "Care credits",
    },
  });
  assertEquals(calls.get.length, 1, "loaded via get_policy");
  const floor = doc.querySelector("#flow-policy #floorInput") as AnyEl;
  const ceil = doc.querySelector("#flow-policy #ceilingInput") as AnyEl;
  assertEquals(String(floor.value), "800", "floor folded into the input");
  assertEquals(String(ceil.value), "4200", "ceiling folded into the input");
  const sel = doc.querySelector("#flow-policy #ccySelect") as AnyEl;
  assertEquals(String(sel.value), "CARE", "denomination select restored");
});

Deno.test('C7 empty-state: user holds NO token → save refuses (no policy_set), tokenEmpty shown, no "custom" leaked', async () => {
  // token.list returns an empty holding → the UI must NOT silently arm "custom".
  const { win, doc, calls } = await mountWired(
    { ok: true, found: false },
    [],
  );
  // The Policy surface still mounts (band/save controls present), but the honest
  // empty-state message is revealed (the #tokenEmpty help is no longer hidden).
  assert(
    doc.querySelector("#flow-policy #floorInput"),
    "policy surface still mounts on empty holdings",
  );
  const empty = doc.querySelector("#flow-policy #tokenEmpty") as AnyEl;
  assert(empty, "the honest empty-state element is present");
  assert(
    !empty.classList.contains("hidden"),
    "the empty-state message is shown when the user holds no token",
  );
  // No token → the load path must NOT have called get_policy with a null/custom
  // tokenKind (it skips the read and shows the empty-state instead).
  assertEquals(
    calls.get.length,
    0,
    "get_policy is not called with a null/custom token on empty holdings",
  );
  // Arming must be REFUSED — no policy_set with the string "custom" (or anything).
  const floor = doc.querySelector("#flow-policy #floorInput") as AnyEl;
  const ceil = doc.querySelector("#flow-policy #ceilingInput") as AnyEl;
  floor.value = "1200";
  ceil.value = "5000";
  await winFn(win, "savePolicy")();
  assertEquals(
    calls.set.length,
    0,
    'save is refused when the user holds no token (no "custom" leaked)',
  );
});
