---
id: 1644
title: "Each node sets thresholds that automatically flow surplus income to its dependents and draw support from them, so value keeps circulating and no one hoards"
phase: 06-implement
status: implement
last-verified: 2026-08-24
opened: 2026-06-09
opened_by: 1644 (owner-initiated)
star: "What if money knew when to keep moving — flowing on to those who depend on us, and back to us when we are the ones in need — so no node hoards while a dependent goes without?"
priority: P2
related: [1596, 1627, 1595, 30, 31, 32, 33, 34]
work_type: new-feature
lifecycle: PROC-NEW-FEATURE
scope: "A new `flow-funding` package layered on the token ledger (1596) and wallet UI (1627). Each node declares per-relationship thresholds (a viability band: floor + ceiling) and split rules; when a node's holdings rise above its ceiling, surplus automatically flows out along its dependent/relationship edges; when they fall below its floor, support is automatically drawn in from those it has flowed to. Idle balances decay (demurrage) so value cannot sit still. Trust-edges set the channels and caps. The result is a homeostatic, relationship-building, anti-hoarding value-circulation layer. RESEARCH + DESIGN first; implementation gated on owner + user (Tree) intake."
verified-by: "roadmap triage sweep 2026-09-19"
type: roadmap
---

# 1644 — Flow Funding

<!-- STATE-SYNC:BEGIN 2026-08-24 -->
## Current State (verified 2026-08-24)

Measured against `origin/main` @ **`2e509f29dcc`** (`git rev-parse --short origin/main`, 2026-08-24).

> ⚠️ **NUMBER COLLISION — UNRESOLVED.** Two DIFFERENT roadmap directories carry id
> `1644`: this one (`.naoms/roadmap/1644-flow-funding/`, 67 files on main) and
> `.naoms/roadmap/1644-matrix-package/` (1 file on main:
> `06-implement/M-1644-W0-REFUSAL-BACKFILL/scope-mismatch.md`). A bare
> `git grep '1644'` hits both, and 1644-era branch names like
> `1644-matrix-package-2026-06-09` belong to the OTHER one. **Every measurement in
> this block is scoped to `.naoms/roadmap/1644-flow-funding/` and to
> `src/packages/flow-funding/`, and to nothing else.** Which item owns the number is
> not decided anywhere I could find.

**Where the work lives:** on `origin/main`. All 67 files of
`.naoms/roadmap/1644-flow-funding/` are present there. The three refs the sweep brief
named all still EXIST (`build3/HEAD`, `refs/heads/agent-5bf839a7-536`,
`refs/tags/1227-c19-2a-recovery-20260730`) and each carries a file list **identical to
main's** (`diff` of the two `ls-tree` outputs → empty). No unlanded roadmap artifacts
were found on any of them.

**Landed on main:** partial. RESEARCH/DESIGN/RISK/ALIGN (M1–M5) are complete and on
main; the `flow-funding` package exists on main; **the epic is NOT complete — M6-IMPLEMENT,
M7-TEST and M8-CELEBRATE are still `⏳`** in the milestone table below.

### What is actually built
- **The `flow-funding` package is real code on main** — 64 files under
  `git ls-tree -r --name-only origin/main -- src/packages/flow-funding/`, including
  `domain/{agreement,engine-key-registry,flow-ocap,settlement-confirm-hook}.ts`,
  `engine/{accrual,activity-decay,allocate,gradient}.ts`,
  `handlers/{agreement,epoch-settle,policy-set,simulate}.ts`,
  `materializers/{flow-agreement,flow-policy}.ts`, `sharing/{biscuit-nhop,flow-domain,reshare-trigger}.ts`,
  `sim/{demurrage-preview,driver}.ts`, plus `manifest.ts` / `register.ts`.
- **UI:** `origin/main:src/packages/flow-funding/ui/flow-tab.js` (1503 lines), bundled
  into the mobile clients at `clients/android/naoms/app/src/main/assets/features/flow-funding/flow-tab.js`
  and `clients/ios/NAOms/BrowserAssets/features/flow-funding/flow-tab.js`.
- **The C7 tokenId guard is on main and intact** — re-derived this turn,
  `/usr/bin/grep -n 'if (!state.tokenId)' <origin/main:src/packages/flow-funding/ui/flow-tab.js>`:
  `485`, `569`, and `990` (`if (!state.tokenId) return Promise.resolve(null);`).
  `savePolicy` is defined at `origin/main:src/packages/flow-funding/ui/flow-tab.js:567`
  and its guard is the `:569` row — so a policy can never be armed on the `"custom"`
  kind label.
