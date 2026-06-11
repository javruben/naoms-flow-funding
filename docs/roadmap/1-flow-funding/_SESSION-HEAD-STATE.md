# 1644 Flow Funding — SESSION HEAD-STATE (read this first)

**Updated:** 2026-06-11 · **Phase:** 02-research **COMPLETE (gate passed)** →
next is **03-design**. Worktree: `.claude/worktrees/1644-flow-funding`, branch
`1644-flow-funding` (pushed to origin, clean). MCP-down marker present → proceed
silently.

## Where we are in PROC-NEW-FEATURE (read the proc, don't paraphrase)

Canonical proc on disk: `src/packages/roadmap/doctrine/procedures-seed-part-1.ts`
(RESEARCH/DESIGN/RISK/PRE-ALIGN-GATE/ALIGN-WITH-USER/REDUNDANCY bodies) +
`-part-5.ts` (PROC-14-PLAN summary + frozen-plan schema). Phase dirs +
lifecycle: `.naoms/roadmap/AGENTS.md`.

- **SCOPE (01-backlog)** ✅ — `01-backlog/scope-intake.md`.
- **RESEARCH (02-research)** ✅ **GATE PASSED** — `findings.md` (synthesizer,
  star verbatim, every claim source-classed) + `approaches-considered.md`
  (trade-offs scored against the star). Per proc, *approaches-considered absent
  blocks 03-design* — it is present, so **DESIGN may open.**
- **DESIGN (03-design)** ⬅ **NEXT.** Not started.
- RISK (04) → PRE-ALIGN-GATE (12 checks) → **ALIGN-WITH-USER (FIRST HUMAN GATE)**
  → REDUNDANCY-CHECK → frozen-plan.md (SHA-pinned seam) → BUILD.

## What the next session must do (DESIGN, to the letter)

`PROC-NEW-FEATURE-DESIGN` = *"Author the design + test plan draft."* WHO (in
order): **software-architect** (runs an INDEPENDENT inventory pass — does NOT
trust this research's primitive claims; re-greps; e.g. re-verify the 1596 token
`iou` kind / `token.pay` / hive `stewardship` template on the LIVE branch),
**systems-architect** (cross-package invariants, BLOCKING verdict), **product-
designer** (full felt experience + the binding mocks). Output: ONE consolidated
`03-design/design.md` + a draft `test-plan-v1.md` (every design intent → ≥1
contract row; UI-visible intents → tier=e2e real-pointer driver).

Design MUST decide the `[blocks-design]` forks (see `approaches-considered.md`
shortlist): **A1** one flow-agreement w/ formality dial · **A2-pkg** one package,
modalities-as-engines · **A3** gradient+activity-decay live, demurrage
simulation-first · **A4** new `flow` chain + reuse `token.pay` · **D2** fairness-
under-scarcity · **E4** story→trust-signal mechanism · **H2** private-edge vs
perceive-need (ZK scope). Carry these as leans INTO design; the owner ratifies at
ALIGN.

Design MUST be **mock-first** (`02-research/ui-surfaces-and-mock-first-plan.md`,
spirit of 1668): binding mocks authored in 03-design for the wallet surfaces
(MVP four: flow-agreement creation, FlowPolicy configuration, flow/velocity,
simulation), extending the 1627 wallet — not a new app.

## The architecture in one paragraph (pre-design hypothesis, owner-aligned inline)

A trust-full watershed of **holons = existing identities** (person / hive /
agent / device; land/river = `stewardship` hive; pool = hive+treasury). One
**flow-agreement** primitive on a formality dial (relational weight ↔ contract).
Modalities are **pluggable engines** (threshold/gradient · relational-steward ·
commitment-pool · tithe · demurrage) selected per **`FlowPolicy(holon, context,
version)`** — the owner's per-person/hive per-context + experimentation
requirement; includes a **simulation/dry-run** path. Anti-hoarding = THREE
distinct mechanisms (gradient / activity-decay / balance-demurrage — don't
conflate). Allocation is **emergent** (need=gravity, trust=terrain, no central
router — Simon's make-or-break). Transparency = outcome-transparency + story-
upstream. Value rides the 1596 `token.pay` ledger; flow funding routes it, it
does not mint.

## Key artifacts (all under 02-research/ unless noted)

- `findings.md`, `approaches-considered.md` — RESEARCH gate (this seam).
- `intake-responses/{tree,simon}-2026-06-10.md` — the two real users.
- `intake-synthesis-tree.md`, `intake-synthesis-simon-and-merge.md` — the merge.
- `foundations-1596-1627.md` — token ledger / wallet / trust substrate.
- `flow-funding-research.md`, `prior-art-spore-flow-funding.md` + 5 inspiration
  entries at `docs/design/inspiration/{flow-funding,tbff-protocol,commitment-pooling,spore-bkc,compost-capital}.md`.
- `open-questions.md` — living log for ALIGN (forks A–L).
- `ui-surfaces-and-mock-first-plan.md` — mock-first UI discipline.

## Standing constraints (don't relearn)

- Zero Rule: work only in this worktree. Push ≠ merge (don't submit to queue
  unless owner says land). Commit+push roadmap artifacts as hygiene.
- Honesty caveats to preserve: Ruddick's real 4 functions = Curation/Valuation/
  Limitation/Exchange; spore "CAT receipt chains" undefined; Compost Capital
  flywheel/tithe are NAO-internal not Benjamin Life's essay; 1596 token specifics
  are on an UNMERGED branch (re-grep at DESIGN).
- Five Rules #4: prefer local agents for sub-agent crew where feasible.
- Do NOT touch port 3147 (production). Do NOT inspect/edit the foreign
  1668 worktree (read-only reference).
