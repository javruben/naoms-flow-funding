/**
 * src/packages/flow-funding/ui/flow-tab.js — 1644 Flow feature tab.
 *
 * The Flow Funding surfaces (velocity / policy / agreement / simulation).
 *
 * @competitors: Open Collective, Grassroots Economics (Sarafu), Circles UBI
 * @competitor-reference: src/packages/flow-funding/docs/design/flow-funding-competitor-reference.md
 */
// Under NAOMS_UI_MOCK (test-only; the daemon injects window.__naomsConfig.uiMock
// into the app shell — see docs/build/standards/browser-app-mock-implementation.md)
// this mounts the four binding 1644 design surfaces NATIVELY in the feature tab
// via flow-mock.js. Outside the mock flag it shows the placeholder for the wired
// surfaces that land in M6 (driven by the real flow.* operations).

(function () {
  "use strict";

  // window._naomsFeatures is frozen-as-a-property by the shell — never reassign
  // it (that throws in strict mode and the feature silently fails to register).
  // Guard, then set our own key on the existing object.
  if (!window._naomsFeatures) window._naomsFeatures = {};

  window._naomsFeatures["flow-funding"] = {
    id: "flow-funding",
    name: "Flow Funding",
    category: "data",
    placement: { category: "data" },
    init: init,
    activate: activate,
    destroy: destroy,
  };

  var ctx = null;
  var container = null;

  function init(featureCtx) {
    if (!featureCtx) return;
    ctx = featureCtx;
    container = ctx.container;
  }

  function activate() {
    if (!container) return;
    if (window.__naomsConfig && window.__naomsConfig.uiMock) {
      loadMockModule(function () {
        if (typeof window.mountFlowMock === "function") {
          window.mountFlowMock(container);
        } else {
          container.textContent = "flow-mock module failed to load.";
        }
      });
      return;
    }
    container.innerHTML =
      '<div style="padding:2rem;max-width:680px;color:var(--color-text-secondary)">' +
      '<h2 style="color:var(--color-text-primary);margin-top:0">Flow funding</h2>' +
      "<p>The wired Flow surfaces — policy, agreements, the flow river, and " +
      "simulation — land in M6, driven by the real <code>flow.*</code> operations. " +
      "To preview the approved design mock in-app, run the daemon with " +
      "<code>NAOMS_UI_MOCK=1 NAOMS_ENV=test</code>.</p></div>";
  }

  function destroy() {
    if (container) container.innerHTML = "";
  }

  // Lazy-load the generated mock module (only under the flag, never in prod).
  function loadMockModule(cb) {
    if (typeof window.mountFlowMock === "function") return cb();
    var existing = document.getElementById("flow-mock-module");
    if (existing) {
      existing.addEventListener("load", cb);
      return;
    }
    var s = document.createElement("script");
    s.id = "flow-mock-module";
    s.src = "/features/flow-funding/flow-mock.js?v=" +
      (window.__naomsBuild || Date.now());
    s.onload = cb;
    s.onerror = function () {
      if (container) container.textContent = "flow-mock module failed to load.";
    };
    document.body.appendChild(s);
  }
})();
