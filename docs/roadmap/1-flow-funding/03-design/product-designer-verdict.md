---
item: 1644-flow-funding
phase: 03-design
role: product-designer
authored: 2026-06-12
star: "What if money knew when to keep moving — flowing on to those who depend on us, and back to us when we are the ones in need — so no node hoards while a dependent goes without?"
---

# 1644 Flow Funding — Product Designer Verdict

## The star as a product feeling

The star is not a feature description. It is a *felt state* the product must produce: the relief of knowing that when you are in need, flow finds you — and the satisfaction of knowing your surplus doesn't sit idle while someone who depends on you goes without. The product succeeds when a person can look at their flow configuration and feel that it mirrors how they actually want value to move through their relationships, not what they can manually manage.

---

## Jobs to be done (JTBD)

### Person / mutual-aid member
- **When** I have more than I need right now **I want** it to quietly reach people in my network who are below their floor **so that** I don't have to track who's struggling or make awkward offers.
- **When** I'm in deficit **I want** support to find me automatically **so that** I don't have to ask.
- **When** I'm setting up my relationships **I want** to see a gradient — not a hard tap-on/tap-off — **so that** I'm always giving something, even while I'm also receiving.

### Founder / ecosystem architect (Tree)
- **When** I'm negotiating a contribution agreement **I want** to encode the exact terms (%, duration, IOU) in one place **so that** the flow executes what we agreed without me needing to track it manually.
- **When** my income shifts from salary-heavy to residual-heavy over time **I want** the system to honor the residual streams without re-configuration **so that** the agreements I made early continue to work.
- **When** a collaborator drifts away from the ecosystem **I want** their flow to diminish naturally **so that** I don't have to terminate anything explicitly.

### Bioregional / relational steward (Simon)
- **When** my team's income fluctuates month to month **I want** the ceiling/floor gradient to smooth out the worst months automatically **so that** we stay focused on the work, not survival math.
- **When** I configure my trust topology **I want** to set channel widths by relationship quality — not by category or rule **so that** the system reflects what I actually know about each person.
- **When** the network accumulates more than it needs **I want** surplus to cascade toward the earth, to the people doing unpriceable regenerative work **so that** the protocol fulfills its actual purpose.

### Open-source maintainer / mutual-aid organizer
- **When** I'm starting a new contribution relationship **I want** a lightweight trust-weight that requires no formal contract **so that** I can flow support to contributors without legal overhead.
- **When** I run a mutual-aid circle **I want** to see who in the circle is currently below floor **so that** the circle collectively keeps its members viable.
- **When** I receive more than I need in a good month **I want** the tithe to the commons pool to happen automatically **so that** abundance circulates without me having to decide each time.

---

## Felt states

### First-run
The user has no flow agreements and no FlowPolicy set. The page should feel *inviting, not empty*. Show the "river" metaphor — the velocity view with a placeholder gentle animation, a clear first-step call to action ("Set your viability band — your floor and ceiling") and a secondary ("Create your first flow agreement"). Do not show a blank grid or error state.

### In deficit / being supported
The user's balance is below floor. The velocity view hero shows "In deficit" in the yellow tone (not red — deficit is not a failure, it is the protocol working). Flows in from the network are visible, named by relationship. The feeling is: *you are held*. Show who is supporting you and approximately how much, with privacy appropriate to each edge's transparency setting.

### My cup is full (surplus / outflowing)
The user is above ceiling. The velocity view hero shows "My cup is full" in the green tone. Outflows are visible — who is receiving, approximate amounts — with a short cascade preview (A supports B who supports C). The feeling is: *your surplus is doing something*. Avoid language like "spending" or "giving away" — use "flowing to" or "circulating through."

### Recovery from a bad flow
A flow agreement lapsed, a node left the network, or a flow was stopped manually. The user sees the change in their velocity view — a channel that was active is now quiet. They should be able to see what happened (agreement ended / node departed / manually stopped), and have a gentle prompt to update their configuration if needed. No alarm, no shame — flows ending is normal.

---

## Social, trust, and cognitive-load shape