- **`1644-flow-completion` merged** — merge commit `85ecf624906`, verified
  `git merge-base --is-ancestor 85ecf624906 origin/main` → ANCESTOR. Evidence:
  `06-implement/LANDING-RECORD-flow-completion-merged-and-5-residual-siblings-adjudicated-2026-07-27.md`.
- **The BUG-02 root cause is FIXED ON MAIN.** All five REDs in
  `uc-flow-controls-no-drop.test.ts` had one cause: the test harness built a feature ctx
  of `{container, api}`, a shape production cannot produce, so `state.tokenId` stayed
  null and `savePolicy` short-circuited. The fix is on main — re-derived,
  `/usr/bin/grep -n 'sendReq' <origin/main:src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts>`:
  `:173` → `  const sendReq = (msg: Record<string, unknown>) =>` and
  `:180` → `  feature.init({ container: env.container, api, sendReq });`.

### What is NOT built / still open
- **M6-IMPLEMENT / M7-TEST / M8-CELEBRATE are `⏳`.** The 2026-07-27 landing record
  says so in its own words: *"It changes no milestone status… this work landed one
  branch, it did not complete the epic."*
- **Both `10-bug/` registers still say `Status: OPEN` on main** —
  `BUG-01-settlement-cap-fails-roundtrip-into-policy_set-arms-delegation-root.md`
  (🔴 CRITICAL, settlement cap) and
  `BUG-02-flow-funding-control-surface-is-0-of-5-green-on-main-three-reds-tracked-by-nothing.md`
  (🔴 HIGH, 0/5 green). 🟡 **Their status text is very likely STALE**: BUG-02 was filed
  2026-07-27T20:01Z, and the landing record written 2026-07-27T21:54Z reports the same
  five cases fixed (28 passed / 0 failed) with the fix now verifiable on main (above).
  **I did NOT run the test**, so I cannot confirm green today — a resuming session's
  first job is to run it and then correct or close both registers.
- **`e2e-flow-funding-*` are RED and were not fixed.** The landing record states they
  *"remain red pending the multi-device Kronos runner"*. There are 10 `e2e-*` files
  under `origin/main:src/packages/flow-funding/tests/`. 🟡 UNVERIFIED by me — not run.
- **OPEN coverage gap flagged for convergence, never closed:** six two-daemon integ
  tests exist only on the (superseded) matrix branches with no same-named counterpart on
  main — `integ-virtual-channel-two-daemon{,-failure-mode}`,
  `integ-1659-epic-virtual-channel-inbox-roundtrip-two-daemon{,-failure}`,
  `integ-matrix-virtual-channel-roundtrip-two-daemon{,-failure-mode}`. The landing
  record's author explicitly did **not** run them. Note this gap belongs to the
  messaging-adapter substrate (i.e. the OTHER 1644), not to flow-funding proper.
- **The body prose below says "Current phase: 02-research" — that is STALE.** The
  frontmatter `phase: 06-implement` and the milestone table (M1–M5 ✅) are correct.
  I did not delete the stale prose; treat the table as authoritative.

### Decisions that bind future work
- **Five residual 1644-era sibling branches are ALL SUPERSEDED; do not merge them.**
  `1644-matrix-package-2026-06-09`, `1644-real-matrix-e2e-v2-2026-06-13`,
  `1644-w3-bridged-inbound-2026-07-03`, `1567-canary-fix-plugins-lifecycle-fm-2026-05-24`,
  `1644-w1-login-failmode-mechassert-2-2026-06-16`. **Merging the matrix pair would
  REGRESS main**, not merely add nothing: they register `PC-1622..1625` as `"status":
  "live"` in `rule-id-registry.json`, and main runs `PC-819` (`no-roadmap-shaped-rule-id`)
  which fires on any live rule id ≥ 1000. Source:
  `06-implement/LANDING-RECORD-flow-completion-merged-and-5-residual-siblings-adjudicated-2026-07-27.md` §2.
- **`git cherry` was the WRONG instrument** for that assessment — the work landed under
  three renames (`adapter-messaging/`→`messaging-adapters/`; `PC-1622/1623/1624/1625`→
  `PC-843/860/846/847`; `integ-matrix-login-…`→`uc-matrix-login-…`). Commit identity
  overstated the delta; file/symbol content is the right instrument. Same source, §2.
