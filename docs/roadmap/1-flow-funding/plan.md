---
item: 1644-flow-funding
title: "Flow Funding — LIVE plan (resumable)"
updated: 2026-06-12
current_phase: 04-risk → PRE-ALIGN-GATE (next stop = 05-align FIRST HUMAN GATE)
lifecycle: PROC-NEW-FEATURE
workflow_next: PROC-NEW-FEATURE-PRE-ALIGN-GATE → PROC-NEW-FEATURE-ALIGN-WITH-USER
---

# 1644 Flow Funding — LIVE plan

> Bar: a fresh facilitator resumes from THIS file alone. One `plan.md` at item
> root (check-12). Head-only narrative checkpoint is `_SESSION-HEAD-STATE.md`.

## Current position

- **SCOPE / RESEARCH** ✅ (gate passed: `02-research/{findings,approaches-considered}.md`).
- **DESIGN (03-design)** ✅ authored — `design.md` (3-state matrix; systems-architect
  verdict APPROVED-WITH-OWNER-FORKS), `dimensions-of-variation.md` (10/10 catalog),
  `implementation-plan.md` (M0–M7), `DEPENDENCIES.md`; product-designer
  `product-designer-verdict.md` + `personas/{tree-willard,simon-qb,yara-osei}.md` +
  `persona-set-manifest.json` + `mockup/` (binding mocks).
- **RISK (04-risk)** ✅ — `stride/fmea/ethics/risk-triad-v1.md` + RISK-MITIGATE
  `open-questions.md`; HIGH+ findings integrated into design (no addendum).
- **TEST PLAN DRAFT** ✅ — `05-align/test-plan-v1.md` (DE-01..25). Phase-1
  plan-review fires at ALIGN entry (queue-elected critic).
- **NEXT:** PRE-ALIGN-GATE (12 checks) → **STOP at ALIGN human gate.** Do NOT
  open BUILD; do NOT submit to merge queue.

## The ALIGN walk (what the owner decides — one at a time)

Forks (from `design.md` §11 + `04-risk/open-questions.md` [blocks-design]):
A0 substrate-sequencing · A1 formality-dial · A2-pkg one-package · A3
gradient+decay-live/demurrage-sim-first · A4 new `flow` chain+reuse `token.pay` ·
D2 fairness-rule · E4 story→trust-signal · H1/H2/H3 transparency-scope · A5
external-capital. Each: full context + candidate answers + recommendation.

## BUILD milestones (execute ONLY after ALIGN ratifies + M0 substrate lands)

Each M-row carries ≥1 integ/e2e gate (see `implementation-plan.md` for steps +
parallelization). Copy-pasteable briefs:

- **M0 (precondition):** confirm 1596+1627 merged to origin/main OR owner authorizes
  basing BUILD on 1596 tip. No 1644 code before this.
- **M1 — flow chain + FlowPolicy:** new `flow-funding` pkg, `flow` chainType,
  `flow.policy_set` + FlowPolicy materializer (`graphQueryAsync`), versioned read.
  Gate: `integ-flow-policy-set-and-read`.
- **M2 — flow-agreement (formality dial) + IOU:** bilateral two-lane accept,
  reuse `iou` kind. Gate: `integ-flow-agreement-bilateral` (mechanism: two-lane).
- **M3 — engines (gradient + activity-decay LIVE):** heartbeat-attested accrual
  (CIKU pattern, no wall-clock), conservation-loud, caps (DE-23/24).
  Gate: `integ-flow-epoch-settle-conservation`.
- **M4 — consent / scoped ocap:** bounded capability rides `token.pay`
  (CORE_APPROVAL_REQUIRED non-bypass), privacy DE-25.
  Gate: `e2e-flow-consent-bounded` (2 daemons).
- **M5 — simulation harness (+ demurrage sim-only):** real engine over in-process
  synthetic state, zero chain writes. Gate: `integ-flow-simulation-no-commit`.
- **M6 — wallet UI (4 ◆ surfaces, mock-first):** build FROM `03-design/mockup/`,
  real-pointer e2e + per-M-row mock-fidelity on real daemon. Gates: `e2e-<surface>`.
- **M7 — whole-design narrative E2E:** node supports a dependent end-to-end,
  drives 100% MVP intents. Gate: `e2e-flow-funding-narrative`.
- **post-MVP (named, not silent):** `M-1644-STORY-WEIGHT-FOLD` (E6),
  `M-1644-ZK-NEED` (H2), ○ later UI surfaces.

## Standing constraints
Zero Rule (this worktree only); push ≠ merge; don't touch 3147; don't edit the
1668 worktree; re-grep State-B token symbols at IMPLEMENT (unmerged branch).
