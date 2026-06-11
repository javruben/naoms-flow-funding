---
item: 1644-flow-funding
phase: 03-design
persona: simon-qb
source: intake-responses/simon-2026-06-10.md (real user)
authored: 2026-06-12
---

# Persona: Simon (QB)

## Who he is

Simon is a founder working at the intersection of regenerative finance, holonic technology, and ecological economics (Atlas Research Group, AWIP, Compost Capital, and two additional startups). He thinks in watersheds, not spreadsheets. His mental model of value is deeply biomimetic: flow follows need, trust is the terrain, and nobody routes from a centre.

He carries responsibility for a core team of four co-founders (Zachary, Cataleya, Gertie) whose needs shift month to month (one has a new baby; rent alone is ~$3K/month for all four). His ceiling is $15K/month for the team; his floor is $7K. Below $7K, the work suffers because survival takes over.

He also carries a larger network: the NAO team, an ARG team, and — most importantly — four bioregional team members in the Sierra Nevada de Santa Marta working with indigenous and local communities. This is the keystone of his entire worldview: flow must ultimately gravitate toward the earth, toward the unpriceable regenerative work the market cannot see.

## Context

- Trust topology: each person weights their own relationships; Simon controls his channels and widths; allocation emerges from the aggregate — nobody routes from a centre
- Demurrage is interesting but live-tension (could push toward investment, reducing circulation); needs to experiment before committing
- Pools: wants both a buffer pool (fills in good times, releases below-floor in bad) and a purpose pool (fills to a target, discharges once into land/infrastructure to permanently lower the floor)
- Story upstream: money flows down, story flows up — outcome-transparency, not transaction-transparency
- Costs trending toward zero: the Compost Capital flywheel as the protocol's engine; as extraction drops, floors drop, more surplus circulates

## Emotional starting state

Enthusiasm mixed with wariness. He has been thinking about this architecture for years (Compost Capital, the watershed metaphor) and the idea that NAOMS could implement it is genuinely exciting. His wariness is specific: any version that removes trust from the topology — that routes algorithmically without relationship — will be rejected. He needs the system to be "trust-full, not trustless." If the trust topology feels mechanical rather than relational, he won't use it.

## Job to be done

**When** he is configuring his FlowPolicy, **he wants** to set a gradient curve (not two switches) for his viability band, experiment with demurrage in simulation mode to understand its incentive effects on his specific network, and see the cascade preview — who his outflows support downstream — so that he can verify the protocol's behavior matches his mental model of the watershed before committing real value.

Secondary: **When** he sets his channel widths to each team member and each recipient in his extended network, **he wants** to do it by relationship quality (how much he knows and trusts each person), not by category rules, and see a topology preview showing that the aggregate of everyone's individual choices produces allocation that gravitates toward the earth (toward the bioregional recipients at the lowest point).

## 07-verification goal

**Simon opens the FlowPolicy configuration surface for his "AWIP core team" context, sets floor=$7K/month, ceiling=$15K/month, gradient curve=generous-early, gradient outflow=ON, activity-decay=ON, demurrage=SIMULATION-ONLY; then opens the simulation surface, runs a 3-month epoch with a synthetic income stream that dips below floor in month 2, and verifies that: (a) the gradient state transitions correctly (surplus in month 1, deficit in month 2, recovery in month 3); (b) the demurrage effect is visible in the simulation results but does not affect the live ledger; (c) the cascade preview shows that his outflows in month 1 reach the bioregional recipients through his trust channels.**

This is testable: the verification passes when the simulation surface displays a 3-period epoch with the correct gradient transitions, the demurrage column shows projected decay without live ledger impact (labeled "simulation only"), and the cascade preview names at least one downstream recipient in the bioregional layer.