- **Fleet-useful trap recorded in that record §4:** a merge-result run read 9 failed that
  was a **dylib / TS symbol-table mismatch**, not a code regression. A warm worktree is
  necessary but NOT sufficient — the dylib must match the MERGED tree's symbol table.
  What proved it environmental: the branch touches zero files under `rust/` and
  `src/core/ffi/`.
- **BUG-01's attribution was being corrected**: the `1644-flow-completion` branch
  *reveals* the cap defect, it does not introduce it — a test absent from main cannot be
  a regression. Source: the BUG-02 register's `xref` note.
- **Frontmatter rewritten this sweep** under the owner's 2026-08-24 directive:
  `id:` was the non-numeric `1644-flow-funding` → now `1644`; `status: in-progress` and
  `last-verified: 2026-08-24` ADDED (both were absent — this item was one of the
  no-`status` items whose sweep brief was field-shifted). `title:` was already a
  compliant declarative future-state statement — UNCHANGED. `star:` is the owner's own
  2026-06-09 purpose question, already doctrine-shaped (a WHY, ending in `?`) —
  **UNCHANGED and NOT reconstructed**. 🟡 It does **not** resolve against the catalogue
  (`origin/main:src/packages/roadmap/doctrine/stars-seed.ts`), which holds 17 stars
  (S-01..S-08, S-10, S-11, S-14, S-17, S-24, S-27, S-29, S-32, S-REWRITE) and **none for
  economics / value-circulation**. Since `resolveStarValue` at `:236` requires an `S-NN`
  id or a VERBATIM catalogued question, prefixing would have meant discarding the
  owner's wording for a poorly-fitting star. I declined to do that. **PC-694 will keep
  warning on this item until a value-circulation star is proposed via the intake
  procedure.**

### Next action
Run `deno test --allow-all src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts`
against current `origin/main`. If it is 5/5 green (which the landed `sendReq` harness fix
predicts), close BUG-02 and re-adjudicate BUG-01's CRITICAL settlement-cap case against
the same run; if not, the registers are accurate and the cap defect is live. Either way
that measurement is the gate on whether M6 can be declared done.

### Evidence trail
- `git rev-parse --short origin/main` (was `2e509f29dcc` when this was written).
- `06-implement/LANDING-RECORD-flow-completion-merged-and-5-residual-siblings-adjudicated-2026-07-27.md`
  — read this FIRST; it is the newest and most load-bearing artifact in the item.
- `10-bug/BUG-01-*.md` and `10-bug/BUG-02-*.md` — treat `Status: OPEN` as unverified.
- `06-implement/SESSION-HEAD-STATE-completion-c10-2026-07-25.md` and
  `_SESSION-HEAD-STATE.md` — 🟡 I did NOT read either; a resuming session should.
- `git show "origin/main:src/packages/flow-funding/ui/flow-tab.js"` → grep `state.tokenId`.
- `git ls-tree -r --name-only origin/main -- src/packages/flow-funding/`
- `~/.naoms/agent-comms/1644/` — `CONTINUATION.md` (21 KB, 2026-07-01), `DAY-STATE.md`
  (2026-07-20), `instance.json`. 🟡 Listed, not read. Nothing 1644-specific arrived in
  the inbox after 2026-07-27 (newest entries are 1849/1164 fleet broadcasts, 2026-08-20/21).
<!-- STATE-SYNC:END -->

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
| M5-ALIGN | Owner + Tree alignment | ✅ owner walk DONE 2026-06-12 (`05-align/alignment-decisions.md`); critic Phase-1 **plan-approved**; `05-align/frozen-plan.md` SEALED @ a4409528fc |
| M6-IMPLEMENT | `src/packages/flow-funding/` package + **mock-first** wallet surfaces (extend 1627) | ⏳ |
| M7-TEST | unit → combined-tier → E2E (narrative: a node supports a dependent end-to-end); **per-M-row mock-fidelity gate on the real daemon** (1668 spirit) | ⏳ |
| M8-CELEBRATE | sign-off + close-gate | ⏳ |

## Landing record — 2026-07-27 cutover (status-neutral)

