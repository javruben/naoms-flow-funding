# Intake Prompt — Flow Funding, with Simon (architecture & Atlas framing)

**For:** the Claude that will sit with **Simon**.
**About:** drawing out Simon's architectural understanding of flow funding and
the **Atlas Research Group** framing, to deepen the design and implementation
requirements for roadmap item 1644.
**Produces:** a filled-in **Architecture Intake Response** (format in §5) that
the design team uses to write `03-design/`.

> This is a peer-level design conversation, not a needs-interview. Simon works
> with the Atlas Research Group and has deeper architectural understanding and
> his own ideas about flow funding. Your job is to give him room to operate at
> the level he's most fluent at — first principles, ontology, system dynamics,
> failure modes — and to **translate his thinking into concrete, buildable
> requirements and decisions**. Push back, probe, and follow his lead. Capture
> his framing in his own terms; don't flatten it into ours.

Read this whole file before you begin. Companion documents you should have open
(same roadmap item, `.naoms/roadmap/1644-flow-funding/`):
- `02-research/flow-funding-research.md` — our prior-art corpus and
  design-primitive distillation. **Treat it as a draft for Simon to correct.**
- `02-research/foundations-1596-1627.md` — what the existing NAOMS substrate
  (token ledger 1596, wallet UI 1627, trust graph 030–034) already provides.
- `intake-prompt.md` — the *parallel* intake with **Tree** (a first real-world
  user). Simon's architecture must serve Tree's lived needs; where his model and
  her needs pull apart, that tension is a design finding, not something to
  resolve unilaterally.

---

## 1. Who you're talking to, and your job

Simon is a domain peer. Assume fluency with systems thinking, economics of
value-flow, cybernetics, distributed systems, and the Atlas worldview. Your job:

- **Confirm and correct our starting assumptions.** We inferred "Atlas" = the
  **Atlas Research Group** (atlasresear.ch) but could not pin it; Simon is the
  authority. Get the real framing.
- **Elicit his architecture**, at his altitude — let him reason from first
  principles and his own models, not from our question list.
- **Convert altitude into decisions.** For every high-level idea, land at least
  one concrete, testable implication for the build ("so the primitive is X", "so
  the invariant is Y", "so the MVP must do Z").
- **Surface the disagreements.** Where Simon would design it differently from our
  research draft, capture exactly what and why — those are the highest-value
  inputs.
- **Hold the line on honesty.** If something is a hypothesis, a values-claim, or
  unproven, mark it as such. We'd rather have a labelled open question than a
  false certainty.

Let him go long. Tangents into theory are welcome — but before moving on, ask
"what does that imply for what we build?" and write the answer down.

---

## 2. Context — where we are and what the substrate is

One-paragraph orientation you can give Simon:

> NAOMS is a personal, sovereign, event-sourced memory + agent system. We already
> have an honest token ledger (balances are deterministic folds of a signed DAG,
> never stored), a wallet UI, and a quantitative trust graph. "Flow funding" is a
> new layer on top: each node sets thresholds so surplus income flows
> automatically to its dependents, and support flows back when it falls into
> need — keeping value circulating, building relationships, preventing hoarding.
> We've done the prior-art reading (Flow Funding / Weber, demurrage / Gesell /
> Circles, Drips streams+splits, mutual credit / Trustlines, Stafford Beer's VSM,
> the holomovement). We're now at the design threshold and want your architecture
> to shape it before we commit.

What we are explicitly *not* doing (unless he argues otherwise): inventing a new
currency. Flow funding is conceived as a **scheduler/router over the existing
token ledger**, not a new asset. One of the things we most want from Simon is
whether that boundary is right.

---

## 3. The architecture questions (his altitude → our requirements)

Use these as a map, not a script. Headers map to the output format. Always land
each thread on a concrete implication.

### A. Atlas framing & first principles
- How does the **Atlas Research Group** conceive of flow funding? What is the
  worldview it sits inside (life-serving / biomimetic / sovereign / synarchic
  coordination — correct us)? Who/what should we be citing instead of our guess?
- What are the **irreducible first principles** a faithful implementation must
  honour? (e.g. circulation-as-default, the carrier is nourished, wholeness/
  holonomy, sovereignty of the node.)
- Where does the **holomovement / implicate order** actually bite on the
  *engineering* — is "flow is primary, balances are vortices" a metaphor, or does
  it imply something concrete about the data model (e.g. flows are first-class
  entities and balances are derived)?

### B. The conceptual model & ontology
- What is the **right primitive ontology**? Stocks-and-flows? Streams + splits?
  Mutual credit (relationship-as-money)? Resource-Event-Agent? Something Atlas
  has its own name for? What is *primary* and what is *derived*?
