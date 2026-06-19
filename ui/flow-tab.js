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
// In the real (non-mock) app it mounts each surface's OWN renderer
// (window.__flowMockSurfaces — the mock IS the production UI, fed real data, not
// rebuilt) behind a small surface nav and wires it to the live flow.* ops:
//   - Policy    → ctx.api.get_policy / policy_set   (M6.1)
//   - Agreement → ctx.api.agreement_propose         (M6.2)
//   - Velocity / Simulation → wiring lands later in M6.2 (honest placeholder).
// Sections without a backing op (felt-threshold inference, commons tithe,
// transparency = M-TRANSPARENCY) are shown but marked "preview · not yet saved",
// and the mocks' hard-coded synthetic figures are stripped — never
// synthetic-as-real (Honesty axiom / Honor Rule).

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

  var CONTEXTS = [
    { id: "awip", label: "AWIP core team" },
    { id: "nao", label: "NAO ecosystem" },
    { id: "circle", label: "Mutual-aid circle" },
    { id: "household", label: "Household" },
    { id: "stewardship", label: "Watershed hive" },
  ];
  var CURVE_GRADIENT = { "Generous early": 0.8, "Linear": 0.5, "Cautious": 0.2 };
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

  var SURFACES = [
    { id: "policy", label: "Policy" },
    { id: "agreement", label: "New agreement" },
    { id: "velocity", label: "Flow" },
    { id: "simulate", label: "Simulate" },
  ];

  var state = { context: "awip", ccy: "USD", gradient: 0.5 };

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
    loadMockModule(mountWired);
  }

  function destroy() {
    if (container) container.innerHTML = "";
  }

  // ── wired shell: surface nav + content + status ─────────────────────────────

  function mountWired() {
    var surfaces = window.__flowMockSurfaces;
    if (!surfaces || !surfaces.policy) {
      container.textContent = "Flow surfaces failed to load.";
      return;
    }
    if (
      !ctx.api || typeof ctx.api.get_policy !== "function" ||
      typeof ctx.api.policy_set !== "function"
    ) {
      container.textContent =
        "Flow operations are unavailable on this context — cannot wire the surfaces.";
      return;
    }
    ensureMockCss();
    container.innerHTML = "";

    var root = document.createElement("div");
    root.id = "flow-mock-app";
    root.style.cssText =
      "position:relative;height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;background:var(--color-surface-0,#0d1117)";

    var nav = document.createElement("div");
    nav.id = "flow-wired-nav";
    nav.style.cssText =
      "flex:0 0 auto;display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid var(--color-border,#30363d);background:var(--color-surface-1,#161b22);align-items:center";
    SURFACES.forEach(function (s) {
      var b = document.createElement("button");
      b.textContent = s.label;
      b.dataset.surface = s.id;
      b.style.cssText =
        "font:inherit;cursor:pointer;padding:5px 12px;border-radius:8px;border:1px solid var(--color-border,#30363d);background:var(--color-surface-2,#21262d);color:var(--color-text-secondary,#8b949e);font-size:.82rem;font-weight:600";
      b.onclick = function () {
        showSurface(s.id);
      };
      nav.appendChild(b);
    });

    var content = document.createElement("div");
    content.id = "flow-wired-content";
    content.style.cssText = "flex:1;min-height:0;position:relative;overflow:auto";

    var status = document.createElement("div");
    status.id = "flow-status";
    status.style.cssText =
      "flex:0 0 auto;font-size:.82rem;padding:8px 16px;border-top:1px solid var(--color-border,#30363d);background:var(--color-surface-1,#161b22);color:var(--color-text-secondary,#8b949e)";

    root.appendChild(nav);
    root.appendChild(content);
    root.appendChild(status);
    container.appendChild(root);

    window.__flowShowSurface = showSurface;
    showSurface("policy");
  }

  function showSurface(name) {
    var nav = document.getElementById("flow-wired-nav");
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll("button"), function (b) {
        var on = b.dataset.surface === name;
        b.style.background = on
          ? "var(--color-primary-muted,rgba(88,166,255,.15))"
          : "var(--color-surface-2,#21262d)";
        b.style.color = on
          ? "var(--color-primary,#58a6ff)"
          : "var(--color-text-secondary,#8b949e)";
        b.style.borderColor = on
          ? "var(--color-primary,#58a6ff)"
          : "var(--color-border,#30363d)";
      });
    }
    if (name === "policy") return mountPolicy();
    if (name === "agreement") return mountAgreement();
    if (name === "simulate") return mountSimulate();
    return mountPlaceholder(name);
  }

  function contentEl() {
    return document.getElementById("flow-wired-content");
  }

  function mountPlaceholder(name) {
    var c = contentEl();
    if (!c) return;
    var label = (SURFACES.filter(function (s) {
      return s.id === name;
    })[0] || {}).label || name;
    c.innerHTML =
      '<div style="padding:2rem;max-width:620px;color:var(--color-text-secondary,#8b949e)">' +
      '<h2 style="color:var(--color-text-primary,#c9d1d9);margin-top:0">' + label +
      "</h2><p>This surface is being wired to its real flow.* operations in M6.2 " +
      "(Velocity → epoch reads; Simulation → flow.simulate). It is intentionally " +
      "not showing synthetic data.</p></div>";
    showStatus("", "");
  }

  // ── Policy surface (M6.1) ────────────────────────────────────────────────────

  function pq(sel) {
    return document.querySelector("#flow-mock-policy " + sel);
  }

  function mountPolicy() {
    var c = contentEl();
    if (!c) return;
    c.innerHTML = '<div id="flow-mock-policy" class="fm-surface">' +
      window.__flowMockSurfaces.policy.html + "</div>";
    bindPolicyGlobals();
    neutralizePolicySynthetic();
    markPolicyUnbacked();
    loadPolicy();
  }

  function fmtCcy(n) {
    var f = CCY_FMT[state.ccy] || CCY_FMT.USD;
    return f.sym + Number(n || 0).toLocaleString() + f.suf;
  }

  function bindPolicyGlobals() {
    window.updateBand = function () {
      var floor = parseFloat((pq("#floorInput") || {}).value) || 0;
      var ceil = parseFloat((pq("#ceilingInput") || {}).value) || 0;
      var fl = pq("#floorLabel");
      var cl = pq("#ceilingLabel");
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
      var nm = ((el.querySelector(".cnm") || {}).textContent || "").trim();
      state.gradient = typeof CURVE_GRADIENT[nm] === "number"
        ? CURVE_GRADIENT[nm]
        : 0.5;
    };
    window.selectCtx = function (el, label) {
      var pills = document.querySelectorAll("#flow-mock-policy .ctx-pill");
      Array.prototype.forEach.call(pills, function (p) {
        p.classList.remove("on");
      });
      el.classList.add("on");
      var lbl = pq("#ctxLabel");
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
      showStatus(
        "Felt-threshold inference is being wired — enter floor/ceiling amounts directly for now.",
        "warn",
      );
    };
    window.openSim = function () {
      showSurface("simulate");
    };
    window.savePolicy = savePolicy;
  }

  function loadPolicy() {
    var lbl = pq("#ctxLabel");
    if (lbl) lbl.textContent = ctxLabel();
    ctx.api.get_policy({ context: state.context, tokenKind: "custom" }).then(
      function (res) {
        if (res && res.ok && res.found && res.params) {
          var p = res.params;
          var fi = pq("#floorInput");
          var ci = pq("#ceilingInput");
          if (fi && typeof p.floor === "number") fi.value = p.floor;
          if (ci && typeof p.ceiling === "number") ci.value = p.ceiling;
          if (typeof p.gradient === "number") {
            state.gradient = p.gradient;
            markCurveByGradient(p.gradient);
          }
          if (p.humanLabel) setCcyByLabel(p.humanLabel);
          window.updateBand();
          showStatus(
            "Loaded saved FlowPolicy v" + res.version + " for " + ctxLabel() +
              ".",
            "ok",
          );
        } else {
          var fi2 = pq("#floorInput");
          var ci2 = pq("#ceilingInput");
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
        showStatus("Could not load policy: " + errMsg(err), "warn");
      },
    );
  }

  function savePolicy() {
    var floor = parseFloat((pq("#floorInput") || {}).value);
    var ceil = parseFloat((pq("#ceilingInput") || {}).value);
    if (!isFinite(floor) || !isFinite(ceil)) {
      return showStatus("Enter both a floor and a ceiling first.", "warn");
    }
    if (ceil < floor) {
      return showStatus("Ceiling must be at or above the floor.", "warn");
    }
    showStatus("Saving…", "");
    return ctx.api.policy_set({
      context: state.context,
      tokenKind: "custom",
      params: {
        floor: floor,
        ceiling: ceil,
        gradient: state.gradient,
        humanLabel: CCY_LABEL[state.ccy] || CCY_LABEL.USD,
      },
    }).then(function (res) {
      if (res && res.ok) {
        showStatus(
          "Saved FlowPolicy v" + res.version + " for " + ctxLabel() +
            ". Takes effect at the next flow epoch.",
          "ok",
        );
      } else {
        showStatus("Save failed: " + ((res && res.error) || "unknown"), "warn");
      }
    }, function (err) {
      showStatus("Save failed: " + errMsg(err), "warn");
    });
  }

  function ctxLabel() {
    var m = CONTEXTS.filter(function (c) {
      return c.id === state.context;
    })[0];
    return m ? m.label : state.context;
  }

  function markCurveByGradient(g) {
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
      var nm = ((c.querySelector(".cnm") || {}).textContent || "").trim();
      c.classList.toggle("on", nm === best);
    });
  }

  function setCcyByLabel(label) {
    var code = Object.keys(CCY_LABEL).filter(function (k) {
      return CCY_LABEL[k] === label;
    })[0] || "USD";
    state.ccy = code;
    var sel = pq("#ccySelect");
    if (sel) sel.value = code;
    window.setCurrency(code);
  }

  function neutralizePolicySynthetic() {
    var helps = document.querySelectorAll(
      "#flow-mock-policy #numericThresholds .help",
    );
    Array.prototype.forEach.call(helps, function (h) {
      h.textContent = "";
    });
    var viz = pq(".band-viz");
    if (viz && viz.nextElementSibling) {
      viz.nextElementSibling.parentNode.removeChild(viz.nextElementSibling);
    }
    Array.prototype.forEach.call(
      document.querySelectorAll("#flow-mock-policy .card div"),
      function (d) {
        if ((d.textContent || "").indexOf("current flow rate") !== -1) {
          d.textContent = "";
        }
      },
    );
  }

  function markPolicyUnbacked() {
    var heads = document.querySelectorAll("#flow-mock-policy .card-head");
    Array.prototype.forEach.call(heads, function (h) {
      var txt = (h.textContent || "").toLowerCase();
      if (
        txt.indexOf("anti-hoarding") !== -1 ||
        txt.indexOf("commons tithe") !== -1 ||
        txt.indexOf("transparency") !== -1
      ) {
        h.appendChild(previewTag());
      }
    });
  }

  // ── Simulation surface (M6.2) ────────────────────────────────────────────────

  function sq(sel) {
    return document.querySelector("#flow-mock-simulate " + sel);
  }

  function mountSimulate() {
    var c = contentEl();
    if (!c) return;
    if (typeof ctx.api.simulate !== "function") {
      return mountPlaceholder("simulate");
    }
    c.innerHTML = '<div id="flow-mock-simulate" class="fm-surface">' +
      window.__flowMockSurfaces.simulate.html + "</div>";
    // The mock's results panel is fabricated history. Run the REAL engine over a
    // clearly-labelled synthetic network instead (flow.simulate is a dry-run over
    // synthetic state by design — design §6.5).
    bindSimulateGlobals();
    showStatus(
      "Choose a scenario and run — the real flow engine simulates an illustrative network (commits nothing).",
      "",
    );
  }

  // Scenario → the self holon's starting balance for an illustrative 3-holon
  // network (self + two below-floor claimants). Synthetic INPUT to a dry-run; the
  // report rendered below is the real engine's output.
  var SCENARIO_BALANCE = {
    steady: 12000,
    volatile: 4500,
    growth: 16000,
    hard: 5000,
    historical: 11000,
  };

  function buildSimHolons(scenario) {
    var selfBal = SCENARIO_BALANCE[scenario] || 12000;
    return [
      {
        id: "you",
        balance: selfBal,
        floor: 7000,
        ceiling: 10000,
        gradient: state.gradient,
        channels: [
          { to: "peer-a", trustWeight: 1 },
          { to: "peer-b", trustWeight: 0.6 },
        ],
      },
      { id: "peer-a", balance: 2000, floor: 5000, ceiling: 8000 },
      { id: "peer-b", balance: 1000, floor: 4000, ceiling: 7000 },
    ];
  }

  function bindSimulateGlobals() {
    window.updateScenarioDesc = function () {
      var v = (sq("#simScenario") || {}).value;
      var descs = {
        steady: "Stable income — no floor/ceiling crossings.",
        volatile: "Income dips below floor — tests deficit + recovery.",
        growth: "Revenue grows — tests ceiling crossing + outflow ramp.",
        hard: "Below floor most epochs — tests floor adequacy.",
        historical: "An illustrative recent-history shape.",
      };
      var el = sq("#scenarioDesc");
      if (el) el.textContent = descs[v] || "";
    };
    window.selectVariant = function (el, id) {
      var bs = document.querySelectorAll("#flow-mock-simulate .variant-btn");
      Array.prototype.forEach.call(bs, function (b) {
        b.classList.remove("on");
      });
      el.classList.add("on");
      var diff = sq("#variantDiff");
      if (diff) diff.classList.toggle("hidden", id !== "modified");
    };
    window.updateDemurrageRate = function () {};
    window.runSimulation = runSimulation;
  }

  function runSimulation() {
    var scenario = (sq("#simScenario") || {}).value || "steady";
    var holons = buildSimHolons(scenario);
    showStatus("Running the flow engine…", "");
    var btn = sq("#runBtn");
    if (btn) btn.textContent = "Running…";
    return ctx.api.simulate({ holons: holons, epochs: 3 }).then(function (res) {
      if (btn) btn.textContent = "⊕ Run simulation";
      if (res && res.ok && res.report) {
        renderSimReport(res.report, res.committed === false);
      } else {
        showStatus(
          "Simulation failed: " + ((res && res.error) || "unknown"),
          "warn",
        );
      }
    }, function (err) {
      if (btn) btn.textContent = "⊕ Run simulation";
      showStatus("Simulation failed: " + errMsg(err), "warn");
    });
  }

  // Replace the mock's fabricated results panel with the REAL engine report.
  function renderSimReport(report, committedNothing) {
    var prompt = sq("#promptState");
    if (prompt) prompt.classList.add("hidden");
    var results = sq("#resultsState");
    if (!results) return;
    results.classList.remove("hidden");

    var rows = (report.perHolon || []).map(function (h) {
      return "<tr><td>" + esc(h.id) + "</td><td style='text-align:right'>" +
        fmtNum(h.startBalance) + "</td><td style='text-align:right'>" +
        fmtNum(h.outflow) + "</td><td style='text-align:right'>" +
        fmtNum(h.received) + "</td><td style='text-align:right'>" +
        fmtNum(h.endBalance) + "</td></tr>";
    }).join("");

    results.innerHTML =
      '<div style="padding:4px 0 12px;font-size:.8rem;color:var(--text3,#8b939d)">' +
      "Illustrative synthetic network · real flow engine · " +
      (committedNothing ? "committed nothing" : "preview") + "</div>" +
      '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
      simCard("Epochs", String(report.epochs)) +
      simCard("Total flowed", fmtNum(report.totalFlowed)) +
      simCard("Conserved", report.conserved ? "yes" : "no") +
      "</div>" +
      '<table style="width:100%;border-collapse:collapse;font-size:.84rem">' +
      "<thead><tr style='color:var(--text2,#8b949e);text-align:left'>" +
      "<th>Holon</th><th style='text-align:right'>Start</th>" +
      "<th style='text-align:right'>Out</th><th style='text-align:right'>In</th>" +
      "<th style='text-align:right'>End</th></tr></thead><tbody>" + rows +
      "</tbody></table>" +
      ((report.refusals && report.refusals.length)
        ? '<div style="margin-top:10px;color:var(--yellow,#d29922);font-size:.8rem">' +
          report.refusals.length +
          " unconservable epoch(s) refused (surplus the channels could not absorb).</div>"
        : "");

    showStatus(
      "Simulated " + report.epochs + " epoch(s) — total flowed " +
        fmtNum(report.totalFlowed) + ", conserved: " +
        (report.conserved ? "yes" : "no") + ". Nothing committed.",
      "ok",
    );
  }

  function simCard(label, val) {
    return '<div style="flex:1;min-width:120px;background:var(--bg2,#161b22);' +
      "border:1px solid var(--border,#30363d);border-radius:10px;padding:10px 14px\">" +
      '<div style="font-size:.7rem;color:var(--text3,#8b939d);text-transform:uppercase;letter-spacing:.04em">' +
      esc(label) + '</div><div style="font-size:1.2rem;font-weight:700;margin-top:2px">' +
      esc(val) + "</div></div>";
  }

  function fmtNum(n) {
    return Number(n || 0).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ── Agreement surface (M6.2) ─────────────────────────────────────────────────

  function aq(sel) {
    return document.querySelector("#flow-mock-agreement " + sel);
  }

  function mountAgreement() {
    var c = contentEl();
    if (!c) return;
    c.innerHTML = '<div id="flow-mock-agreement" class="fm-surface">' +
      window.__flowMockSurfaces.agreement.html + "</div>";
    injectCounterpartyField();
    bindAgreementGlobals();
    neutralizeAgreementSynthetic();
    showStatus(
      "Propose a flow agreement — set the counterparty, dial the formality, then Create.",
      "",
    );
  }

  // The mock shows a fixed "@jay" recipient with no real DID source. A real
  // proposal needs a counterparty DID, so add an explicit field and drop the
  // synthetic party row.
  function injectCounterpartyField() {
    var sect = null;
    Array.prototype.forEach.call(
      document.querySelectorAll("#flow-mock-agreement .sect"),
      function (s) {
        var head = s.querySelector(".sect-head");
        if (head && (head.textContent || "").trim() === "Parties") sect = s;
      },
    );
    if (!sect) return;
    // remove the synthetic @jay party row(s) beyond "You"
    var rows = sect.querySelectorAll(".party-row");
    Array.prototype.forEach.call(rows, function (r, i) {
      if (i > 0) r.parentNode.removeChild(r);
    });
    var field = document.createElement("div");
    field.className = "field";
    field.innerHTML =
      '<label>Counterparty — peer handle or DID</label>' +
      '<input class="ctl" id="flowAgreementCounterparty" type="text" ' +
      'placeholder="e.g. did:key:… or @handle"/>' +
      '<div class="help">A bilateral flow agreement rides your established ' +
      "friendship lane with this peer — you must already be paired.</div>";
    sect.appendChild(field);
  }

  function bindAgreementGlobals() {
    window.onDial = function (v) {
      var pct = parseInt(v, 10) || 0;
      var dial = aq("#formalityDial");
      if (dial && dial.style && dial.style.setProperty) {
        dial.style.setProperty("--val", pct + "%");
      }
      var badge = aq("#dialBadge");
      if (badge) badge.textContent = dialLabel(pct);
      var rel = aq("#lbl-relational");
      var con = aq("#lbl-contract");
      if (rel) rel.classList.toggle("active", pct < 50);
      if (con) con.classList.toggle("active", pct >= 50);
      var isContract = pct >= 60;
      var rf = aq("#relationalFields");
      var cf = aq("#contractFields");
      if (rf) rf.classList.toggle("hidden", isContract);
      if (cf) cf.classList.toggle("hidden", !isContract);
    };
    window.selectTier = function (el) {
      var opts = document.querySelectorAll("#flow-mock-agreement .tier-opt");
      Array.prototype.forEach.call(opts, function (t) {
        t.classList.remove("on");
      });
      el.classList.add("on");
    };
    window.selectDur = function (el, val) {
      var bs = document.querySelectorAll("#flow-mock-agreement #durSeg button");
      Array.prototype.forEach.call(bs, function (b) {
        b.classList.remove("on");
      });
      el.classList.add("on");
      var cd = aq("#customDurField");
      if (cd) cd.classList.toggle("hidden", val !== "custom");
    };
    window.toggleIOU = function () {
      var t = aq("#iouToggle");
      var b = aq("#iouBody");
      if (t) t.classList.toggle("on");
      if (b) b.classList.toggle("hidden");
    };
    window.updateSplit = function () {
      var inputs = document.querySelectorAll(
        "#flow-mock-agreement .spct input",
      );
      var total = 0;
      Array.prototype.forEach.call(inputs, function (i) {
        total += parseFloat(i.value) || 0;
      });
      var fill = aq("#splitFill");
      if (fill && fill.style) fill.style.width = Math.min(total, 100) + "%";
      var lbl = aq("#splitTotalLabel");
      if (lbl) {
        lbl.textContent = total.toFixed(1) + " % of revenue";
        lbl.className = total > 100 ? "over" : "ok";
      }
    };
    window.handleCreate = handleCreate;
  }

  function handleCreate() {
    var counterparty = ((aq("#flowAgreementCounterparty") || {}).value || "")
      .trim();
    if (!counterparty) {
      return showStatus(
        "Enter a counterparty (peer handle or DID) to propose to.",
        "warn",
      );
    }
    var dial = parseFloat((aq("#formalityDial") || {}).value) || 0;
    var formality = Math.max(0, Math.min(1, dial / 100));
    var terms = { formality: formality, tier: formalityToTier(formality) };
    var sp = aq(".spct input");
    if (sp) {
      var v = parseFloat(sp.value);
      if (isFinite(v) && v > 0) terms.sharePct = Math.max(0, Math.min(1, v / 100));
    }
    var iouT = aq("#iouToggle");
    if (iouT && iouT.classList.contains("on")) terms.iou = true;

    showStatus("Proposing…", "");
    return ctx.api.agreement_propose({
      counterparty: counterparty,
      terms: terms,
    }).then(function (res) {
      if (res && res.ok) {
        showStatus(
          "Proposed agreement " + res.agreementId + " to " + counterparty +
            " — awaiting their co-sign.",
          "ok",
        );
      } else {
        showStatus("Propose failed: " + ((res && res.error) || "unknown"), "warn");
      }
    }, function (err) {
      showStatus("Propose failed: " + errMsg(err), "warn");
    });
  }

  function formalityToTier(f) {
    if (f < 0.2) return "relational";
    if (f < 0.45) return "channel";
    if (f < 0.8) return "revenue-share";
    return "contract";
  }

  var DIAL_POSITIONS = [
    { max: 20, label: "Trust-weight channel" },
    { max: 45, label: "Relational flow channel" },
    { max: 65, label: "Hybrid agreement" },
    { max: 80, label: "Codified share" },
    { max: 100, label: "Revenue-share contract" },
  ];
  function dialLabel(pct) {
    var p = DIAL_POSITIONS.filter(function (d) {
      return pct <= d.max;
    })[0];
    return (p || DIAL_POSITIONS[DIAL_POSITIONS.length - 1]).label;
  }

  // The mock's "how this would have executed" preview is fabricated history.
  function neutralizeAgreementSynthetic() {
    var prev = aq(".sim-preview");
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
  }

  // ── shared helpers ───────────────────────────────────────────────────────────

  function previewTag() {
    var tag = document.createElement("span");
    tag.textContent = "preview · not yet saved";
    tag.style.cssText =
      "font-size:.6rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-text-tertiary,#8b949e);border:1px solid var(--color-border,#30363d);border-radius:9999px;padding:1px 8px;margin-left:8px";
    return tag;
  }

  function errMsg(err) {
    return err && err.message ? err.message : String(err);
  }

  function showStatus(msg, kind) {
    var bar = document.getElementById("flow-status");
    if (!bar) return;
    bar.style.color = kind === "ok"
      ? "var(--color-success,#3fb950)"
      : kind === "warn"
      ? "var(--color-warning,#d29922)"
      : "var(--color-text-secondary,#8b949e)";
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
