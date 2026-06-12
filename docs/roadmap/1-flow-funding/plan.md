---
item: 1644-flow-funding
title: "Flow Funding — LIVE plan (resumable)"
updated: 2026-06-12
current_phase: 06-implement (BUILD) — ALIGN passed, critic plan-approved, frozen-plan SEALED → BUILD opens at M1
lifecycle: PROC-NEW-FEATURE
workflow_next: PROC-NEW-FEATURE-BUILD — M1 (flow pkg + chain + FlowPolicy). Next human gate = CONVERGE (2nd)
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
- **TEST PLAN DRAFT** ✅ — `05-align/test-plan-v1.md` (DE-01..27).
- **ALIGN (05-align)** ✅ owner walk DONE 2026-06-12 — `05-align/alignment-decisions.md`.
  Forks resolved: A0 dissolved (token/wallet State A on main) · A3 reuse-1645 ·
  H1/H2/H3 reuse sharing-656 auto-sharer + Biscuit N-hop · A5 own-ledger-MVP ·
  A1/A2-pkg/A4/D2/E4 ratified. Worktree REBASED onto origin/main.
- **NEXT:** await critic plan-review verdict (`scripts/critic-queue.sh`, entry
  `ec-20260612T131832-p1-…`) → on `plan-approved`, write `frozen-plan.md`
  (SHA-pin) → BUILD M1. On `plan-rework`, fold findings first. Do NOT submit to
  merge queue until owner CELEBRATE.

## BUILD milestones (execute after frozen-plan; base on origin/main, NO M0 gate)

Each M-row carries ≥1 integ/e2e gate (see `implementation-plan.md` for steps +
parallelization). Substrate is State A on origin/main (no substrate gate).

- **M1 — flow chain + FlowPolicy:** new `flow-funding` pkg, `flow` chainType,
  `flow.policy_set` + FlowPolicy materializer (`graphQueryAsync`), versioned read.
  Gate: `integ-flow-policy-set-and-read`.
- **M2 — flow-agreement (formality dial) + IOU:** bilateral two-lane accept,
  reuse `iou` kind. Gate: `integ-flow-agreement-bilateral` (mechanism: two-lane).
- **M3 — engines (gradient + activity-decay LIVE):** heartbeat-attested accrual
  (CIKU pattern, no wall-clock), conservation-loud, caps (DE-23/24).
  Gate: `integ-flow-epoch-settle-conservation`.
- **M4 — consent / scoped ocap:** bounded capability rides `token.pay`
  (CORE_APPROVAL_REQUIRED non-bypass). Gate: `e2e-flow-consent-bounded` (2 daemons).
- **M5 — simulation harness (CONSUMES 1645 demurrage, no 1644 engine):** real
  engine over in-process synthetic state, zero chain writes; soft-dep 1645.
  Gate: `integ-flow-simulation-no-commit` (DE-16 reuse-1645).
- **M-TRANSPARENCY — local-first share (reuse sharing 656) + Biscuit N-hop:**
  register flow sharing-domain, auto-share to direct relationships
  (`sharer-friends`/`triggerAutoShare`), Biscuit caveat bounds N-hop reshare.
  Gate: `integ-flow-transparency-local-first` (DE-25/26/27).
- **M6 — wallet UI (4 ◆ surfaces, mock-first):** build FROM `03-design/mockup/`,
  real-pointer e2e + per-M-row mock-fidelity on real daemon. Gates: `e2e-<surface>`.
- **M7 — whole-design narrative E2E:** node supports a dependent end-to-end,
  drives 100% MVP intents. Gate: `e2e-flow-funding-narrative`.
- **post-MVP (named, not silent):** `M-1644-STORY-WEIGHT-FOLD` (E6),
  `M-1644-ZK-NEED` (H2), external-capital bridge (A5), ○ later UI surfaces.

## Standing constraints
Zero Rule (this worktree only); push ≠ merge (force-with-lease OK on own branch
post-rebase); don't touch 3147; don't edit the 1668 worktree. Substrate now
State A on origin/main (worktree rebased) — no re-grep-on-branch needed.
