---
item: 1644-flow-funding
phase: 04-risk → 05-align (PRE-ALIGN-GATE)
title: "Pre-align gate report (12 checks)"
authored: 2026-06-12
run_by: facilitator (single-operator under MCP-down; cannot bypass, cannot rubber-stamp)
result: 11/12 structurally satisfied; check 8 (queue-elected test-critic) BLOCKED-BY-MCP-DOWN — owner disposition at the gate
---

# 1644 Flow Funding — PRE-ALIGN-GATE Report

Structural gate at 04-risk → 05-align. Failures BLOCK the owner walk from opening.
Facilitator judgement is OUT of scope (structural contract); rubber-stamp = gate
failure (Honor Rule). Each check verified against the committed artifacts on
branch `1644-flow-funding` (tip after product-designer + risk commits).

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | 3 risk lenses present, non-empty | ✅ | `04-risk/{stride,fmea,ethics}-v1.md` (+`risk-triad-v1.md`) |
| 2 | Findings integrated by severity | ✅ | Critical/High woven into `design.md` §6.4/§8/§10; `04-risk/open-questions.md` severity-tagged (no defer-everything-below-HIGH) |
| 3 | Every intent → ≥1 contract row | ✅ | `test-plan-v1.md` DE-01..25 maps every design intent |
| 4 | Every error-matrix entry → error-state assertion or waiver | ✅ | Failure-mode pairing (DE-09/11/12/14) success+failure twins |
| 5 | Every UI-visible intent tier=e2e + real-pointer driver | ✅ (decl.) | DE-17..20 tier=e2e, real-pointer; "no `window.__`/DOM-click-via-evaluate" stated. Driver **file:line is a BUILD artifact** (pkg is State C, unbuilt) — the *declaration* is what the design gate checks |
| 6 | No contract row mixes tiers | ✅ | DE-02→integ, DE-06→unit + DE-06b→integ (split); each row single-tier |
| 7 | @bypasses/@pre-seeds paired with waiver+aligned-by | ✅ (n/a) | No test files exist yet (State C); zero `@bypasses`/`@pre-seeds`. Mock-flag discipline (`NAOMS_UI_MOCK`/PC-414) declared in design §9 + DEPENDENCIES |
| 8 | test-plan Phase-1 plan-review verdict = plan-approved | ⛔ **BLOCKED-BY-MCP-DOWN** | Queue-elected test-critic routes through PROC-NAOMS-CRITIC-QUEUE → MCP bridge (down, marker present). Documented **self-critic proxy** below; owner disposition at the gate |
| 9 | Substrate 3-state matrix complete; verify-with passes | ✅ | `design.md` §2 — every primitive State-tagged; State A/B re-verified at gate-run (hives/templates.ts:183, ciku/ceiling.ts, token manifest:438) |
| 10 | persona-set-manifest.json + sha256-pin | ✅ | present; sha256 `c09a6b73…` **reproduced + verified** locally |
| 11 | Bidirectional zero-trust; claims → primary evidence | ✅ | Design cites `[code:path:line]`; each risk lens did independent §0 re-verification; the inventory pass **corrected** research (token A→B) rather than inheriting its prose |
| 12 | Exactly one LIVE plan.md at item root | ✅ | `plan.md` only (no `plan-*.md`/`plan.vN.md`/`planning/`); current phase+step, copy-pasteable M0–M7 briefs; refreshed in the gate commit |

## Check 8 — honest disposition (the one non-pass)

The PROC requires a **queue-elected** test-critic Phase-1 plan-review
(PROC-NAOMS-CRITIC-QUEUE) whose verdict is in hand DURING the owner walk. That
queue routes through the `mcp__naoms__*` bridge, which is **down** (marker
`~/.naoms/mcp-down.json` present — the MCP-Down Rule authorizes proceeding on
file-based work, but it cannot *manufacture* a queue-elected verdict). I did not
fake a verdict (Honor Rule: rubber-stamp = gate failure).

**Self-critic proxy review of `test-plan-v1.md` (advisory, NOT a substitute):**
- ✔ Every MVP design intent has a DE row; tiers partition cleanly (post-fix).
- ✔ Mechanism-assertion present on the rows that claim a mechanism (DE-03 two-lane,
  DE-06 no-wall-clock, DE-12 token-gate-fired, DE-15/16 sim-path) — satisfies the
  "Assert the Mechanism" rule (1594).
- ✔ Failure-mode twins present for the security-critical rows.
- ⚠ Convergence/termination (DE-09 ext) needs a concrete bound at BUILD — flagged
  `[blocks-implementation]`, acceptable for a draft.
- ⚠ Real-pointer driver file:line is necessarily deferred to BUILD (State-C pkg).
- **Proxy verdict: plan-approved-pending-queue** — no structural defect found; the
  canonical queue verdict is owed once MCP is restored.

**Owner disposition options at the gate (this is a human decision):**
(a) restore MCP and run the canonical queue critic before the walk; or
(b) accept the self-critic proxy + emergency-allow-all posture and walk now,
with the canonical plan-review owed before BUILD opens. Recorded for the owner;
not self-decided.

## Gate result

**11/12 structurally satisfied; 1 blocked by an infrastructure outage (not a
design defect).** Per the MCP-Down Rule + the fact that **05-align is itself the
FIRST HUMAN GATE**, the facilitator drives to the gate and **STOPS**, presenting
this report + the ALIGN summary + the fork walk to the owner — who dispositions
check 8 and ratifies/overrides the forks.