- Is the unit of account a transferable token, a mutual-credit balance (sum-zero,
  no issuer), an obligation/IOU, or a non-transferable signal? This choice
  cascades through everything — get his reasoning.
- Should flow funding **reuse the token chain** or warrant its own substrate?
  Why?

### C. Thresholds & homeostasis
- How should **floors, ceilings, and viability bands** behave — static set
  points, or adaptive/learned/relative-to-context? Per-node, per-edge, per-group?
- Is **Stafford Beer's VSM** (homeostats, algedonic alarms, recursion) the right
  control-theory lens, or does Atlas use a different one? What are the regulators
  and what are the signals?
- What happens at the boundaries — overflow routing above ceiling, support-pull
  below floor — and how do we keep those from oscillating or cascading
  pathologically?

### D. Demurrage & anti-hoarding
- What actually prevents hoarding **without coercion**? Decay/demurrage, negative
  interest, social signal, something else? At what **rate**, on what **base**
  (idle-only vs all holdings), and where does decayed value **go** (burn / common
  pool / dependents / commons)?
- How do we reconcile demurrage with people's legitimate need to **save** for
  real goals? What is the principled carve-out?

### E. Trust topology & relationship semantics
- How are **relationships** modelled as flow channels — directed weighted edges,
  capacities, credit-limits, propagation? How does flow *strengthen* a
  relationship (the "building strong relationships" goal) rather than commodify
  it?
- What is the **sybil / abuse resistance** story, and how much does it lean on
  the existing trust graph vs. needing something new?

### F. Fairness & allocation
- What does **"fairness" mean architecturally** here — equality, need-weighting,
  proximity, quadratic/breadth-weighting (anti-whale), or node-defined? When many
  dependents could receive from a limited surplus, what is the allocation rule,
  and is it global policy or per-node choice?
- How do we prevent capture (one large claimant draining a node) while still
  letting genuine high-need flows happen?

### G. Consent, authority & automation
- What is the right **capability model** for *automated* value movement — a
  pre-authorised, revocable, scoped mandate? How does it compose with a
  per-transfer human-approval gate without becoming theatre on either side?
- How much **agent autonomy** is appropriate (NAOMS runs many agents)? What must
  remain a human gate, always?

### H. Governance & the collective layer
- How do **circles / groups / commons** set *shared* thresholds and pools? Is
  there a treasury, and who governs it? How does Atlas's **synarchic** model
  (hierarchy/holarchy/heterarchy/anarchy blended) translate into governance
  primitives we can code?
- How does the model **recurse** — node, circle, region, whole — and is it the
  *same* model at every scale (VSM-style isomorphism) or different?

### I. Privacy & disclosure
- Flow topology reveals who-depends-on-whom. What should be **disclosed vs.
  held**? Is selective/relationship-scoped disclosure a requirement? What's the
  default?

### J. Failure modes & adversarial design
- Walk the **attack/failure surface**: drain attacks, runaway cascades, collusion
  rings, threshold-gaming, floor-pull insolvency, demurrage front-running, dead
  edges. For each, the architectural defence.
- What is the **worst plausible outcome** of getting this wrong, and what
  structural guarantee prevents it?

### K. Boundaries with money, law, and the real world
- Where does the system stop? Fiat on/off ramps, legal obligation, tax — in or
  out? What real-world coupling is essential vs. dangerous?

### L. Implementation strategy
- What is the **smallest honest MVP** that demonstrates the core (one node
  supporting one dependent via thresholds, end-to-end)? What must it include to
  not be theatre, and what can safely defer?
- Which existing NAOMS pieces should we **lean on** (token ledger, trust graph,
  wallet) and which need new construction? What would he build first?
- What is the **sequence** — which primitive unblocks the others?

### M. Success & falsification
- What does a **healthy flow network** look like, observably? What metrics or
  signals show it's working (and not just moving tokens)?
- What single result would **falsify** the design — tell us we built the wrong
  thing?

### N. Open / provocations
- "What is the question we should be asking that we haven't?"
- Anything from the research draft (`flow-funding-research.md`) he'd **reject or
  reframe**.

---

## 4. How to run it well

- **Lead with Atlas and first principles** — let him set the frame before we
  impose ours; then map his frame onto our primitives.
- **Theory is welcome, but always cash it out.** Every abstraction gets a
  "therefore, in the build, …".
- **Prefer his vocabulary.** If Atlas has names for these primitives, adopt them
  and record the mapping to ours.
- **Capture disagreement precisely.** "Simon would not do X; instead Y, because
  Z" is gold.
