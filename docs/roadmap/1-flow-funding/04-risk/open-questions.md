---
item: 1644-flow-funding
phase: 04-risk (RISK-MITIGATE output)
title: "Risk-dialectic open questions — severity-tagged"
authored: 2026-06-12
---

# 1644 Flow Funding — Risk Open Questions (severity-tagged)

Questions the risk dialectic could NOT resolve, surfaced explicitly (not buried —
D-OPEN-QUESTIONS-EXPLICIT). Severity ∈ {blocks-design, blocks-implementation,
default-acceptable}. The `[blocks-design]` set is the owner's ALIGN walk; the rest
are recorded and defaulted. This file composes with
`02-research/open-questions.md` (forks A–L) — it does not duplicate it, it adds
the risk-surfaced ones and re-tags by severity.

## [blocks-design] — owner must decide at ALIGN (changes WHAT we build)

- **A0 — substrate sequencing** (FMEA F1, RPN 147; triad contradiction #3): gate
  1644 BUILD on 1596+1627 merge, OR base the BUILD branch on the 1596 tip? *Lean:
  gate on merge; DESIGN/mocks/test-plan proceed now.*
- **H1/H2/H3 — transparency disclosure scope** (STRIDE I1, FMEA F9; triad
  contradiction #1): relationship-scoped vs ecosystem-wide; identities vs terms vs
  amounts; ZK proof-of-need timing. *Lean: outcome-transparency + story-upstream,
  relationship-scoped, in MVP; ZK post-MVP.*
- **A3 — demurrage live posture** (FMEA F6, ethics AX-W3; triad contradiction #2):
  demurrage stays simulation-only in MVP — confirmed — but **when, if ever, does
  it go live network-wide?** *Lean: never in MVP; a separate owner-ratified step.*
- **D2 — fairness-under-scarcity rule** (allocation): need-weighted + per-claimant
  cap vs other rules. *Lean: need-weighted + cap.*
- **A5 — external capital** (ethics AX-W2 Wholeness): coordinate over own ledger
  only (MVP) vs touch real external capital (separate item)? *Lean: own ledger
  only; external capital = future item.*

## [blocks-implementation] — engineer-resolvable at BUILD, recorded now

- **B4 — convergence/termination guarantee at scale** (STRIDE D2, FMEA F5): the
  exact algorithm + bound + loud-refuse condition. Resolved in code at M3; DE-09.
- **C-params — decay/demurrage rates + sinks** (open-Q C1–C4): concrete numbers
  set per-context in FlowPolicy; defaults are a BUILD decision with a sim check.
- **E6 — story numeric weighting fold** (design §7): the composite formula.
  Deferred to named post-MVP `M-1644-STORY-WEIGHT-FOLD`; flat trust-nudge in MVP.
- **L1 — 1668 mock mechanism vs fallback** (process): decided at BUILD by 1668
  land-status; both paths defined in DEPENDENCIES.md.
- **ocap concrete shape** (STRIDE E1, FMEA F2): reuses 040–042 consent/VC/ocap;
  exact capability schema at M4; DE-12/14 bound it.

## [default-acceptable] — facilitator-defaulted, recorded

- Legal/compliance posture (FMEA): own-ledger-only materially reduces exposure;
  owner's to weigh, not an engineering blocker. Defaulted: MVP = internal ledger.
- `flow.policy_set` flooding (STRIDE D3, Low): bounded by lane write-rate +
  existing chain admission. No extra mechanism.
- Repudiation (STRIDE R1, Low): signed chain is non-repudiable by construction.

## Confirmation: HIGH+ integration (no addendum)

Every STRIDE-Critical/High, every FMEA RPN≥60, and the one ethics CRITICAL guard
(AX-H1) has a mitigation **woven into `design.md`** (§6.4 caps, §8 ocap+privacy,
§10 conservation/auth invariants) and a **contract row** in `test-plan-v1.md`
(DE-09 strengthened; DE-12/14/16/23/24/25 added). Design + risk are ONE narrative.
