---
item: 1644-flow-funding
phase: 03-design
title: "Implementation plan — flow funding"
authored: 2026-06-12
gate_rule: every M-row carries ≥1 integ-or-e2e gate (D-MILESTONE-GATED-BY-INTEG-OR-E2E)
---

# 1644 Flow Funding — Implementation Plan

Decomposes `design.md` into Milestones (M-NN, each gated by ≥1 integ/e2e test) →
Steps (S-NN.K, one per agent delegation). Independent steps are
**parallel-eligible** (‖); only true dependencies sequence. Refined at
04-RISK-MITIGATE alongside the test plan, in hand before 05-align opens.

## Critical-path dependency (fork A0 — owner must acknowledge)

> **1644 BUILD is gated on State-B substrate landing on `origin/main`:** the
> **`token`** package (1596) and the **wallet UI** (1627). DESIGN, mocks, and the
> test plan proceed now; **M-row execution starts only after 1596 (+1627) merge.**
> If the owner wants 1644 to proceed in parallel, the alternative is to base
> 1644's BUILD branch on the 1596 branch tip (cascade-merge) — an ALIGN decision.

## Milestones

### M0 — Substrate landing gate (dependency, not 1644 code)
- **Gate:** `git branch --merged origin/main` shows 1596 (+1627), OR owner
  authorizes basing the BUILD branch on the 1596 tip. No 1644 code lands before
  this resolves.
- Not an M-row in the test sense (no 1644 test) — a **precondition** tracked here
  so the parallelization graph is honest.

### M1 — `flow` chain + FlowPolicy substrate (State C foundation)
- **Intent:** new `flow-funding` package, `flow` chainType, `flow.policy_set`
  event + FlowPolicy projection (materializer), single-permanent writer model.
- **Steps:**
  - S1.1 — package scaffold + manifest (`chainTypes:["flow"]`, PC-471 boundary
    comment, declared `{type,nodeKind}` events). ‖
  - S1.2 — `flow.policy_set` handler + FlowPolicy materializer (`await
    graphQueryAsync`). depends S1.1
  - S1.3 — policy versioning fold (latest-active-version read; no silent
    re-price). depends S1.2
- **Gate (integ):** `integ-flow-policy-set-and-read` — arm a FlowPolicy via the
  real handler on a test daemon, fold it back, assert the projected node matches;
  a second version supersedes the first without mutating a half-settled epoch.

### M2 — Flow-agreement primitive (formality dial) + IOU reuse
- **Intent:** `flow.agreement_proposed|accepted|revoked`, bilateral two-lane
  acceptance, formality-dial field; IOU end reuses the State-B `iou` kind.
- **Steps:**
  - S2.1 — agreement schema + events + bilateral acceptance handler. ‖ (after M1)
  - S2.2 — formality-dial: relational-weight end ↔ contract end share one object;
    contract end carries parties/%/duration/expiry-math/tier. depends S2.1
  - S2.3 — IOU integration (`iou` kind) for the repayment end. depends S2.1
- **Gate (integ):** `integ-flow-agreement-bilateral` — two identities propose +
  accept one agreement on their own lanes; revoke is immediate; an IOU agreement
  projects a negative-until-cleared balance. **mechanism-asserted: bilateral
  two-lane acceptance** (not just "an agreement row appeared").

### M3 — Anti-hoarding engines (gradient + activity-decay LIVE)
- **Intent:** gradient-outflow + activity-decay engines, heartbeat-attested
  lazy accrual (NO wall clock), conservation-loud settlement.
- **Steps:**
  - S3.1 — accrual fold: `accrued = rate × attestedElapsed` reusing the CIKU
    heartbeat-attested-elapsed pattern; refuse on non-conservation. ‖ (after M1)
  - S3.2 — gradient-outflow engine (smooth floor→ceiling curve). depends S3.1
  - S3.3 — activity-decay-of-entitlement engine. depends S3.1
  - S3.4 — emergent trust-weighted allocation (need=gravity) + per-claimant cap
    (D2 fairness). depends S3.2
- **Gate (integ):** `integ-flow-epoch-settle-conservation` — a surplus holon above
  ceiling settles an epoch; Σ(out) == surplus (conservation, refuses loudly on
  imbalance); a below-floor neighbour receives trust-weighted; over-flow racing
  the same headroom is refused. **mechanism-asserted: heartbeat-attested elapsed,
  not `Date.now()`** (assert no wall-clock call in the fold).

### M4 — Consent / scoped flow-ocap (security-critical)
- **Intent:** revocable scoped capability authorizing automated `token.pay`
  bounded by cap; composes with `CORE_APPROVAL_REQUIRED` (non-bypass).