`1644-flow-completion` merged to `origin/main` as **`85ecf624906`** (fix `8fad9c542bc`;
C7 tokenId guard reconciled with its sibling harness — 5 RED → GREEN, no production file changed,
guard protection intact). Five residual 1644-era sibling branches were content-assessed and are
**all SUPERSEDED** — zero cascade-merges needed; merging the matrix pair would REGRESS main
(PC-819 roadmap-shaped rule ids). One gap stays **OPEN** and flagged for convergence: two-daemon
integ coverage for the messaging-adapter substrate.

**This landed one branch; it does not complete the epic — M6/M7/M8 remain `⏳` above.**
Full evidence:
[`06-implement/LANDING-RECORD-flow-completion-merged-and-5-residual-siblings-adjudicated-2026-07-27.md`](06-implement/LANDING-RECORD-flow-completion-merged-and-5-residual-siblings-adjudicated-2026-07-27.md)

<!-- STATE-SYNC:BEGIN 2026-09-19 -->
## Current State (verified 2026-09-19)

Checked against the triage worktree ref **`a284c7a4c2f`** (`rt-a1`), which is
**94 commits behind `origin/main` = `960b5d8b772`** — expected for this sweep, not
fast-forwarded. Every file cited below was confirmed ABSENT from
`git diff --name-only HEAD origin/main` (1103 paths) unless the block says otherwise,
so the citation holds at `origin/main` too. Everything below this block is the older
record, left intact; where it disagrees, this is newer.

**Verdict:** test

**Where the work lives:** ON main, and FURTHER ALONG THAN THE MILESTONE TABLE BELOW SAYS. The table marks M6-IMPLEMENT and M7-TEST as `⏳`; both have substantial landed output at this ref. `status: in-progress` was also a vocabulary defect — normalized to `test`.

### What is actually built
- M6 — `src/packages/flow-funding/` is a full package on main: `engine/{accrual,activity-decay,allocate,gradient}.ts`, `handlers/{agreement,epoch-settle,policy-set,simulate}.ts`, plus `domain/`, `enrichers/`, `materializers/`, `sharing/`, `sim/`, `ui/`, `manifest.ts`, `manifest-operations.ts`, `register.ts`.
- M7 — `src/packages/flow-funding/tests/` holds **37** files including the narrative e2e the M7 row names (`e2e-flow-funding-narrative.test.ts`), plus `e2e-flow-funding-{agreement,policy,settle-from-ui,simulation,velocity,wallet-receipt}.test.ts` and `integ-flow-{agreement-bilateral,consent,epoch-settle-conservation,payee-credit-2daemon}.test.ts`.
- Landing record already in the body: `1644-flow-completion` merged as `85ecf624906`.

### What is left
(1) Correct the milestone table — M6 and M7 are not `⏳`. (2) Run the suite and record a green result; I did NOT execute any test, so "built" here means the files exist, not that they pass. (3) M8-CELEBRATE: no `08-celebrate/` dir and no sign-off.md exists. (4) The `1644` number collision with `.naoms/roadmap/1644-matrix-package/` flagged in the 2026-08-24 block is still unresolved.
<!-- STATE-SYNC:END -->

<!-- STATE-SYNC:BEGIN 2026-09-19-p2 -->
## Second-pass review (2026-09-19)

Checked against `origin/main` = `cacd530207c` (this worktree HEAD `4e5aec615aa` is **100 commits behind** it; every path below was read with `git show origin/main:<path>` / `git grep origin/main`, never from the stale worktree).
**Remaining:** engineering
**Verdict:** implement

Real code work remains and it is not close. `M6-IMPLEMENT`, `M7-TEST` and `M8-CELEBRATE` are all
`⏳` in the item's own milestone table, and both `10-bug` registers on main still read
`Status: OPEN` (`BUG-01` settlement-cap 🔴 CRITICAL, `BUG-02` control surface 0/5 green). The
`flow-funding` package is genuinely on main (64 files, `ui/flow-tab.js` 1503 lines), so this is a
half-built epic, not an unstarted one. The `e2e-flow-funding-*` suite is recorded RED pending the
multi-device Kronos runner and 🟡 I did not run it this turn either — the next session's first
act is still `deno test --allow-all src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts`
against main. `status:` normalised `in-progress` → `implement` (canonical set). The unresolved id
collision with `.naoms/roadmap/1644-matrix-package/` stands.
<!-- STATE-SYNC:END -->