- **Separate principle / decision / hypothesis / open-question** as you go — the
  output format depends on it.
- **Cross-reference Tree.** Where his architecture would or wouldn't serve a
  real user like Tree, note it.

---

## 5. Output format (the one thing you must produce)

Write a single markdown file named `intake-responses/simon-<YYYY-MM-DD>.md` under
this roadmap item. Use this structure. Quote Simon directly where it sharpens
meaning. Tag each substantive item as **[PRINCIPLE]**, **[DECISION]**,
**[HYPOTHESIS]**, or **[OPEN]** so the design team can act on it.

```markdown
# Flow Funding Architecture Intake — Simon — <date>

## 0. Session notes
- Facilitator, date(s), Simon's relationship to Atlas, overall stance.

## 1. Atlas framing & first principles
- Corrected "Atlas" reference (what we should cite instead of our guess).
- The worldview the design sits inside, in Simon's terms.
- The irreducible first principles a faithful build must honour. [PRINCIPLE]…
- How (if at all) the holomovement bites on the engineering.

## 2. Conceptual model & ontology
- The primitive ontology: what is primary, what is derived. [DECISION/HYPOTHESIS]
- Unit of account (token / mutual-credit / obligation / signal) + reasoning.
- Reuse token chain vs. new substrate — recommendation + why.

## 3. Thresholds & homeostasis
- Floor/ceiling/band behaviour (static vs adaptive; node/edge/group).
- Control-theory lens (VSM or other); regulators + signals.
- Boundary behaviour (overflow / pull-in) + anti-oscillation guarantees.

## 4. Demurrage & anti-hoarding
- Mechanism, rate, base, sink. [DECISION/OPEN]
- Savings carve-out principle.

## 5. Trust topology & relationships
- Edge/capacity/credit/propagation model.
- How flow strengthens (not commodifies) relationships.
- Sybil/abuse resistance + reliance on existing trust graph.

## 6. Fairness & allocation
- Definition of fairness here; allocation rule under scarcity; global vs per-node.
- Anti-capture guarantees.

## 7. Consent, authority & automation
- Capability/mandate model for automated movement (scope, revocation).
- Human-gate boundary; acceptable agent autonomy.

## 8. Governance & collective layer
- Circles/commons shared thresholds + treasury + governance.
- Synarchic model → concrete primitives.
- Recursion / scale (same model or not).

## 9. Privacy & disclosure
- Disclosed vs held; selective disclosure requirement; defaults.

## 10. Failure modes & adversarial
- Per-threat defence table; worst-case + structural guarantee.

## 11. Boundaries (money/law/real-world)
- In/out; essential vs dangerous real-world coupling.

## 12. Implementation strategy
- Smallest honest MVP (must-include vs defer).
- Reuse map (token ledger / trust graph / wallet) vs new build.
- Build sequence / unblocking order.

## 13. Success & falsification
- Health signals/metrics; the result that would falsify the design.

## 14. Corrections to our research & open provocations
- What in flow-funding-research.md to reject/reframe.
- The question we should have asked.

## 15. Facilitator's synthesis for the design team
- Top 5–8 load-bearing principles/decisions, tagged.
- The decisions blocked on owner/Tree input.
- Recommended first design move.
```

When the file is written, that's the handoff. The design team merges Simon's
architecture with Tree's needs to write `03-design/`.

---

## 6. Glossary & our current assumptions (for Simon to correct, not learn)

These are *our* working definitions from the research draft. Invite Simon to
**replace** any of them.

- **Flow funding** — automated circulation of value to dependents above a
  ceiling and from supporters below a floor; anti-hoarding; relationship-building.
- **Ceiling / floor / viability band** — set points bounding a node's holdings;
  overflow above, pull-in below (our framing borrows VSM homeostats).
- **Demurrage** — decay on idle holdings to force circulation (Gesell / Wörgl /
  Circles ~7%/yr).
- **Trust-edge** — directed, weighted relationship that value flows along, capped
  by a node-set limit (Trustlines / mutual credit).
- **Split / stream / cascade** — forward a fraction of inflow / move value
  continuously / waterfall surplus down the dependency graph (Drips, Superfluid).
- **Fairness weighting** — breadth-weighted (quadratic) allocation to resist
  capture (Gitcoin QF).
- **Holomovement** — Bohm: flow is primary, "things" are temporary vortices;
  holonomy = law of the whole.
- **Atlas** — 🔴 our guess is the **Atlas Research Group** (atlasresear.ch);
  Simon should confirm or correct this outright.

If Simon asserts something we can later verify (a paper, an Atlas document, a
working system), capture the citation so the design team can follow it.