- **Steps:**
  - S4.1 — ocap issuance at policy-arm (scope: above-ceiling, these channels,
    these caps, this context). depends M1
  - S4.2 — settlement rides `token.pay` carrying the capability; over-scope
    refused; revocation via policy-version disarm. depends S4.1, M3
- **Gate (e2e):** `e2e-flow-consent-bounded` — a pre-authorized flow settles value
  via the real `token.pay` path WITHOUT interactive unlock; an over-cap or
  revoked flow is **refused** (real cross-package path, real approval gate).
  **mechanism-asserted: token.pay `CORE_APPROVAL_REQUIRED` gate fired, capability
  bounded the amount.**

### M5 — Simulation / dry-run harness (+ demurrage simulation-only)
- **Intent:** run a FlowPolicy variant over synthetic/historical events through
  the real engine, in-process (no chain commit); demurrage lives here.
- **Steps:**
  - S5.1 — sim driver: real engine over in-process synthetic state; no
    `token.pay`, no chain commit. depends M3
  - S5.2 — demurrage engine, **simulation-only** (D-FF-ENGINE-POSTURE). depends S5.1
- **Gate (integ):** `integ-flow-simulation-no-commit` — a sim epoch produces an
  allocation report while asserting **zero `flow.*`/`token.pay` chain writes
  occurred**; demurrage decays an idle balance **only in the sim path**.
  **mechanism-asserted: simulation path, not live ledger.**

### M6 — Wallet UI surfaces (mock-first; extends 1627; the four ◆)
- **Intent:** flow-agreement creation, FlowPolicy config, flow/velocity view,
  simulation surface — built FROM the binding mocks (`03-design/mockup/`),
  served by the real wallet app.
- **Steps (one per surface, ‖ after their backend M-row):**
  - S6.1 — flow-agreement creation UI (needs M2). ‖
  - S6.2 — FlowPolicy config UI + context switcher (needs M1). ‖
  - S6.3 — flow/velocity view (needs M3). ‖
  - S6.4 — simulation surface UI (needs M5). ‖
- **Gate (e2e, per surface):** `e2e-<surface>` with a **real-pointer driver**
  (PRE-ALIGN-GATE check 5 — no `window.__`/DOM-click-via-evaluate), data seeded
  through the **real write path**, PLUS a **per-M-row mock-fidelity gate on a real
  daemon** (product-designer compares the served surface to its binding mock with
  fresh screenshots — 1650 `D-PER-M-ROW-MOCK-FIDELITY`; 1668 `@mock-fidelity` if
  landed, else the precedent fallback).

### M7 — Whole-design narrative E2E
- **Intent:** the star, demonstrated end-to-end.
- **Gate (e2e):** `e2e-flow-funding-narrative` — a node supports a dependent
  end-to-end: arm a policy, create an agreement, cross a ceiling, settle an epoch,
  the dependent (below floor) receives, the carrier's relationship trust-weight
  rises, and the whole thing is visible in the wallet — on a real daemon, real
  pointer, real write path. Drives 100% of MVP design intents.

## Parallelization graph

```
M0 (substrate land) ──> M1 ──> M2 ──┐
                          │         ├─> M6.S6.1 (agreement UI)
                          ├──> M3 ──┼─> M6.S6.3 (velocity UI)
                          │    │    └─> M5 ──> M6.S6.4 (sim UI)
                          │    └──> M4 ──────────────────────┐
                          └──> M6.S6.2 (policy UI)            │
M1..M6 ──────────────────────────────────────────────> M7 (narrative E2E)
```

- M1 is the foundation (everything depends on it).
- M2, M3, M4(after M3 for settlement), M6.S6.2 fan out from M1 — parallel-eligible.
- M5 depends on M3 (real engine). UI steps depend on their backend M-row.
- M7 gates on all MVP M-rows.

## Demoted / deferred (compression + Honor no-headers-as-deferral)

- **Story→trust-signal numeric fold** (design.md §7, E4): a **named post-MVP
  M-row `M-1644-STORY-WEIGHT-FOLD`** — `flow.story_attested` is emitted and
  weighted as a flat trust nudge in MVP; the numeric composite fold is explicitly
  a future M-row, NOT a silent omission.
- **ZK proof-of-need** (H2): named post-MVP M-row `M-1644-ZK-NEED`.
- **○ later UI surfaces** (pool, commitment-pool, story-upstream, stewardship-hive
  flow, transparency view, channel editor): post-MVP M-rows; mocks not authored
  this phase (compression).
