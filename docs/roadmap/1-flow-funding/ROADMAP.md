---
id: 1644-flow-funding
title: "Each node sets thresholds that automatically flow surplus income to its dependents and draw support from them, so value keeps circulating and no one hoards"
phase: 05-align
opened: 2026-06-09
opened_by: 1644 (owner-initiated)
star: "What if money knew when to keep moving — flowing on to those who depend on us, and back to us when we are the ones in need — so no node hoards while a dependent goes without?"
priority: P2
related: [1596, 1627, 1595, 30, 31, 32, 33, 34]
work_type: new-feature
lifecycle: PROC-NEW-FEATURE
scope: "A new `flow-funding` package layered on the token ledger (1596) and wallet UI (1627). Each node declares per-relationship thresholds (a viability band: floor + ceiling) and split rules; when a node's holdings rise above its ceiling, surplus automatically flows out along its dependent/relationship edges; when they fall below its floor, support is automatically drawn in from those it has flowed to. Idle balances decay (demurrage) so value cannot sit still. Trust-edges set the channels and caps. The result is a homeostatic, relationship-building, anti-hoarding value-circulation layer. RESEARCH + DESIGN first; implementation gated on owner + user (Tree) intake."
---

# 1644 — Flow Funding

## Star (purpose question — the WHY)

> What if money knew when to keep moving — flowing on to those who depend on us,
> and back to us when we are the ones in need — so no node hoards while a
> dependent goes without?

Every artifact under this item answers, explicitly: *does this help follow the
star?* The hypothesis the star encodes: if **circulation is the ground state**
and **accumulation is the anomaly**, then a network of people and agents can
support its dependents automatically — not through episodic charity or manual
generosity, but as a continuously-settled property of the relationship graph.
Value that sits still decays; value that flows builds relationships. The carrier
of a flow is nourished, not just the recipient (the original Flow Funding
insight — see research).

## What "flow funding" means here (owner intent, 2026-06-09)

Owner framing, verbatim intent:

> "Each node in a network can set certain thresholds that allow income to flow
> to dependents and from other dependents in an automated fashion, building
> strong relationships, creating fairness and prevent hoarding."

Decomposed into the primitives this item must deliver (sourced in
`02-research/flow-funding-research.md`):

- **Thresholds (floor + ceiling = a viability band).** Each node sets, per
  relationship and/or globally, a floor (below which it pulls support in) and a
  ceiling (above which surplus flows out). Borrowed from Stafford Beer's Viable
  System Model homeostat: keep each node within viable bounds automatically.
- **Outflow above ceiling → dependents.** Surplus cascades down the
  dependent/relationship edges (Drips-style splits + streams), arbitrarily deep,
  permissionlessly, so it never gets stuck.
- **Inflow below floor → from those you have supported.** The reciprocal
  direction: a node that has flowed value out can draw support back when it dips
  below its floor — "from each according to ability, to each according to need,"
  implemented as automated threshold control rather than coercion.
- **Demurrage (anti-hoarding engine).** Idle holdings decay over time so the
  rational move is always to pass value on (Gesell / Wörgl / Circles 7%/yr).
- **Trust-edges as channels + caps.** A node only flows to/from neighbours it
  has a relationship with, up to limits it sets (Trustlines / mutual-credit
  trust-lines). Building edges *is* creating capacity to flow → "building strong
  relationships."
- **Fairness weighting.** When many edges compete, allocation is breadth-weighted
  (quadratic-funding intuition) so a few large claimants cannot capture a node's
  surplus.

## Builds on (prior work — REUSE before building, Rule 8)

| Foundation | Item | What it provides | How flow-funding uses it |
| --- | --- | --- | --- |
| Token ledger | **1596** (`1596-token-branches`) | Entry-based, fold-projected token ledger: mint/transfer/compensation entries on single-writer `token` chains; invoice + ceremony + attestation + watermark primitives; `token_balance` materialized node | Flow funding does NOT invent a new value substrate — it schedules and routes **existing** token transfers according to thresholds + splits |
| Wallet UI | **1627** (`wallet-ui-pending` → wallet microapp) | Wallet home/send/request/detail/activity/treasury browser surfaces reading `token_balance` | Flow funding adds threshold/floor-ceiling configuration + a flow/velocity view onto the wallet, not a new app |
| Trust graph | **030–031** (celebrated) | Asymmetric, quantitative, typed trust edges + transitive propagation | Trust-edges become the channels + caps for flow; propagation can weight cascade depth |
| Demurrage | **032** (cancelled, design notes only) | Relationship-decay design (Circles ~7%/yr) never implemented | Flow funding is the first concrete consumer of demurrage; revisit 032's open questions |

> **NOTE (verify before asserting):** 1596 and 1627 are confirmed **reserved
> ids** tied to token-branches and wallet-ui respectively
> (`origin/id-reservations:reservations/roadmap/{1596,1627}.json`). The token
> package + wallet UI artifacts described above were surfaced by code/branch
> exploration on 2026-06-09 and are recorded in
> `02-research/foundations-1596-1627.md`. Treat package-internal specifics there
> as 🟡 UNVERIFIED until re-read against the live branch at DESIGN time — the
> token branch was not fully landed on `origin/main` at research time.

## Why a new item (not an M-row on 1596/1627)

All three creation-gate conditions hold (per `.naoms/roadmap/AGENTS.md`):

1. **Needs the full PROC-NEW-FEATURE lifecycle** — new domain (threshold/flow
   control), new package, real user-requirements intake, adversarial risk review
   (automated money movement is high-stakes).
