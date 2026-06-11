# 1644 Flow Funding — RESEARCH findings (synthesizer, authoritative)

**Item:** 1644 · **Phase:** 02-research · **Date:** 2026-06-11
**Gate role:** PROC-NEW-FEATURE-RESEARCH synthesizer output. Pairs with
`approaches-considered.md` (trade-offs scored against the star). Every claim
carries a source class — **CODE / GIT / DOCS / DESIGNS / ONLINE / INSPIRATION**
(INSPIRATION never load-bearing alone).

## The star (verbatim — D-STAR-ANCHOR)

> **"What if money knew when to keep moving — flowing on to those who depend on
> us, and back to us when we are the ones in need — so no node hoards while a
> dependent goes without?"**

Every finding below answers: *does this help follow the star?*

## Inputs synthesised

- Two real-user intakes — **Tree** (`intake-responses/tree-2026-06-10.md`) and
  **Simon** (`intake-responses/simon-2026-06-10.md`). [DESIGNS]
- Four prior-art deep dives, published as inspiration entries
  (`docs/design/inspiration/{flow-funding,tbff-protocol,commitment-pooling,spore-bkc,compost-capital}.md`).
  [INSPIRATION]
- NAOMS substrate read (`foundations-1596-1627.md` + live code). [CODE]
- Merge synthesis (`intake-synthesis-simon-and-merge.md`), Tree synthesis,
  open-questions log, mock-first UI plan.

## Load-bearing findings

1. **Both users + the independent spore/BKC corpus converge on the same
   primitives** — threshold/overflow, trust-mediated allocation, narrative
   accountability, pools, demurrage, regeneration-gravity. Convergence from three
   independent sources is strong evidence the design space is real. [INSPIRATION
   + DESIGNS] → serves the star: the mechanism people actually want *is*
   keep-moving-toward-need.

2. **"Holon" is NOT a new node type — it is the EXISTING identity taxonomy.**
   person / hive / agent / device. Land/river/ecosystem already exists as a
   **`stewardship` hive** (`src/packages/hives/templates.ts:183`,
   `linked_entity_did` at `types.ts:32`) with collective governance + treasury.
   [CODE, owner-confirmed] → Simon's "flow to the earth" = flow to a stewardship
   hive; pools/goals = hive + treasury. No parallel node type (Rule 8 / PC-471).

3. **Tree's contract and Simon's trust-weight are ONE primitive on a formality
   dial** — a *flow agreement* (relational weight ↔ codified revenue-share
   contract). NAOMS is agreement-centric (Honor Rule; token `MintingAgreement`;
   consent/VC/ocap 040–042). [INSPIRATION + DESIGNS + CODE]

4. **The modalities are interoperable engines over one substrate, not a menu.**
   Hub Cultivator (relational), TBFF (threshold/gradient), commitment pooling,
   Compost-Capital tithe, demurrage all read/write the same flow event +
   ledger + channel; they differ only in *trigger* and *authorization*. A
   `FlowPolicy(holon, context, version)` arms which engines run with what
   parameters. [INSPIRATION + owner experimentation requirement] → directly
   serves "configure each person/hive in different contexts."

5. **TBFF's convergence math is the highest-value reusable core, but it is
   testnet-demo, hard-cutoff, no-demurrage.** `x' = min(x,t)+Pᵀ·max(0,x−t)`,
   rows-sum-to-1 conservation; zero Ethereum dependency → maps to a NAOMS fold.
   [INSPIRATION: `tbff-protocol.md`] Simon's **gradient** (not two switches) is a
   genuine extension TBFF lacks. [DESIGNS: Simon intake]

6. **"Prevent hoarding" is THREE distinct mechanisms — do not conflate.**
   (a) gradient outflow, (b) activity-decay of *entitlement* (Tree "stay in the
   river"), (c) demurrage on idle *balances* (Gesell/Sarafu ~2%/mo→commons).
   Only (c) carries Simon's LIVE tension (decay → investment-flight). [DESIGNS +
   INSPIRATION] NAOMS ships **no demurrage** today (grep `demurrage` on
   `src/`+`rust/`, 2026-06-10 — empty). [CODE]

7. **Transparency reconciles as outcome-transparency + story-upstream.** Tree's
   "everyone sees everything" + Simon's bidirectional channels (money down, story
   up, deliberation lateral) → the network sees value created without every
   transaction in the clear; keeps faith with NAOMS encrypted-default (010–016).
   Residual: private-edge vs. perceive-need (ZK candidate). [DESIGNS]

8. **The value substrate already exists on the unmerged 1596 branch** — entry-
   based fold-projected token ledger (`token.pay`, invoice, attestation,
   `token_balance`, `iou` kind, hive treasury). Flow funding *routes* it; it does
   not mint a new asset. [CODE: 1596 branch, NOT yet on origin/main — re-verify at
   DESIGN]. [GIT: 1596 reserved id, branch `1595-token-branches`]

9. **Mock-first UI is mandatory** (owner 2026-06-11, spirit of **1668**): binding
   mocks as ground truth + per-M-row mock-fidelity gate on the real backend, over
   the **1627 wallet** (not a new app). 1668 itself is at 05-align, not landed.
   [DESIGNS: `ui-surfaces-and-mock-first-plan.md`; GIT: 1668 branch]

10. **Production-maturity is asymmetric.** Only Grassroots Economics commitment
    pooling is production-scale (~55k users); TBFF is testnet-demo, Hub
    Cultivator/BKC are pilots. Lean on GE's pool model; treat TBFF/BKC as
    research-grade to re-derive. [INSPIRATION]

## Honesty caveats carried forward (Owner Pref #12)

- 🟡 Ruddick's real four functions are **Curation/Valuation/Limitation/Exchange**,
  NOT the spore "provisioning/redistribution/activation/repair" quartet.
- 🟡 spore "CAT receipt chains" is **undefined** in the source.
- 🟡 "Compost Capital" public essay is **Benjamin Life's**; the flywheel + tithe
  the brief attributes to it are **NAO/Simon-internal**, not in that essay.
- 🟡 1596 token package specifics are on an **unmerged branch** — re-grep at
  DESIGN before relying on exact symbols.

## Gate status

- `approaches-considered.md` — **present** (sibling; trade-offs scored AGAINST
  the star). ✅
- synthesizer `findings.md` — **this file**; star restated verbatim; every claim
  source-classed. ✅
- → RESEARCH gate satisfied; **03-design may open.**

## Open questions → ALIGN

All unresolved decisions live in `open-questions.md` (forks A1–A5 + B–L). The
`[blocks-design]` subset is enumerated and scored in `approaches-considered.md`.
