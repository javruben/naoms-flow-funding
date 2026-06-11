# Intake Synthesis — Simon + Tree↔Simon Merge → Design Direction (02-research)

**Item:** 1644 · **Date:** 2026-06-10 · **Sources:**
`intake-responses/simon-2026-06-10.md`, `intake-responses/tree-2026-06-10.md`,
`prior-art-spore-flow-funding.md`, `intake-synthesis-tree.md`

> Pre-design input, not design. This is the brief DESIGN (`03-design`) builds
> from. Both intakes are now in; DESIGN opens after owner alignment (05-align is
> the formal gate, but the owner has been steering inline).

## Headline

Two independent users and one independent external research corpus (spore/BKC)
**converge** on the same primitives. Tree gave us the **organisational /
contract** face; Simon gave us the **relational / watershed** face; spore gives
us **working reference protocols**. They are not competing models — they are the
**formal and informal ends of one system**, and the merge below is the core
design move.

## Simon's architecture in one paragraph

A **trust-full watershed of holons**. Every participant keeps their own **trust
topology** (who they're connected to, how wide each channel is) — *trust is the
terrain*. Surplus above a holon's **ceiling** flows down those channels toward
holons below their **floor** — *need is the gravity*. **Nobody routes from a
centre**; the network's allocation **emerges** from the sum of individual
trust-weighted choices, including the scarcity→abundance phase shift. Flow is a
**gradient** (begins at the floor, accelerates to full at the ceiling — not two
switches). The same channels carry **money downstream, story upstream, and
deliberation laterally**. Floors **trend toward zero** over time as the network
sheds rent (the Compost Capital flywheel). Flow ultimately **gravitates to the
earth** — the unpriceable regenerative work the market can't see is the true low
point of the watershed, and reaching it is the protocol's reason to exist.

## The merge: Tree's contract ↔ Simon's trust-weight are ONE primitive

This is the load-bearing reconciliation.

- **Tree** sets channels by **negotiated contract** — explicit, codified terms
  ("the math on the contracts defines expiry and amount"), revenue-share %,
  tiers, IOU repayment. High formality.
- **Simon** sets channels by **relational trust-weighting** — informal,
  per-person, "in relationship," explicitly anti-form ("easier to mislead a
  form").

These are **two ends of a formality spectrum of the same object: a flow
channel / agreement.** A contract is a high-formality channel with codified
terms; a trust-weight is a low-formality channel carrying judgement. NAOMS's
agreement-centric DNA (Honor Rule; 1633 auditable agreements; token
`MintingAgreement`; 040–042 consent/VC/ocap) holds both natively. **Design one
"flow agreement" primitive with a formality dial** — from a quiet relational
weight to a fully codified revenue-share contract — rather than two systems.
spore's **promises/obligations + commitment-pooling lifecycle** is a working
model for the formal end; Hub Cultivator's relational stewardship is the informal
end.

## The unifying object: the holon (Simon)

Flow does not distinguish recipient *kinds*. A channel can terminate in a
**person, a hive/org, a piece of land, a buffer pool, a savings goal, a purpose
pool** — any **holon**. "Supporting a person" and "contributing to the commons"
are the same gesture aimed at different nodes. → The package's core node type is
**holon**, with kinds {person, hive/org, land/ecology, pool, goal}. Tree's
"organisation revenue stream" and Simon's "person" and "the earth" are all just
holons with channels.

## Anti-accumulation: THREE distinct mechanisms (do not conflate)

The brief said "prevent hoarding" as if it were one thing. The intakes reveal
three, which must be designed separately and selected per context:

1. **Gradient outflow** (Simon) — the more abundant a holon, the more flows out;
   structural, continuous. The primary anti-hoarding force.
2. **Activity-decay of entitlement** (Tree) — a contributor's *channel weight /
   claim* fades as participation fades ("stay in the river"); founders exempt.
   Decays a **claim**, not a balance.
3. **Demurrage on idle balances** (owner brief / Gesell / TBFF) — held value
   decays. **LIVE TENSION** (Simon: may push money into flow-escaping
   investments). Reframed by regeneration-gravity + protected-savings carve-out;
   not fully resolved.

## Pools (Simon, validated by spore commitment pooling)

Pools are holons that **store and release under conditions** ("a pool that only
fills is hoarding with extra steps" — release rules are the whole design):

- **Buffer / common reserve** — fills in good times, releases to anyone below
  floor in bad times; cyclical collective insurance.
- **Purpose / goal pool** — fills to a target, **discharges once** (land,
  infrastructure), after which a floor **drops permanently** (rent eliminated).
  The flywheel made concrete.

Two inflow modes, both required: **chosen destination** (relational, voluntary)
and **automatic tithe** (a % of every passing flow siphons to the pool —
%-to-commons). Maps to NAOMS hive **treasury** (1596 wallet-treasury) generalised
+ token **splits**.

## Transparency, reconciled (Tree ↔ Simon ↔ NAOMS)

- **Tree:** "everyone sees everything."
- **Simon:** not transparency of *flows* but of **outcomes** — **bidirectional
  channels**: money down, **story up** ("no story, no trust; no trust, no flow"),
  deliberation lateral. ZK proofs to prove need-or-value without revealing detail.
  Private edges are a legitimate need.
- **Reconciliation:** Simon's *outcome-transparency + story-as-accounting*
  subsumes Tree's intent (the value created is fully visible) **without** forcing
  every transaction into the clear, which keeps faith with NAOMS's
  encrypted-by-default posture (010–016) and supports private edges. **Story
  upstream** = signed narrative/evidence events on the channel (cf. spore's
  Evidence entities + the four reflective questions). **LIVE TENSION 2** (private
  edge vs. network's need to perceive genuine need) remains; ZK is the candidate.

## NEW design principle — per-holon, per-context settings + experimentation (owner, 2026-06-10)

Owner directive: *"there should be settings that allow for customization for each
person/hive in different contexts and for experimentation."* This composes with
Simon's per-holon instinct ("each to their own"; gradient-curve shape likely
per-holon) and becomes a **first-class architectural requirement**:

- **Every parameter is a per-holon, per-context setting**, not a network
  constant: floor, ceiling, **gradient curve shape**, which decay mechanism(s)
  apply + rates, tithe %, transparency level, allocation-weighting policy
  (incl. Tree's tier rules), pool release rules.
- **Context-scoped:** a person or hive can run **different settings in different
  contexts** (e.g. a founder's NAO revenue policy ≠ their Care Circles policy ≠
  their personal household policy). Settings attach to a (holon, context) pair.
- **Experimentation-first:** settings are **versioned and swappable** so a holon
  can A/B different curve shapes / decay rules / tithe rates and observe effects;
  the design should include a **simulation / dry-run** path (model a flow epoch
  under a settings variant before committing real value). This also de-risks the
  live demurrage tension — try it in simulation per-holon before network-wide.
- **Defaults + override:** ship sensible defaults (e.g. TBFF-like gradient) that
  any holon/context can override. Hives are first-class configurable holons with
  their own treasury + settings.

→ Implies a **FlowPolicy** object keyed by `(holon, context, version)`, and an
experimentation/simulation harness as part of the package — not an afterthought.

## Updated reuse map (Rule 8)

| Need | Reuse |
| --- | --- |
| Holon nodes | DID/chain per person/hive (1596); new holon kinds for land/pool/goal |
| Trust channels (weights) | trust graph + propagation (030–031) |
| Flow agreement (formal end) | token `MintingAgreement` + consent/VC/ocap (040–042); spore promises/obligations as model |
| Money movement | token `token.pay` + splits/streams (1596); Superfluid/TBFF as streaming reference |
| IOU repayment | token `iou` kind (1596), first real consumer (Tree ReWoven $20k) |
| Pools / tithe | hive treasury (1596) generalised + splits; Grassroots commitment pooling as reference |
| Story upstream | signed narrative/evidence chain events; spore Evidence + 4 questions |
| Transparency / private edges | encrypted store + selective/revocable disclosure (010–016); ZK = new R&D |
| Per-holon/context settings | **new** `FlowPolicy` object + simulation harness |
| Threshold/gradient/demurrage engine | **new** core; study **TBFF** (`tbff-protocol`) reference |

## Resolved vs. open

**Resolved by the intakes (owner forks closed):**
- Floor / pull-in direction → **confirmed co-equal** (Simon: $7K floor, gradient,
  receive-below-floor). The owner's bidirectional brief is vindicated by the
  second user; Tree simply didn't surface it.
- Transparency → **outcome-transparency + story-upstream**, reconciles Tree's
  "everyone sees everything" with NAOMS encrypted default.

**Open questions carried to DESIGN (consolidated, for owner / Tree / Simon):**
1. Unify contract ↔ trust-weight as one "flow agreement" with a formality dial —
   confirm.
2. Which of the three anti-accumulation mechanisms apply, where, by default.
3. Pool **release rules** (buffer trigger; purpose-pool one-time discharge auth).
4. **Story → actionable trust signal**: concrete mechanism (quest/threshold event
   → network perceives → flows toward).
5. ZK / selective privacy: how much to resource now vs. hold as direction.
6. Woven governance / "council" for stopping a flow — concrete shape.
7. **chainType decision:** reuse `token` vs. a new `flow`/holon chain (the
   holon + policy + story model may warrant its own).
8. Gradient-curve representation + the `FlowPolicy` settings schema + the
   simulation harness scope (owner's experimentation requirement).
9. Tree follow-ups still open: ReWoven IOU per-consultant vs collective; her
   floor; protected savings; delegation; overlooked-contributor protection.
10. Scope (Simon): the ~10 people in two other startups in-network or separate;
    name the bioregional members + Foundations.

## Recommended next step

Move to **DESIGN (03-design)** with this synthesis + the Tree synthesis +
prior-art as the brief, **after a short owner alignment** on the four biggest
forks: (a) one "flow agreement" primitive with a formality dial; (b) holon as the
universal node; (c) which anti-accumulation mechanisms are in the MVP; (d)
chainType reuse-vs-new. The `FlowPolicy` + simulation requirement is now fixed
and should be designed in from the start. Recommended MVP target (honest, minimal,
per spore's caution): **one hive's revenue flowing through trust-weighted channels
to its members under a per-holon gradient policy, with one pool and story-upstream
events — simulated first, then live.**
