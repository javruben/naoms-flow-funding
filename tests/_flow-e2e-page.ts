// src/packages/flow-funding/tests/_flow-e2e-page.ts
//
// The browser-side globals the flow-funding real-browser E2E tests reach for
// inside `page.evaluate(...)`. The production shell and ui/flow-tab.js install
// these on `window` as untyped JS; naming them here lets the E2E callbacks be
// type-checked instead of going through `window as any`. Type-only module:
// assertions vanish when Deno transpiles the callback, so puppeteer still ships
// plain `window` property reads to the page.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers NONE (type declarations for E2E page globals; no runtime code)
// @bypasses NONE
// @canonical-flow N/A
// @pre-seeds NONE
// === END HEADER ===

/** A feature the shell registers on `window._naomsFeatures`. */
export interface PageFeature {
  openActivity?: () => unknown;
}

/** Globals the shell and ui/flow-tab.js add to `window` once booted. */
export interface FlowPageGlobals {
  /** Shell app switcher (clients/browser shell). */
  _naoms: { activateApp(appId: string): unknown };
  _naomsFeatures?: Record<string, PageFeature | undefined>;
  /** ui/flow-tab.js surface switcher. */
  __flowShowSurface?: (surface: string) => void;
  /** ui/flow-tab.js simulate-surface action. */
  runSimulation?: () => unknown;
  /** ui/flow-tab.js token picker. */
  selectFlowToken?: (token: unknown) => void;
}

/** `window` as the flow-funding E2E tests see it once the shell has booted. */
export type FlowPageWindow = Window & typeof globalThis & FlowPageGlobals;
