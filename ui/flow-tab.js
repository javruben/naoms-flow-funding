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
// this mounts the four binding 1644 design surfaces NATIVELY via flow-mock.js.
//
// In the real (non-mock) app it mounts the SAME Policy surface renderer
// (window.__flowMockSurfaces.policy — the mock IS the production UI, fed real
// data, not rebuilt) and wires it to the live flow.* operations:
//   - load  → ctx.api.get_policy({context, tokenKind:"custom"})
//   - save  → ctx.api.policy_set({context, tokenKind:"custom", params:{...}})
// The viability band (floor / ceiling / gradient / denomination) is backed by M1
// and saves now. Sections without a backing op yet (felt-threshold inference,
// commons tithe, transparency — M-TRANSPARENCY) are shown but marked "not yet
// saved" and their synthetic mock numbers are stripped — never synthetic-as-real
// (Honesty axiom / Honor Rule). The Velocity / Agreement / Simulation surfaces
// wire in M6.2.

(function () {
  "use strict";

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

  // The contexts the Policy surface exposes (nav ids ↔ pill labels). The on-chain
  // `context` key is the id; the label is display only.
  var CONTEXTS = [
    { id: "awip", label: "AWIP core team" },
    { id: "nao", label: "NAO ecosystem" },
    { id: "circle", label: "Mutual-aid circle" },
    { id: "household", label: "Household" },
    { id: "stewardship", label: "Watershed hive" },
  ];

  // Gradient curve ↔ numeric param (0 = hard switch … 1 = fully smooth). The three
  // approved curve options map to shape values; design-internal, not token vocab.
  var CURVE_GRADIENT = { "Generous early": 0.8, "Linear": 0.5, "Cautious": 0.2 };

  // Denomination select value → humanLabel (the display denomination the policy is
  // written for; bound to token humanLabel, NOT a tokenKind id — economics 2026-06-19).
  var CCY_LABEL = {
    USD: "US dollars ($)",
    NAO: "NAO hours",
    CARE: "Care credits",
  };
  var CCY_FMT = {
    USD: { sym: "$", suf: "" },
    NAO: { sym: "", suf: " hrs" },
    CARE: { sym: "", suf: " cr" },
  };

  var state = {
    context: "awip",
    ccy: "USD",
    gradient: 0.5,
  };

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
    // Real app: mount the Policy surface's own renderer, fed live flow.* data.
    loadMockModule(mountWiredPolicy);
  }

  function destroy() {
    if (container) container.innerHTML = "";
  }

  // ── wired Policy surface ─────────────────────────────────────────────────────

  function mountWiredPolicy() {
    var surfaces = window.__flowMockSurfaces;
    if (!surfaces || !surfaces.policy) {
      container.textContent = "Flow Policy surface failed to load.";
      return;
    }
    if (!ctx.api || typeof ctx.api.get_policy !== "function" ||
      typeof ctx.api.policy_set !== "function") {
      container.textContent =
        "Flow operations are unavailable on this context — cannot wire the Policy surface.";
      return;
    }
    ensureMockCss();

    container.innerHTML = "";
    var root = document.createElement("div");
    root.id = "flow-mock-app";
    root.style.cssText =
      "position:relative;height:100%;min-height:0;overflow:auto;background:var(--color-surface-0,#0d1117)";
    root.innerHTML = '<div id="flow-mock-policy" class="fm-surface">' +
      surfaces.policy.html + "</div>";
    container.appendChild(root);

    bindGlobals();
    neutralizeSyntheticData();
    markUnbackedSections();
    addStatusLine();

    // initial load for the default context
    loadPolicy();
  }

  function q(sel) {
    return document.querySelector("#flow-mock-policy " + sel);
  }

  function fmtCcy(n) {
    var f = CCY_FMT[state.ccy] || CCY_FMT.USD;
    return f.sym + Number(n || 0).toLocaleString() + f.suf;
  }

  // The surface's inline onclick/oninput handlers resolve against the global
  // scope. Define REAL implementations (the demo script is never injected here).
  function bindGlobals() {
    window.updateBand = function () {
      var floor = parseFloat((q("#floorInput") || {}).value) || 0;
      var ceil = parseFloat((q("#ceilingInput") || {}).value) || 0;
      var fl = q("#floorLabel");
      var cl = q("#ceilingLabel");
      if (fl) fl.textContent = fmtCcy(floor);
      if (cl) cl.textContent = fmtCcy(ceil);
    };
    window.setCurrency = function (v) {
      state.ccy = CCY_FMT[v] ? v : "USD";
      var f = CCY_FMT[state.ccy];
      var units = document.querySelectorAll("#flow-mock-policy .th-field .unit");
      Array.prototype.forEach.call(units, function (u) {
        u.textContent = (f.suf ? f.suf.trim() : f.sym) + " / month";
      });
      window.updateBand();
    };
    window.selectCurve = function (el) {
      var opts = document.querySelectorAll("#flow-mock-policy .curve-opt");
      Array.prototype.forEach.call(opts, function (c) {
        c.classList.remove("on");
      });
      el.classList.add("on");
      var nm = (el.querySelector(".cnm") || {}).textContent || "";
      state.gradient = CURVE_GRADIENT[nm.trim()];
      if (typeof state.gradient !== "number") state.gradient = 0.5;
    };
    window.selectCtx = function (el, label) {
      var pills = document.querySelectorAll("#flow-mock-policy .ctx-pill");
      Array.prototype.forEach.call(pills, function (p) {
        p.classList.remove("on");
      });
      el.classList.add("on");
      var lbl = q("#ctxLabel");
      if (lbl) lbl.textContent = label;
      var match = CONTEXTS.filter(function (c) {
        return c.label === label;
      })[0];
      state.context = match ? match.id : "awip";
      loadPolicy();
    };
    window.switchCtx = function (el, id) {
      var its = document.querySelectorAll("#flow-mock-policy .cfg-nav .it");
      Array.prototype.forEach.call(its, function (i) {
        i.classList.remove("on");
      });
      el.classList.add("on");
      state.context = id || "awip";
      loadPolicy();
    };
    window.toggleFelt = function () {
      // Felt-threshold inference is not backed yet — keep amounts the source of
      // truth and say so honestly rather than show inferred synthetic numbers.
      showStatus(
        "Felt-threshold inference is being wired — enter floor/ceiling amounts directly for now.",
        "warn",
      );
    };
    window.openSim = function () {
      showStatus("The simulation surface lands in M6.2.", "warn");
    };
    window.savePolicy = savePolicy;
  }

  function loadPolicy() {
    setCtxNavToState();
    ctx.api.get_policy({ context: state.context, tokenKind: "custom" }).then(
      function (res) {
        if (res && res.ok && res.found && res.params) {
          var p = res.params;
          var fi = q("#floorInput");
          var ci = q("#ceilingInput");
          if (fi && typeof p.floor === "number") fi.value = p.floor;
          if (ci && typeof p.ceiling === "number") ci.value = p.ceiling;
          if (typeof p.gradient === "number") {
            state.gradient = p.gradient;
            markCurveByGradient(p.gradient);
          }
          if (p.humanLabel) setCcyByLabel(p.humanLabel);
          window.updateBand();
          showStatus(
            "Loaded saved FlowPolicy v" + res.version + " for " +
              ctxLabel() + ".",
            "ok",
          );
        } else {
          // No saved policy: the mock's 7000/15000 are a synthetic suggestion,
          // not real state — clear them so nothing reads as saved.
          var fi2 = q("#floorInput");
          var ci2 = q("#ceilingInput");
          if (fi2) fi2.value = "";
          if (ci2) ci2.value = "";
          window.updateBand();
          showStatus(
            "No FlowPolicy saved yet for " + ctxLabel() +
              " — set a floor and ceiling, then Save.",
            "",
          );
        }
      },
      function (err) {
        showStatus(
          "Could not load policy: " + (err && err.message ? err.message : err),
          "warn",
        );
      },
    );
  }

  function savePolicy() {
    var floor = parseFloat((q("#floorInput") || {}).value);
    var ceil = parseFloat((q("#ceilingInput") || {}).value);
    if (!isFinite(floor) || !isFinite(ceil)) {
      return showStatus("Enter both a floor and a ceiling first.", "warn");
    }
    if (ceil < floor) {
      return showStatus("Ceiling must be at or above the floor.", "warn");
    }
    var params = {
      floor: floor,
      ceiling: ceil,
      gradient: state.gradient,
      humanLabel: CCY_LABEL[state.ccy] || CCY_LABEL.USD,
    };
    showStatus("Saving…", "");
    ctx.api.policy_set({
      context: state.context,
      tokenKind: "custom",
      params: params,
    }).then(function (res) {
      if (res && res.ok) {
        showStatus(
          "Saved FlowPolicy v" + res.version + " for " + ctxLabel() +
            ". Takes effect at the next flow epoch.",
          "ok",
        );
      } else {
        showStatus(
          "Save failed: " + ((res && res.error) || "unknown error"),
          "warn",
        );
      }
    }, function (err) {
      showStatus(
        "Save failed: " + (err && err.message ? err.message : err),
        "warn",
      );
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function ctxLabel() {
    var m = CONTEXTS.filter(function (c) {
      return c.id === state.context;
    })[0];
    return m ? m.label : state.context;
  }

  function setCtxNavToState() {
    var lbl = q("#ctxLabel");
    if (lbl) lbl.textContent = ctxLabel();
  }

  function markCurveByGradient(g) {
    // nearest of the three approved curves
    var best = "Linear";
    var bestD = Infinity;
    Object.keys(CURVE_GRADIENT).forEach(function (k) {
      var d = Math.abs(CURVE_GRADIENT[k] - g);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    var opts = document.querySelectorAll("#flow-mock-policy .curve-opt");
    Array.prototype.forEach.call(opts, function (c) {
      var nm = (c.querySelector(".cnm") || {}).textContent || "";
      c.classList.toggle("on", nm.trim() === best);
    });
  }

  function setCcyByLabel(label) {
    var code = Object.keys(CCY_LABEL).filter(function (k) {
      return CCY_LABEL[k] === label;
    })[0] || "USD";
    state.ccy = code;
    var sel = q("#ccySelect");
    if (sel) sel.value = code;
    window.setCurrency(code);
  }

  // Strip the mock's hard-coded synthetic figures so nothing reads as real data.
  function neutralizeSyntheticData() {
    // floor/ceiling helper quotes ("…— Simon")
    var helps = document.querySelectorAll(
      "#flow-mock-policy #numericThresholds .help",
    );
    Array.prototype.forEach.call(helps, function (h) {
      h.textContent = "";
    });
    // "you are currently in the gradient band" — synthetic position
    var pos = q(".band-viz");
    if (pos && pos.parentNode) {
      var sib = pos.nextElementSibling;
      if (sib) sib.parentNode.removeChild(sib);
    }
    // tithe "$12,400/month → $372/month" estimate
    var titheEsts = document.querySelectorAll("#flow-mock-policy .card");
    Array.prototype.forEach.call(titheEsts, function (card) {
      var t = card.textContent || "";
      if (t.indexOf("current flow rate") !== -1) {
        var est = card.querySelector("div[style*='--text3']");
        // best-effort: blank the specific estimate line if present
        Array.prototype.forEach.call(
          card.querySelectorAll("div"),
          function (d) {
            if ((d.textContent || "").indexOf("current flow rate") !== -1) {
              d.textContent = "";
            }
          },
        );
        if (est) { /* handled above */ }
      }
    });
  }

  // Make clear which sections actually persist on Save today.
  function markUnbackedSections() {
    var heads = document.querySelectorAll("#flow-mock-policy .card-head");
    Array.prototype.forEach.call(heads, function (h) {
      var txt = (h.textContent || "").toLowerCase();
      if (
        txt.indexOf("anti-hoarding") !== -1 ||
        txt.indexOf("commons tithe") !== -1 ||
        txt.indexOf("transparency") !== -1
      ) {
        var tag = document.createElement("span");
        tag.textContent = "preview · not yet saved";
        tag.style.cssText =
          "font-size:.6rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-text-tertiary,#8b949e);border:1px solid var(--color-border,#30363d);border-radius:9999px;padding:1px 8px;margin-left:8px";
        h.appendChild(tag);
      }
    });
  }

  function addStatusLine() {
    var bar = document.createElement("div");
    bar.id = "flow-policy-status";
    bar.style.cssText =
      "position:sticky;bottom:0;z-index:30;font-size:.82rem;padding:8px 16px;border-top:1px solid var(--color-border,#30363d);background:var(--color-surface-1,#161b22);color:var(--color-text-secondary,#8b949e)";
    var root = document.getElementById("flow-mock-app");
    if (root) root.appendChild(bar);
  }

  function showStatus(msg, kind) {
    var bar = document.getElementById("flow-policy-status");
    if (!bar) return;
    var color = kind === "ok"
      ? "var(--color-success,#3fb950)"
      : kind === "warn"
      ? "var(--color-warning,#d29922)"
      : "var(--color-text-secondary,#8b949e)";
    bar.style.color = color;
    bar.textContent = msg;
  }

  function ensureMockCss() {
    if (document.getElementById("flow-mock-css")) return;
    var l = document.createElement("link");
    l.id = "flow-mock-css";
    l.rel = "stylesheet";
    l.href = "/features/flow-funding/flow-mock.css?v=" +
      (window.__naomsBuild || Date.now());
    document.head.appendChild(l);
  }

  // Lazy-load the generated mock module (provides window.__flowMockSurfaces and,
  // under the flag, window.mountFlowMock).
  function loadMockModule(cb) {
    if (window.__flowMockSurfaces) return cb();
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
      if (container) container.textContent = "flow surface module failed to load.";
    };
    document.body.appendChild(s);
  }
})();
