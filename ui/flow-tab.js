/**
 * src/packages/flow-funding/ui/flow-tab.js — 1644 Flow feature tab.
 *
 * The Flow Funding surfaces (velocity / policy / agreement / simulation).
 *
 * @competitors: Open Collective, Grassroots Economics (Sarafu), Circles UBI
 * @competitor-reference: src/packages/flow-funding/docs/design/flow-funding-competitor-reference.md
 */
// Mounts the four REAL surfaces (flow-surfaces.js — hand-maintained honest
// markup, 1710 mock purge; no seeded figures, no synthetic peers) behind a
// small surface nav and wires them to the live flow.* ops:
//   - Policy    → ctx.api.get_policy / policy_set
//   - Agreement → ctx.api.agreement_propose
//   - Velocity  → graph reads (flow_agreement / flow_settlement / flow_policy)
//   - Simulate  → ctx.api.simulate (real engine, dry-run, commits nothing)
// Sections without a backing op (felt-threshold inference, anti-hoarding,
// commons tithe, transparency = M-TRANSPARENCY) carry an explicit
// "preview · not yet saved" tag in the static markup — never
// synthetic-as-real (Honesty axiom / Honor Rule). The same real DOM renders
// under NAOMS_UI_MOCK (skip-login testing mode): skip-login opens the real WS
// and real feature registry, so the surfaces read real (usually empty) data.

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
  var CURVE_GRADIENT = {
    "Generous early": 0.8,
    "Linear": 0.5,
    "Cautious": 0.2,
  };
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
    loadSurfacesModule(mountWired);
  }

  function destroy() {
    if (container) container.innerHTML = "";
  }

  // ── wired shell: surface nav + content + status ─────────────────────────────

  function mountWired() {
    var surfaces = window.__flowSurfaces;
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
    ensureSurfacesCss();
    container.innerHTML = "";

    var root = document.createElement("div");
    root.id = "flow-app";
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
    content.style.cssText =
      "flex:1;min-height:0;position:relative;overflow:auto";

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
      Array.prototype.forEach.call(
        nav.querySelectorAll("button"),
        function (b) {
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
        },
      );
    }
    if (name === "policy") return mountPolicy();
    if (name === "agreement") return mountAgreement();
    if (name === "simulate") return mountSimulate();
    if (name === "velocity") return mountVelocity();
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
      '<h2 style="color:var(--color-text-primary,#c9d1d9);margin-top:0">' +
      label +
      "</h2><p>This surface is being wired to its real flow.* operations in M6.2 " +
      "(Velocity → epoch reads; Simulation → flow.simulate). It is intentionally " +
      "not showing synthetic data.</p></div>";
    showStatus("", "");
  }

  // ── Policy surface (M6.1) ────────────────────────────────────────────────────

  function pq(sel) {
    return document.querySelector("#flow-policy " + sel);
  }

  function mountPolicy() {
    var c = contentEl();
    if (!c) return;
    c.innerHTML = '<div id="flow-policy" class="flow-surface">' +
      window.__flowSurfaces.policy.html + "</div>";
    bindPolicyGlobals();
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
      var units = document.querySelectorAll("#flow-policy .th-field .unit");
      Array.prototype.forEach.call(units, function (u) {
        u.textContent = (f.suf ? f.suf.trim() : f.sym) + " / month";
      });
      window.updateBand();
    };
    window.selectCurve = function (el) {
      var opts = document.querySelectorAll("#flow-policy .curve-opt");
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
      var pills = document.querySelectorAll("#flow-policy .ctx-pill");
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
      var its = document.querySelectorAll("#flow-policy .cfg-nav .it");
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
    var opts = document.querySelectorAll("#flow-policy .curve-opt");
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

  // ── Velocity surface — the flow "river", a READ aggregation ─────────────────

  function vq(sel) {
    return document.querySelector("#flow-velocity " + sel);
  }

  function mountVelocity() {
    var c = contentEl();
    if (!c) return;
    if (typeof ctx.graphQuery !== "function") {
      return mountPlaceholder("velocity");
    }
    c.innerHTML = '<div id="flow-velocity" class="flow-surface">' +
      window.__flowSurfaces.velocity.html + "</div>";
    bindVelocityGlobals();
    loadVelocity();
  }

  function bindVelocityGlobals() {
    // First-run toggle: empty state vs the real river render. No synthetic
    // balance/state numbers; the populated case is rendered by renderVelocity
    // from real data.
    window.setState = function (s) {
      var firstrun = s === "firstrun";
      var fr = vq("#firstRun");
      var rc = vq("#riverContent");
      if (fr) setHidden(fr, !firstrun);
      if (rc) setHidden(rc, firstrun);
    };
  }

  function nodesOf(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.nodes)) return res.nodes;
    return [];
  }

  function propsOf(n) {
    return (n && (n.properties || n.props)) || n || {};
  }

  function loadVelocity() {
    var self = ctx.ownerDid || "";
    showStatus("Loading your flows…", "");
    Promise.all([
      ctx.graphQuery({ type: "flow_agreement" }),
      ctx.graphQuery({ type: "flow_settlement", where: { holon: self } }),
      ctx.graphQuery({ type: "flow_policy", where: { holon: self } }),
    ]).then(function (rs) {
      var agreements = nodesOf(rs[0]).map(propsOf).filter(function (a) {
        return !self || a.proposer === self || a.counterparty === self;
      });
      var settlements = nodesOf(rs[1]).map(propsOf);
      var policies = nodesOf(rs[2]).map(propsOf);

      if (
        agreements.length === 0 && settlements.length === 0 &&
        policies.length === 0
      ) {
        if (typeof window.setState === "function") window.setState("firstrun");
        showStatus(
          "No flows yet — arm a FlowPolicy or propose an agreement to begin.",
          "",
        );
        return;
      }
      renderVelocity(agreements, settlements, policies, self);
    }, function (err) {
      showStatus("Could not load flows: " + errMsg(err), "warn");
    });
  }

  function renderVelocity(agreements, settlements, policies, self) {
    // Show the river, hide the empty state.
    var fr = vq("#firstRun");
    if (fr) fr.classList.add("hidden");
    var rc = vq("#riverContent");

    // Real aggregates from settlement history (Honesty: only what we can read).
    var totalOut = settlements.reduce(function (s, x) {
      return s + (Number(x.settledTotal) || 0);
    }, 0);
    var received = settlements.reduce(function (s, x) {
      var allocs = [];
      try {
        allocs = x.allocations
          ? (typeof x.allocations === "string"
            ? JSON.parse(x.allocations)
            : x.allocations)
          : [];
      } catch (_e) { /* tolerate */ }
      return s + (Array.isArray(allocs)
        ? allocs.reduce(function (a, al) {
          return a + (al && al.id === self ? Number(al.amount) || 0 : 0);
        }, 0)
        : 0);
    }, 0);
    var band = policies.filter(function (p) {
      return p.is_latest === true || p.is_latest === "true";
    })[0] || policies[0];

    var agRows = agreements.map(function (a) {
      var who = a.proposer === self ? a.counterparty : a.proposer;
      return "<li><strong>" + esc(who || "peer") + "</strong> · " +
        esc(a.status || "proposed") + "</li>";
    }).join("");

    if (rc) {
      rc.classList.remove("hidden");
      rc.innerHTML =
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
        simCard("Settlements", String(settlements.length)) +
        simCard("Flowed out", fmtNum(totalOut)) +
        simCard("Received", fmtNum(received)) +
        (band
          ? simCard(
            "Band",
            fmtNum(band.floor) + "–" + fmtNum(band.ceiling),
          )
          : "") +
        "</div>" +
        '<div style="font-size:.8rem;color:var(--text2,#8b949e);margin-bottom:6px">' +
        "Active flow agreements</div><ul style='margin:0;padding-left:18px'>" +
        (agRows ||
          "<li style='list-style:none;color:var(--text3,#8b939d)'>none yet</li>") +
        "</ul>";
    }
    showStatus(
      "Your flows: " + agreements.length + " agreement(s), " +
        settlements.length + " settlement(s), flowed out " + fmtNum(totalOut) +
        ".",
      "ok",
    );
  }

  // ── Simulation surface ───────────────────────────────────────────────────────

  function sq(sel) {
    return document.querySelector("#flow-simulate " + sel);
  }

  function mountSimulate() {
    var c = contentEl();
    if (!c) return;
    if (typeof ctx.api.simulate !== "function") {
      return mountPlaceholder("simulate");
    }
    c.innerHTML = '<div id="flow-simulate" class="flow-surface">' +
      window.__flowSurfaces.simulate.html + "</div>";
    // Run the REAL engine over a clearly-labelled synthetic network
    // (flow.simulate is a dry-run over synthetic state by design — design §6.5).
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
      'border:1px solid var(--border,#30363d);border-radius:10px;padding:10px 14px">' +
      '<div style="font-size:.7rem;color:var(--text3,#8b939d);text-transform:uppercase;letter-spacing:.04em">' +
      esc(label) +
      '</div><div style="font-size:1.2rem;font-weight:700;margin-top:2px">' +
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

  // ── Agreement surface ────────────────────────────────────────────────────────

  function aq(sel) {
    return document.querySelector("#flow-agreement " + sel);
  }

  function mountAgreement() {
    var c = contentEl();
    if (!c) return;
    c.innerHTML = '<div id="flow-agreement" class="flow-surface">' +
      window.__flowSurfaces.agreement.html + "</div>";
    bindAgreementGlobals();
    showStatus(
      "Propose a flow agreement — set the counterparty, dial the formality, then Create.",
      "",
    );
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
      var opts = document.querySelectorAll("#flow-agreement .tier-opt");
      Array.prototype.forEach.call(opts, function (t) {
        t.classList.remove("on");
      });
      el.classList.add("on");
    };
    window.selectDur = function (el, val) {
      var bs = document.querySelectorAll("#flow-agreement #durSeg button");
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
        "#flow-agreement .spct input",
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
    var isContract = dial >= 60;
    if (isContract) {
      var sp = aq(".spct input");
      if (sp) {
        var v = parseFloat(sp.value);
        if (isFinite(v) && v > 0) {
          terms.sharePct = Math.max(0, Math.min(1, v / 100));
        }
      }
      var revSrc = ((aq("#revenueSource") || {}).value || "").trim();
      if (revSrc) terms.revenueSource = revSrc;
      var iouT = aq("#iouToggle");
      if (iouT && iouT.classList.contains("on")) {
        var out = parseFloat((aq("#iouOutstanding") || {}).value);
        var cap = parseFloat((aq("#iouCap") || {}).value);
        terms.iou = {
          outstanding: isFinite(out) ? out : 0,
          currency: (aq("#iouCurrency") || {}).value || "USD",
          capPerPeriod: isFinite(cap) ? cap : 0,
        };
      }
    } else {
      // relational channel: bind the visible channel-width fields
      var w = parseFloat((aq("#channelWidth") || {}).value);
      if (isFinite(w) && w > 0) {
        terms.channel = {
          width: w,
          period: (aq("#channelPeriod") || {}).value || "per month",
          unit: (aq("#channelUnit") || {}).value || "NAO hours",
        };
      }
      var note = ((aq("#agreementNote") || {}).value || "").trim();
      if (note) terms.note = note;
    }
    var transp = aq('input[name="agreementTransp"]:checked');
    if (transp && transp.value) terms.transparency = transp.value;

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
        showStatus(
          "Propose failed: " + ((res && res.error) || "unknown"),
          "warn",
        );
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

  // ── shared helpers ───────────────────────────────────────────────────────────

  function errMsg(err) {
    return err && err.message ? err.message : String(err);
  }

  // Explicit hidden toggle (deno-dom's classList.toggle(token, force) is
  // unreliable; add/remove is portable).
  function setHidden(el, hide) {
    if (!el) return;
    if (hide) el.classList.add("hidden");
    else el.classList.remove("hidden");
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

  function ensureSurfacesCss() {
    if (document.getElementById("flow-surfaces-css")) return;
    var l = document.createElement("link");
    l.id = "flow-surfaces-css";
    l.rel = "stylesheet";
    l.href = "/features/flow-funding/flow-surfaces.css?v=" +
      (window.__naomsBuild || Date.now());
    document.head.appendChild(l);
  }

  function loadSurfacesModule(cb) {
    if (window.__flowSurfaces) return cb();
    var existing = document.getElementById("flow-surfaces-module");
    if (existing) {
      existing.addEventListener("load", cb);
      return;
    }
    var s = document.createElement("script");
    s.id = "flow-surfaces-module";
    s.src = "/features/flow-funding/flow-surfaces.js?v=" +
      (window.__naomsBuild || Date.now());
    s.onload = cb;
    s.onerror = function () {
      if (container) {
        container.textContent = "flow surface module failed to load.";
      }
    };
    document.body.appendChild(s);
  }
})();
