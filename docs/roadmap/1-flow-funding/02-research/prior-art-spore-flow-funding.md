# Prior Art — Spore / BKC "Flow Funding" research doc (02-research)

**Item:** 1644 · **Date:** 2026-06-10 · **Source:**
`github.com/DarrenZal/spore` → `docs/research/connections/flow-funding.md`
(Darren Zal, BKC foundations). Surfaced via Simon's intake.

This is the **closest external prior art** to item 1644 and it is
production-grade in places. It independently describes the same design space and
names concrete reference protocols — strong **reuse-before-build** signal (Rule
8). Treat as a corpus to study, not invent around.

## Definition (theirs)

Flow funding = *"a governed capital allocation mechanism that moves resources
from abundance to need through trust relationships and ecological context."* Core
principle: *"allocation decisions should be made by people closest to the work,
not institutional gatekeepers."* Framed as a **protocol family**, not one design.

## The two named dispositions (both map onto Simon)

- **Hub Cultivator** (Regenerate Cascadia) — a funder gives to a trusted steward
  who distributes smaller grants; *"the steward's relational knowledge IS the
  allocation mechanism."* Trust-based, human-mediated. Accountability is
  **narrative** via four reflective questions ("What inspired you? What surprised
  you? What challenged you? What moved you?"). **→ This is Simon's "trust is the
  topology" + "story-as-accounting" exactly.** Maturity: pilot — 6 bioregions,
  ~13 landscape groups, $30K flowed.

- **TBFF — Threshold-Based Flow Funding** (MycoFi/Mycopunks,
  `LinuxIsCool/tbff-protocol`) — each participant declares a threshold (**"lake
  level"**); *"overflow above threshold redistributes algorithmically."* Uses
  **Superfluid CFA streaming** on Base; **demurrage-recycled surplus**;
  accountability is mathematical (on-chain settlement). **→ This is Simon's
  gradient/watershed + ceiling-overflow + the owner's threshold/demurrage brief,
  as a working reference protocol.** Maturity: experimental — 5 members, $32K test
  on Base Sepolia.

## Commitment pooling (the pool primitive, in production)

Grassroots Economics / Sarafu / CLC (Will Ruddick): promises/obligations, pool
create/pledge/verify, circulation via federation, settlement, evidence closure.
Lifecycle **PROPOSED → VERIFIED → ACTIVE → EVIDENCE_LINKED → REDEEMED**, writing
**Evidence entities** with *"CAT receipt chains to the shared knowledge graph."*
Maturity: **production — 26,367 users, 188 active pools, 745 vouchers, $320K+
volume; 1,200 acres restored, 84% positive income impact.** **→ This is Simon's
pools + Tree's contract/IOU-as-promise, already at scale.**

## The metabolic model (regen grounding)

Will Ruddick's **four concurrent functions: provisioning, redistribution,
activation, repair** — *"concurrent metabolic functions, not pipeline stages."*
Flow funding is a **"transitional membrane"** from legacy capital aiming at
**"healthy interdependence (reciprocal, visible, chosen)."** **→ Matches Simon's
"flow to the earth" keystone and the rent-freedom flywheel.**

## How it lands for 1644

- **Reuse targets:** study **TBFF** (`tbff-protocol`) as the threshold/streaming
  reference and **Grassroots Economics commitment pooling** as the pool/promise
  reference before designing our own primitives.
- **Validation:** our two users (Tree, Simon) and this independent doc converge on
  the same primitives — threshold/overflow, trust-mediated allocation, narrative
  accountability, pools, demurrage, regen-gravity. Convergence from three
  independent sources is strong evidence the design space is real.
- **Caution they flag (worth heeding):** *"Premature naming risks reifying a
  structure that may not survive contact with scale."* They deliberately treat
  flow funding as a clarification of an existing practice, not a grand new
  pattern. 1644 should likewise ship a minimal honest core and let it meet
  reality before over-formalising.
- **NAOMS mapping:** their **Evidence entities + CAT receipt chains + lifecycle**
  are directly analogous to NAOMS signed chains + attestation + materialized
  graph; Tree's "contract-as-spec" ≈ their **promises/obligations**.