**The most important insight from the intakes:** both Tree and Simon frame flow funding as a *governance architecture*, not a personal finance tool. The cognitive load ceiling is set by the hardest task: negotiating a flow agreement with someone you've never worked with. Everything else should be lighter.

**Trust is not a setting; it is the terrain.** The product never shows a "trust score" to edit. It shows *channel width* (how much can flow through this relationship) and *relationship type* (relational weight / contract). The user understands this as: "how open is this channel" not "how much do I trust this person numerically."

**Social load:** Flow funding operates in deeply relational contexts (mutual aid circles, founding teams, regenerative projects). The UX must not force numerical precision where imprecision is appropriate. Ranges, gradients, and approximate thresholds serve this better than precise amounts. 🟡 UNVERIFIED: the specific gradient curve shape (generous-early vs. linear vs. cautious) is a per-holon preference whose defaults require owner ratification.

**Transparency by default (Tree's requirement):** The default transparency level for a flow agreement is *outcome-transparent* — the network can see that value flowed and its purpose, but not the exact amounts, unless the user chooses fully-transparent. This reconciles Tree's "everyone sees everything" with Simon's need for some edge-level privacy and NAOMS's encrypted-default.

**Cognitive load management:** The formality dial on flow-agreement creation is the single most load-bearing UX decision. It must make the relational-weight end feel low-friction and the contract end feel precise and trustworthy — not bureaucratic. The slider is the affordance; the fields revealed at each end are the mechanism.

---

## Market and competitive landscape

### Drips (streaming tokens to open-source maintainers)
Continuous token streams, wallet-to-address. Pure automation, no relationship layer, no floor/ceiling gradient, no story-upstream, no pools. Serves open-source funding well but has no model for mutual aid, bioregional stewardship, or trust-mediated topology. Flow funding is differentiated by: the gradient (not a fixed stream rate), the trust topology (channels are relational), the simulation surface (experiment before committing), and the story-upstream mechanism (unpriced work becomes legible).

### Superfluid (programmable cash flows)
EVM-native continuous streaming with complex agreements. Technically powerful but requires on-chain gas and developer fluency; no "soft" relational weight end of a dial; no floor/ceiling logic; no simulation. Flow funding's differentiation: runs over NAOMS's event-sourced ledger without on-chain gas; the formality dial covers the relational end Superfluid can't reach; simulation-first before committing real value.

### Open Collective (fiscal hosting + transparent budgets)
Transparent pooling for open-source projects and community groups. Strong on the commons/pool side, weak on individual-to-individual flows, no floor/ceiling logic, no gradient, no trust topology. Flow funding's differentiation: pools are first-class nodes in the flow graph (not a separate platform); individual flows and pool contributions are the same gesture; the trust topology mediates all allocation.

### Grassroots Economics / Sarafu (commitment pooling, community currencies)
Production-scale (~55k users) commitment pooling with demurrage, voucher pools, and community exchange. The closest prior art for the pool + demurrage mechanics. Flow funding's differentiation: integrates the pool mechanic with individual gradient flows and trust topology; story-upstream as accountability; simulation surface for demurrage design. Key reuse: GE's pool model is the highest-quality prior art for the buffer/purpose pool design.

### GoFundMe (one-time crowdfunding)
Point-in-time, platform-intermediated, extractive fee model, no ongoing flow. No relevant competitive pressure for flow funding's use cases. Named here only to distinguish: flow funding is not crowdfunding. It is ongoing, trust-mediated, and anti-extractive by design.

### Positioning
Flow funding occupies a space none of these fill: **relational, gradient, trust-mediated, simulation-first, story-accountable, anti-extractive value circulation for small-to-medium mutual networks** (households, founding teams, mutual-aid circles, open-source ecosystems, bioregional stewardship groups). The formality dial is the unique affordance — it means one primitive serves both Simon's relational watershed and Tree's codified revenue-share without requiring two systems.

---

## Business and positioning shape

**Who benefits:**
- Founding teams (Tree: NAO, Care Circles, ReWoven) — revenue-share governance without a lawyer for every agreement.
- Mutual-aid circles — floor/ceiling automation so the organizer doesn't have to track who's struggling this month.
- Open-source ecosystems — lightweight trust-weight flows to contributors without formal employment.
- Bioregional stewardship groups (Simon: Atlas Research Group, Sierra Nevada de Santa Marta team) — permanent flows to unpriceable regenerative work the market cannot see.
- Multi-generational households — long-horizon flows that honor the "salary-heavy now, residual-heavy later" arc.

**Who would adopt (adoption profile):**
The early adopter is someone who already practices informal mutual aid and has hit the cognitive-load wall of tracking it manually. They are values-aligned (anti-extractive, regenerative), technically literate but not crypto-native, and already inside a small trusted network (5–50 people). They will adopt flow funding because it codifies what they already do, not because it introduces a new practice.

**Anti-adoption signals to avoid:** Any UX that looks like a financial product (forms, legal language, "account"), requires blockchain literacy, or forces numerical precision where relationships are approximate. The product must feel like infrastructure for people who already live in relationship, not a fintech onboarding funnel.

---

## Naming, defaults, and copy guidance

**What to call things:**
- "Flow agreement" (not "contract" for the relational end; "contract" is appropriate only when the formality dial is at the codified end)
- "Viability band" (floor + ceiling together, as a concept)
- "My cup is full" / "In deficit" (Simon's vocabulary; use these exactly)
- "Flow to [name]" / "Flows in from [name]" (not "payment" / "income")
- "Channel" (not "link" or "connection")
- "Gradient" (not "sliding scale" — gradient is more precise)
- "Simulate" / "dry-run" (not "test" — test implies correctness checking; simulate implies exploration)
- "Tithe to the commons" (not "fee" or "tax" — tithe is voluntary and relational)
- "The earth" / "stewardship hive" (Simon's vocabulary for flow-to-land)

**What NOT to call things:**
- Never "wallet" for the flow-funding surfaces (wallet is the 1627 token surface; flow funding extends it but is not a wallet)
- Never "transfer" (implies one-time; flow is ongoing)
- Never "balance" for the viability band (balance implies static; floor/ceiling implies dynamic)
- Never "algorithm" for the allocation (it emerges from trust; algorithmic framing destroys the relational quality Simon requires)

**Default FlowPolicy values (🟡 UNVERIFIED — require owner ratification at ALIGN):**
- Gradient curve: generous-early (begin flowing out at ~20% above floor, not only at ceiling)
- Anti-hoarding: gradient outflow ON by default; activity-decay ON; demurrage SIMULATION-ONLY
- Tithe to commons: 3% default (🟡 — this is a guess; owner must set)
- Transparency: outcome-transparent (network sees purpose, not exact amounts)

---

## Three chosen personas and rationale

### Why these three

The persona set must cover the two real intakes (Tree and Simon) plus a third that stress-tests the relational/lightweight end of the formality dial. The two real users anchor the design in verified, first-person testimony. The third fills the gap neither intake covers: a mutual-aid circle organizer who has no interest in revenue-share contracts and needs the relational-weight end to be genuinely lightweight.

**Persona 1: Tree Willard** — grounds the codified-contract end of the formality dial, the multi-organization ecosystem architecture frame, the full-transparency requirement, and the salary→residual arc. Her JTBD drives the flow-agreement creation mock.

**Persona 2: Simon (QB)** — grounds the gradient (not two switches), the trust-as-topology frame, the bioregional/stewardship hive flow, the simulation surface (he needs to experiment with demurrage before committing), and the story-upstream requirement. His JTBD drives the flow-policy config and velocity view mocks.

**Persona 3: Yara Osei** — a mutual-aid circle organizer (see `personas/yara-osei.md`). Grounds the lightweight relational-weight end of the dial, the "I don't want to think about math" user, the mobile-first use case, and the commons pool tithe. Stress-tests whether the product can serve someone who will never set a floor/ceiling in dollar amounts — only in felt thresholds ("enough to breathe," "more than I need this month"). Her JTBD drives the verification that the formality dial is genuinely low-friction at the relational end.
