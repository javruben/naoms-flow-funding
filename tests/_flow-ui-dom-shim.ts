// src/packages/flow-funding/tests/_flow-ui-dom-shim.ts
//
// Typed deno-dom scaffolding shared by the flow-funding uc-tier UI wiring tests
// (uc-flow-*-surface-wired, uc-flow-controls-no-drop,
// uc-flow-agreement-accept-wiring). Those tests eval the REAL production UI
// scripts (ui/flow-surfaces.js + ui/flow-tab.js) into a deno-dom document and
// drive the functions the scripts expose on `window`. The scripts are untyped
// JS, so this module names the exact surface the tests rely on instead of
// reaching through `any`: a missing window function now fails with an
// assertion naming it, rather than a TypeError on `undefined`.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers NONE (shared typed test scaffolding; asserts nothing on its own)
// @bypasses NONE
// @canonical-flow N/A
// @pre-seeds NONE
// === END HEADER ===

import { assert } from "@std/assert";
import type { Element, HTMLDocument } from "jsr:@b-fuze/deno-dom";

/** deno-dom has no CSSOM; the shim gives every element this minimal style. */
export interface ShimStyle {
  cssText: string;
  setProperty(name?: string, value?: string): void;
}

/** A deno-dom element as the flow UI scripts see it: deno-dom implements no
 *  form-control IDL attributes, so `value` / `checked` / `disabled` are plain
 *  expando properties the scripts and the tests read and write directly. */
export type ShimEl = Element & {
  style: ShimStyle;
  value: string;
  checked: boolean;
  disabled: boolean;
};

export type ShimDoc = HTMLDocument & { __styleShimmed?: boolean };

/** Give every existing and future element a `style` object (see ShimStyle). */
export function ensureStyleShim(doc: HTMLDocument): void {
  const shimDoc = doc as ShimDoc;
  if (shimDoc.__styleShimmed) return;
  const orig = shimDoc.createElement.bind(doc);
  shimDoc.createElement = (tagName: string) => {
    const el = orig(tagName) as ShimEl;
    if (!el.style) el.style = { cssText: "", setProperty() {} };
    return el;
  };
  for (const el of doc.querySelectorAll("*")) {
    const shimEl = el as ShimEl;
    if (!shimEl.style) shimEl.style = { cssText: "", setProperty() {} };
  }
  shimDoc.__styleShimmed = true;
}

/** The feature object ui/flow-tab.js registers on `window._naomsFeatures`. */
export interface FlowFeature {
  init(ctx: Record<string, unknown>): void;
  activate(): void;
}

/** Resolve the registered flow-funding feature, asserting it exists. */
export function flowFeature(win: Record<string, unknown>): FlowFeature {
  const features = win._naomsFeatures as
    | Record<string, FlowFeature | undefined>
    | undefined;
  const feature = features?.["flow-funding"];
  assert(feature, "flow-funding feature registered on window._naomsFeatures");
  return feature;
}

/** Resolve a function the flow UI scripts expose on `window`, asserting it is
 *  actually a function (the scripts wire their inline onclick handlers to
 *  these globals, so a missing one is a real wiring break). */
export function winFn(
  win: Record<string, unknown>,
  name: string,
): (...args: unknown[]) => unknown {
  const fn = win[name];
  assert(
    typeof fn === "function",
    `flow UI must expose window.${name}() — got ${typeof fn}`,
  );
  return fn as (...args: unknown[]) => unknown;
}