2. **Different star / users** — 1596 is "can we represent value honestly?"; 1627
   is "can a person see and move their tokens?"; 1644 is "can value circulate to
   dependents on its own?" Primary user is **Tree** (real-world flow-funding
   needs), then a wider set of households / mutual-aid circles / open-source
   ecosystems.
3. **Delaying blocks a user-visible outcome** — the automated-circulation
   behaviour is the product; it cannot ship as a footnote to the ledger.

## Current phase: 02-research (RESEARCH)

PROC-NEW-FEATURE: **RESEARCH → DESIGN → ALIGN → IMPLEMENT → TEST → DOCS →
CELEBRATE**.

- [x] `01-backlog/scope-intake.md` — scope, prior-work links, why-new-item.
- [x] `02-research/flow-funding-research.md` — prior-art corpus (Flow Funding,
      holomovement, Atlas, demurrage, Drips/Superfluid, mutual credit, VSM, care
      economy), design-primitive distillation, open questions.
- [x] `02-research/foundations-1596-1627.md` — what the token ledger + wallet UI
      + trust graph actually provide today.
- [x] **Prior-art deep dives** added to the docs inspiration library
      (`docs/design/inspiration/`): `flow-funding.md`, `tbff-protocol.md`,
      `commitment-pooling.md`, `spore-bkc.md`, `compost-capital.md` (+ INDEX).
- [x] `02-research/open-questions.md` — consolidated living open-questions log
      for ALIGN (forks A1–A5, plus B–L).
- [x] `02-research/ui-surfaces-and-mock-first-plan.md` — **mock-first** UI plan
      (spirit of 1668): binding mocks as ground-truth + per-M-row mock-fidelity
      gate on the real backend, for the wallet flow-funding surfaces.
- [x] `intake-prompt.md` — requirements-intake instrument for **Tree** (and her
      Claude), capturing real-world needs that feed DESIGN.
- [x] `intake-prompt-simon.md` — architecture-intake instrument for **Simon**
      (Atlas Research Group), eliciting higher-level model + design decisions
      and confirming/correcting the "Atlas" reference.
- [ ] **GATE: owner + intake** before opening `03-design/`. DESIGN must not start
      until intake responses (Tree's needs and/or Simon's architecture — or an
      explicit owner waiver) are in `02-research/intake-responses/`.

## Open questions carried into DESIGN (see research for detail)

1. **Reuse `token` chainType or introduce a `flow` chainType?** Flow funding is
   primarily a *scheduler/router* over token transfers — leaning reuse, but
   automated, agent-initiated transfers may need a distinct admission policy.
2. **What triggers a flow?** Wall-clock tick (stream), threshold-crossing event,
   or both? NAOMS folds are clock-free (HC-21) — automated time-based flow needs
   a deliberate, auditable trigger source.
3. **Consent + authority for automated outflow.** A node pre-authorises "flow my
   surplus" — what is the revocable capability shape, and how does it compose
   with the token package's `CORE_APPROVAL_REQUIRED` per-transfer gate?
4. **Floor protection vs. solvency.** Pull-in-below-floor must not create
   obligations a neighbour cannot meet; mutual-credit limits + algedonic alarms
   (VSM) when a dependent breaches floor.
5. **Demurrage parameters** — rate, base (idle only vs. all), and where decayed
   value goes (burn vs. common pool vs. dependents).
6. **Fairness mechanism** — quadratic split weighting vs. simple declared
   percentages; sybil-resistance leans on the existing trust graph.
7. **Privacy** — flow topology reveals dependency relationships; what is exposed
   vs. held in the encrypted store.

## Milestones (placeholder — finalised at DESIGN)

| M-row | Intent | Status |
| --- | --- | --- |
| M1-RESEARCH | Prior-art corpus + foundations + design primitives + **gate artifacts** (`findings.md` + `approaches-considered.md`) | ✅ RESEARCH gate satisfied — 03-design may open |
| M2-INTAKE | `intake-prompt.md` (Tree) + `intake-prompt-simon.md` (Simon); collect responses | ✅ both received + synthesised (`02-research/intake-synthesis-{tree,simon-and-merge}.md`) + spore prior-art (`prior-art-spore-flow-funding.md`); owner alignment next |
| M3-DESIGN | Consolidated design doc (chain/event model, threshold semantics, triggers, consent) | ✅ `03-design/design.md` + dimensions + impl-plan + DEPENDENCIES + product-designer (verdict/personas/mocks); systems-architect verdict APPROVED-WITH-OWNER-FORKS |
| M4-RISK | Adversarial review (runaway flow, drain attacks, consent bypass, privacy leak) | ✅ `04-risk/{stride,fmea,ethics,risk-triad}-v1.md` + RISK-MITIGATE integration; PRE-ALIGN-GATE 11/12 (check-8 MCP-down) |
| M5-ALIGN | Owner + Tree alignment | ⏳ **AT THE GATE** — fork walk A0/A1/A2-pkg/A3/A4/D2/E4/H1-3/A5 + check-8 disposition awaiting owner |
| M6-IMPLEMENT | `src/packages/flow-funding/` package + **mock-first** wallet surfaces (extend 1627) | ⏳ |
| M7-TEST | unit → combined-tier → E2E (narrative: a node supports a dependent end-to-end); **per-M-row mock-fidelity gate on the real daemon** (1668 spirit) | ⏳ |
| M8-CELEBRATE | sign-off + close-gate | ⏳ |
