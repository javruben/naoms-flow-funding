# Flow Funding (1644) — Consolidated Open Questions for ALIGN

**Item:** 1644 · **Updated:** 2026-06-10 · **Status:** living log — carried into
`05-align`. Every question here must be resolved (owner / Tree / Simon) or
explicitly deferred before/at the align gate. Sources: the two intakes, the four
prior-art studies (`prior-art-spore-flow-funding.md`, inspiration entries
`flow-funding.md` / `tbff-protocol.md` / `commitment-pooling.md` / `spore-bkc.md`
/ `compost-capital.md`), and the merge synthesis.

## A. Core architecture forks (owner decisions — highest priority)

- **A1. One "flow agreement" primitive with a formality dial?** Unify Tree's
  negotiated contract and Simon's relational trust-weight as one object (formal ↔
  informal ends). *Recommended: yes.*
- **A2. Holon as the universal node?** person / hive-org / land / pool / goal all
  as holons with channels. *Recommended: yes.*
- **A3. Which anti-accumulation mechanisms are in the MVP?** Three distinct ones:
  (1) gradient outflow, (2) activity-decay of entitlement (Tree), (3) demurrage
  on idle balances (owner brief / Gesell / Sarafu). *Recommended: 1+2 in;
  3 simulation-only first (Simon's investment-flight tension).*
- **A4. chainType:** reuse `token` vs. a new `flow`/holon chain. *Recommended:
  new holon+policy+story chain, reusing `token.pay` for value movement.*
- **A5. Does the system touch real external capital, or only coordinate signals
  over its own ledger?** (Wholeness axiom pressure; recurs across Hub
  Cultivator/DAF, Compost Capital portfolio, Sarafu cUSD.)

## B. Threshold / gradient / flow mechanics

- **B1. Gradient shape** floor→ceiling: per-holon or network constant? (Simon:
  per-holon. Owner: per-holon/per-context settings — see F.) How does a smooth
  curve compose with TBFF-style convergence while staying conservative +
  convergent?
- **B2. Continuous stream vs. lazy fold-time accrual** (`rate × elapsed` at read)
  vs. periodic settlement events? Do we need streaming at all in an event-sourced
  ledger?
- **B3. Settlement trigger + cadence** — on event / schedule / read? Incremental
  or full re-run convergence (cost)?
- **B4. Convergence guarantees at NAOMS scale** with cycles; precision vs. the
  Honesty axiom (no silent clamp); TBFF's 20-iter/exact-match is demo-grade.
- **B5. Min-threshold "fill first" priority** — TBFF never implemented it; do we,
  and does it stay convergent?
- **B6. Overflow sinks** — node with no allocations: burn or route to default
  commons pool?
- **B7. Floors-trend-to-zero flywheel** (Compost Capital / Simon) — model the
  time-dynamic of floors decreasing as rent sheds. Define precisely as ours.

## C. Decay / demurrage / anti-hoarding

- **C1. Demurrage rate, base (idle-only vs all), and sink** (burn / commons /
  dependents). Sarafu precedent: ~2%/mo → elected commons fund.
- **C2. Demurrage vs. investment flight** (Simon, LIVE) — does decay push money
  into flow-escaping investments? Mitigations: regeneration-gravity + protected
  savings carve-out; simulation-first.
- **C3. Protected savings / purpose pools** exempt from demurrage (Simon: land
  purchase to eliminate rent). How ring-fenced, and how authorized?
- **C4. Activity-decay of entitlement** (Tree "stay in the river") — curve, and
  founder-exemption rule. Distinct from C1; don't conflate.
- **C5. Demurrage vs. the Mystery axiom** ("forgetting is a feature") — decay of
  token value vs. attestation weight vs. GC of stale commitments are three
  different things to disambiguate.

## D. Trust, allocation, fairness

- **D1. Sybil / abuse resistance** — gate allocation targets on existing trust
  edges? How much leans on the 030–031 trust graph vs. new mechanism?
- **D2. Fairness under scarcity** — when surplus can't reach everyone: equal /
  need-weighted / proximity / quadratic / node-defined? Global policy or
  per-holon? (Research's quadratic/QF weighting may apply.)
- **D3. Emergent vs. imposed allocation** (Simon: emergent from aggregated
  trust-weighting; the scarcity→abundance phase shift is expressed, not declared).
  Is any shared phase signal useful, or fully perspectival?
- **D4. Anti-capture** — prevent one large claimant draining a holon while
  genuine high-need flows still happen.
- **D5. Overlooked-contributor protection** (Tree open Q) — mechanism so quieter
  contributors aren't passed over?
- **D6. Successor-selection capture** (Hub Cultivator) — self-perpetuating
  invitation-only delegation; what recall/exit (source model has none)?

## E. Contracts, commitments, evidence, story

- **E1. Flow-agreement schema** (the formal end) — parties, share %/amount,
  duration/expiry-math, tier, IOU/repayment. Tree: "the math on the contract
  defines expiry + amount." Map to token `MintingAgreement` + consent/VC/ocap.
- **E2. Commitment lifecycle** — adopt `PROPOSED→VERIFIED→ACTIVE→EVIDENCE_LINKED
  →REDEEMED` (+`DISPUTED↔RESOLVED`)? Is `VERIFIED` a witness co-sign or
  automatic? Does `EVIDENCE_LINKED` *release* value (escrow) or annotate
  (Sarafu's actual model)?
- **E3. Four-function naming** — adopt Ruddick's **Curation/Valuation/Limitation/
  Exchange**, or spore's **Provisioning/Redistribution/Activation/Repair** (and
  define as ours, not Ruddick's)?
- **E4. Story → actionable trust signal** (Simon, LIVE) — concrete mechanism by
  which a quest/threshold completion by unpriceable work becomes something the
  network perceives and flows toward. The hardest unresolved build.
- **E5. Narrative event vs. Owner Preference #1/#12** — type the four-questions
  reflection as *testimony* (not verified fact); who, if anyone, attests it?
- **E6. Evidence weighting model** — spore's composite (count × diversity ×
  recency × contest-status) is qualitative; need a numeric trust-graph fold.
- **E7. ReWoven IOU** (Tree) — per-consultant or collective founding amount?
- **E8. IOU/repayment primitive** — wire token `iou` kind (negative-until-cleared
  serviced by revenue-share stream).

## F. Settings, contexts, experimentation (owner, 2026-06-10)

- **F1. `FlowPolicy` object** keyed by `(holon, context, version)` covering every
  parameter (floor, ceiling, gradient shape, decay mechanisms + rates, tithe %,
  transparency level, allocation policy, pool release rules). Schema?
- **F2. Context scoping** — a person/hive runs different settings in different
  contexts (e.g. NAO vs Care Circles vs household). How are contexts named/bound?
- **F3. Simulation / dry-run harness** — model a flow epoch under a settings
  variant before committing real value; scope and fidelity? (De-risks C2.)
- **F4. Defaults + override** — ship sensible defaults (TBFF-like gradient) any
  holon/context can override. Which defaults?
- **F5. Are settings ever negotiated/shared between holons** (vs. purely
  self-set)? (Owner asked; clarify scope of "customization.")

## G. Pools

- **G1. Pool types** — buffer/common-reserve (fills good, releases below-floor)
  vs. purpose/goal (fills to target, one-time discharge, permanently lowers a
  floor). Both, as holons?
- **G2. Pool inflow modes** — chosen destination AND automatic tithe (% siphon).
  Both (Simon).
- **G3. Pool release rules** — buffer trigger; purpose-pool one-time-discharge
  authorization. "A pool that only fills is hoarding" — release rules are the
  whole design.
- **G4. Pool backing + valuation source** — what backs a pool promise; parity
  table / oracle / governance vote? (Sarafu seeds with cUSD — no NAOMS analog.)

## H. Privacy, transparency, disclosure

- **H1. Transparency model** — reconciled as **outcome-transparency + story
  upstream** (Simon) over Tree's "everyone sees everything." Confirm + specify.
- **H2. Private edge vs. network's need to perceive need** (Simon, LIVE) — ZK
  proofs of need-or-value without revealing detail: how much to resource now vs.
  hold as direction?
- **H3. Transparency for anonymous recipients** (Tree) — ecosystem-wide vs.
  relationship-scoped visibility; identities vs. terms vs. amounts.
- **H4. Anchoring vs. grounding** (spore) — Wholeness axiom → internal signed
  chains by default; any external-ledger bridge for interop?

## I. Governance, safety, exit

- **I1. Woven governance / "council"** for stopping a flow (Simon: "immediately,
  pending appropriate governance" — informal council). Concrete shape?
- **I2. Dispute resolution authority** (`DISPUTED→RESOLVED`) — owner gate / hive
  vote / policy engine? Unspecified in sources.
- **I3. Delegation** — who acts for a holon when ill/travelling (Tree + Simon
  both raised; neither named a person/mechanism).
- **I4. Stopping/removing a flow or person** — how fast, how easy; integrity
  constraints (no self/relative funding) enforced vs. social norm?

## J. Scope, identity, naming

- **J1. Scope (Simon)** — the ~10 people across two other startups in-network or
  separate? Name the 4 bioregional members + 2 Foundations.
- **J2. Unit of value / "the token"** — per-asset flow funding? What's the unit of
  threshold? (Ties to A4/A5.)
- **J3. "Atlas" reference** — Simon confirms Atlas Research Group is his venture
  (intake), superseding the earlier 🔴 assumption; confirm no further citation
  needed.
- **J4. Compost Capital ground-truth source** — Benjamin Life essay vs. internal
  Simon/ARG doc for the flywheel + tithe (CC-R1).
- **J5. Place as a primitive?** — bioregion/watershed load-bearing for Hub
  Cultivator; first-class NAOMS primitive or chain metadata?

## K. Maturity / reuse realism (cross-cutting)

- **K1.** Only Grassroots Economics commitment pooling is production; TBFF is
  testnet-demo, Hub Cultivator/BKC are pilots. Which parts are proven prior art
  to lean on vs. research-grade to re-derive?
- **K2. Unreached primary sources** to pull before align: SSRN 6606438
  (commitment-pool route graphs, formal model), IJCCR Vol. 27 (2023), the
  `tbff-protocol` license.
