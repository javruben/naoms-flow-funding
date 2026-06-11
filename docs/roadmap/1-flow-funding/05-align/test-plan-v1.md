---
item: 1644-flow-funding
phase: 03-design (DRAFT — finalized + SHA-pinned at 05-align frozen-plan)
title: "Test plan v1 (DRAFT) — flow funding"
authored: 2026-06-12
authored_by: test-author (single-operator under MCP-down; author ≠ implementer ≠ critic)
plan_review: PENDING — fires at PROC-NEW-FEATURE-ALIGN-WITH-USER entry, post-04-RISK-MITIGATE
---

# 1644 Flow Funding — Test Plan v1 (DRAFT)

Drafted at DESIGN (this file), refined at 04-RISK-MITIGATE to absorb risk
findings, submitted to PROC-NAOMS-CRITIC-QUEUE **Phase-1 plan-review at 05-align
ENTRY**, SHA-pinned into `frozen-plan.md` at the align seam. **Every design intent
has ≥1 contract row; every UI-visible intent is `tier=e2e` with a real-pointer
driver** (PRE-ALIGN-GATE checks 3 + 5).

Tier order (Honor Rule): unit → combined-tier (unit + ffi-integ + integ) ≥80%
line cov → E2E driving 100% of MVP design intents. `DEFERRED`/`TODO`/`t.step.skip`/
`{ignore:true}` in an E2E = critical.

## Design Elements Checklist (DE-XX → tier → M-row)

| DE | Requirement (design intent) | Tier | M-row | mechanism-asserted |
| --- | --- | --- | --- | --- |
| DE-01 | FlowPolicy arm + versioned read (no silent re-price) | integ | M1 | latest-active-version fold |
| DE-02 | `flow.policy_set` declares `{type,nodeKind}`; materializer uses `graphQueryAsync` | unit+integ | M1 | async sibling (PC-700/701) |
| DE-03 | flow-agreement bilateral two-lane accept + immediate revoke | integ | M2 | **two-lane bilateral accept** |
| DE-04 | formality dial: one object spans relational-weight ↔ contract end | unit | M2 | — |
| DE-05 | IOU end reuses `iou` kind → negative-until-cleared | integ | M2 | `iou` kind interpret |
| DE-06 | accrual = rate × **attestedElapsed**, never `Date.now()` | unit+integ | M3 | **no wall-clock in fold** |
| DE-07 | gradient outflow: smooth floor→ceiling curve | unit | M3 | — |
| DE-08 | activity-decay of entitlement | unit | M3 | — |
| DE-09 | epoch settlement conservation: Σ(out)==surplus, refuse-loud on imbalance | integ | M3 | conservation invariant |
| DE-10 | emergent trust-weighted allocation + per-claimant cap (D2) | integ | M3 | trust-graph terrain, no router |
| DE-11 | over-flow racing same headroom → second refused | integ | M3 | single-lane serialization |
| DE-12 | scoped flow-ocap bounds automated `token.pay`; over-scope refused | e2e | M4 | **CORE_APPROVAL_REQUIRED fired + cap bounded** |
| DE-13 | revoke via policy-version disarm stops future flow | integ | M4 | — |
| DE-14 | vault-locked flow w/o valid pre-ocap refuses LOUD (no silent-drop) | integ | M4 | authorization-context refuse |
| DE-15 | simulation epoch: zero `flow.*`/`token.pay` chain writes | integ | M5 | **sim path, no commit** |
| DE-16 | demurrage decays idle balance ONLY in sim path | integ | M5 | **simulation-only posture** |
| DE-17 | flow-agreement creation UI matches binding mock | e2e | M6.S6.1 | real-pointer + mock-fidelity |
| DE-18 | FlowPolicy config UI + context switcher matches mock | e2e | M6.S6.2 | real-pointer + mock-fidelity |
| DE-19 | flow/velocity view (deficit / cup-full / cascade) matches mock | e2e | M6.S6.3 | real-pointer + mock-fidelity |
| DE-20 | simulation surface matches mock; runs real engine in-process | e2e | M6.S6.4 | real-pointer + mock-fidelity |
| DE-21 | partition: flow provisional until attested; over-flow detected on reconnect | integ | M3 | offline-first OTR-2 posture |
| DE-22 | whole-design narrative: node supports a dependent end-to-end | e2e | M7 | drives 100% MVP intents |

## Tier detail

- **Unit (uc-):** pure folds — gradient curve, activity-decay, accrual math,
  conservation predicate, formality-dial schema. Same inputs → byte-identical
  output (HC-21 purity); no `Date.now()`.
- **Combined-tier (integ-):** real handlers on a test daemon (`--port <test>`,
  NEVER 3147), real write path, real materializers. ≥80% combined line cov
  (unit + ffi-integ + integ, NOT integ-only). Daemon count: 1 for M1/M2/M5;
  **2 daemons** for M3 partition (DE-21) + M4 cross-identity consent (DE-12).
- **E2E (e2e-):** real wallet app, **real-pointer driver** (chrome-devtools MCP /
  the canonical e2e harness — NO `window.__`, NO DOM-click-via-evaluate), data
  seeded through real handlers. Each UI E2E carries a **mock-ladder header**
  (`@mock-ladder <successor>` / 1668 `@mock-fidelity` if landed) and a per-M-row
  mock-fidelity comparison on a real daemon with fresh screenshots.

## Failure-mode pairing (Honor Layer 9)

Every `*-failure-mode.test.ts` pairs with a `*-success.test.ts`:
- DE-09 conservation: `epoch-settle-success` + `epoch-settle-imbalance-refused-failure`.
- DE-12 consent: `consent-bounded-success` + `consent-over-cap-refused-failure`.
- DE-14 auth: `flow-vault-unlocked-success` + `flow-vault-locked-no-ocap-refused-failure`.
- DE-11 race: `headroom-single-flow-success` + `headroom-double-flow-second-refused-failure`.

## Open risk-driven rows (added at 04-RISK-MITIGATE)

Placeholders the risk lenses will populate:
- Runaway-flow blast-radius cap (risk-assessor FMEA).
- Drain-attack via trust-edge farming (security-auditor STRIDE — Spoofing/EoP).
- Privacy: flow topology disclosure vs encrypted-default (security-auditor Info-Disclosure; ethics Honesty).
- Demurrage→investment-flight axiom tension (ethics Wholeness/Honesty).
