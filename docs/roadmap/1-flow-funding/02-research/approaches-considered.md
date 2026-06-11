# 1644 Flow Funding — Approaches Considered (scored against the star)

**Item:** 1644 · **Phase:** 02-research · **Date:** 2026-06-11
**Gate role:** PROC-NEW-FEATURE-RESEARCH — *"approaches-considered.md … scored
AGAINST THE STAR; ABSENT BLOCKS 03-design."* Each axis lists the real options,
scores them against the star + Three Axioms + Outcome Test (DX/UX), and gives a
lean. The leans become the `[blocks-design]` questions for the ALIGN human walk.

**Star:** *"What if money knew when to keep moving — flowing on to those who
depend on us, and back to us when we are the ones in need — so no node hoards
while a dependent goes without?"*

---

## Axis 1 — Package shape

- **(a) One `flow-funding` package, modalities as pluggable engines.**
  Pro: one substrate, modalities compose, configurable per context (serves star
  + owner experimentation). Con: package must justify its boundary (PC-471).
- **(b) Separate package per modality** (threshold / pool / steward / tithe).
  Pro: clean boundaries. Con: over-production (compression discipline); modalities
  share events → artificial splits.
- **(c) Extend the `token` package, no new package.**
  Pro: maximal reuse. Con: owner directed a new package; flow funding has its own
  star/lifecycle/distribution boundary.
- **LEAN: (a).** One package, engines inside. Star: composition is the point.
  Confirm the distribution-boundary justification for PC-471 at DESIGN. → **fork A1/A2-pkg.**

## Axis 2 — chainType

- **(a) Reuse `token` chain** — flow funding is a scheduler/router over
  `token.pay`. Pro: no new substrate. Con: automated, agent-initiated, policy-
  driven flows may need distinct admission vs. the token package's per-transfer
  `CORE_APPROVAL_REQUIRED`.
- **(b) New `flow` / holon-policy chain** carrying FlowPolicy + agreements +
  story; value movement still settles via `token.pay`. Pro: clean home for
  policy/story/holon-channel state; honest separation. Con: new chainType.
- **LEAN: (b) for policy/agreement/story state + reuse `token.pay` for value.**
  Honesty axiom favors a distinct, auditable home for automated-flow authority.
  → **fork A4.**

## Axis 3 — The node ("holon")

- **(a) New holon node type** with kinds {person, hive, land, pool, goal}.
  *REJECTED* — owner correction + CODE: these already exist.
- **(b) Lens over the EXISTING taxonomy** — person / hive / agent / device;
  land/river = `stewardship` hive (`hives/templates.ts:183`); pool/goal = hive +
  treasury. Pro: Rule 8, zero new identity surface. Con: confirm pool/goal need
  no thin hive-subtype.
- **LEAN: (b) — RESOLVED-BY-REUSE.** Star: "flow to those who depend on us"
  includes the earth-as-stewardship-hive natively. → A2 resolved.

## Axis 4 — Channel / agreement primitive

- **(a) Two separate things** — contracts (Tree) and trust-weights (Simon).
  Con: two systems for one concept; divergent UX.
- **(b) One "flow agreement" with a formality dial** — relational weight ↔
  codified revenue-share contract. Pro: unifies both intakes; rides NAOMS
  agreement-centric DNA (`MintingAgreement`, consent/VC/ocap). 
- **LEAN: (b).** Star + DX: one primitive, two ends. → **fork A1.**

## Axis 5 — Anti-accumulation mechanism(s) in MVP

- Three distinct mechanisms (findings #6): gradient outflow / activity-decay /
  balance-demurrage.
- **(a) All three live.** Con: demurrage carries Simon's investment-flight LIVE
  tension; risky to ship live first.
- **(b) Gradient + activity-decay live; demurrage SIMULATION-ONLY first.**
  Pro: keeps the star's "no hoarding" via gradient + decay; de-risks demurrage by
  trying it per-holon in simulation (owner experimentation) before network-wide.
- **LEAN: (b).** → **fork A3.**

## Axis 6 — Flow accrual model

- **(a) Continuous streaming** (Superfluid-style). Con: no NAOMS primitive; per-
  second tx alien to event-sourcing.
- **(b) Lazy fold-time accrual** — emit `stream.opened{rate,epoch}`; compute
  `accrued = rate × elapsed` at fold/read. Pro: native to the event-sourced
  ledger; cheaper; honest (no silent state). 
- **(c) Periodic settlement events.** Pro: simple. Con: granularity vs. the
  "keep moving" feel.
- **LEAN: (b), with (c) as the settlement trigger.** → **fork B2.**

## Axis 7 — Allocation authority

- **(a) Central/steward-directs.** *REJECTED by Simon* — trustless-at-top breaks
  the biomimicry.
- **(b) Emergent from aggregated per-holon trust-weighted choices** — need =
  gravity, trust = terrain, nobody routes. Pro: serves star + Simon's load-
  bearing requirement; rides 030–031 trust graph.
- **LEAN: (b).** Single make-or-break per Simon: preserve trust as the topology.
  → **fork D3.**

## Axis 8 — UI build approach

- **(a) New flow-funding app.** *REJECTED* — owner 1260/1627: build the real app,
  extend the wallet.
- **(b) Extend the 1627 wallet, mock-first** (1668 spirit): binding mocks +
  per-M-row mock-fidelity gate on the real backend.
- **LEAN: (b) — RESOLVED.** → section L open-questions for mechanism source.

---

## The `[blocks-design]` shortlist for ALIGN (one-at-a-time walk)

Scored leans above collapse to the forks the owner walks at ALIGN:
**A1** (one flow-agreement w/ formality dial) · **A2-pkg** (one package, engines)
· **A3** (gradient+activity-decay live; demurrage sim-first) · **A4** (new
`flow` chain + reuse `token.pay`) · **D2** (fairness-under-scarcity rule) ·
**E4** (story→trust-signal mechanism) · **H2** (private-edge vs. perceive-need /
ZK scope). The rest are `[blocks-implementation]`/`[default-acceptable]` —
facilitator-defaulted at the leans here and recorded.

## Star trace

Every lean is chosen because it keeps value **moving toward need without
hoarding** (gradient + decay + emergent-toward-need), lets a node **support its
dependents and be supported** (bidirectional floor/ceiling, stewardship-hive
flow), and stays **honest and configurable per context** (distinct policy chain,
FlowPolicy, simulation-first, mock-first real-backend verification).
