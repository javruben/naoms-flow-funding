---
item: 1644-flow-funding
phase: 03-design
title: "Flow Funding — consolidated design"
authored: 2026-06-12
authored_by: 1644 (software-architect + systems-architect roles, single-operator under MCP-down)
star: "What if money knew when to keep moving — flowing on to those who depend on us, and back to us when we are the ones in need — so no node hoards while a dependent goes without?"
supersedes: none
substrate_state_matrix: true
systems_architect_verdict: APPROVED-WITH-OWNER-FORKS
---

# 1644 Flow Funding — Design (03-design)

> **Role-dispatch honesty (Owner Pref #1/#12).** The canonical PROC-NEW-FEATURE-DESIGN
> crew (`software-architect` / `systems-architect` / `product-designer` /
> `user-persona` / `test-author` via `agent.execute`) routes through the MCP
> bridge, which is **down** (marker present at `~/.naoms/mcp-down.json`). The
> roles were therefore discharged as follows: software-architect + systems-
> architect + test-author + facilitator authored **single-operator** at opus tier
> with the independence disciplines honored *manually* (an independent inventory
> re-grep was run and it **corrected** the substrate state — see §2); the
> **product-designer** + persona set + binding mocks were dispatched to a separate
> sub-agent for genuine independence (`03-design/product-designer-verdict.md`,
> `personas/`, `mockup/`). This is recorded so the ALIGN reviewer can weight the
> independence accordingly.

This design answers the star at every section: *does this keep value moving
toward need without hoarding?* It commits the `[blocks-design]` leans from
`02-research/approaches-considered.md` as **owner-ratification forks** (§7) — the
design proceeds on the leans; the owner ratifies or overrides them at the ALIGN
human gate.

---

## 1. The product in one paragraph

Flow funding is a **homeostatic value-circulation layer** over the existing
token ledger. A holon (any existing NAOMS identity — person / hive / agent /
device; a river or forest is a `stewardship` hive) declares, per relationship and
per context, a **viability band**: a *floor* below which it draws support in and
a *ceiling* above which surplus flows out, with a smooth **gradient** between
them rather than two hard switches. Surplus cascades down the holon's
relationship edges toward need; support is drawn back from those it has supported
when it dips below floor. Trust-edges are the channels and the caps. Idle value
can decay so it cannot sit still. The carrier of a flow is nourished, not only
the recipient. Flow funding **routes** existing `token` value — it does not mint
a new asset.

## 2. Substrate three-state matrix (D-SUBSTRATE-THREE-STATE — REQUIRED)

Every primitive the design names carries a state tag. **State A** = verified on
this (main-based) worktree. **State B** = exists only on a named unmerged branch
(cite merge source; owner must sequence the dependency). **State C** = net-new;
requires owner ratification at 05-align.

> **CORRECTED at ALIGN (2026-06-12).** The first cut of this matrix tagged the
> token ledger **State B** — an artifact of a **stale worktree base (5885 commits
> behind `origin/main`)**, the STALE-LOCAL-MAIN-TREE trap. The owner corrected it
> at the ALIGN gate ("they are already on main"); after `git rebase origin/main`
> the substrate was re-verified. Token + wallet are **State A**. **Fork A0
> dissolves.** Demurrage moved to **reuse 1645** (its own branch); transparency
> moved to **reuse the `sharing` package (656)** auto-sharer + Biscuit (State A) —
> the bespoke 1644 demurrage engine and bespoke transparency mechanism are
> **removed from 1644 scope** (Rule 8).

| Primitive | State | Evidence / merge source |
| --- | --- | --- |
| `stewardship` hive template (land/river/ecosystem) | **A** | `src/packages/hives/templates.ts:183` (verified 2026-06-12 on origin/main) |
| `linked_entity_did` (non-human entity a hive stewards) | **A** | `src/packages/hives/types.ts:32` |
| Trust graph (asymmetric, quantitative, typed edges) | **A** | items 030–031 celebrated; `src/packages/trust/` present |
| `token` chainType (single-writer token chains) | **A** | `origin/main:src/packages/token/manifest.ts` chainTypes:[{chainType:"token"}] (re-verified post-rebase 2026-06-12) |
| `token.pay` / `token.define` / `token.mint` ops (action-tier, `CORE_APPROVAL_REQUIRED`) | **A** | same manifest, ops table; HC-34 / PC-1491 action-tier |
| CIKU **ceiling interpreter** — clock-free, heartbeat-attested elapsed accrual (`ceiling = floor(attestedElapsedHours)×unitsPerHour`, NEVER wall-clock, HC-21/DE-09) | **A** | `src/packages/token/kinds/ciku/ceiling.ts` (origin/main) |
| `iou` kind (expiry-posture, verdicts) | **A** | `src/packages/token/kinds/iou/{expiry-posture,verdicts,iou-package}.ts` (origin/main) |
| `token_balance` materialized node | **A** | token fold/materialize on origin/main; confirm exact symbol at IMPLEMENT |
| Wallet UI microapp (`token/ui/wallet-*.js`, `wallet.css`) | **A** | `src/packages/token/ui/` on origin/main |
| **`sharing` package (656) auto-sharer** — `engine/auto-share.ts` (`triggerAutoShare`/`triggerHiveAutoShare`), `engine/sharing-engine.ts:evaluateReshare` (reshare/N-hop), `sharers/sharer-friends.ts` (direct-relationship sharer) | **A** | `src/packages/sharing/` on origin/main (verified 2026-06-12); the owner's "auto-sharer" — REUSE |
| **Biscuit** attenuable capability tokens (N-hop sharing contract) | **A** | wired in `sharing/agent-access.ts`, `sharing/sharers/`, `sharing/docs/contracts.md`; consent 040 / ocap 042 |
| `NAOMS_E2E_MOCK_BLOBS` / PC-414 test-only-mock pattern | **A** | `src/packages/sdk/checking/rules/pc-414-mock-blobs-test-only.ts` |
| **1645 demurrage** (idle-balance decay engine) | **B** (reuse) | `1645-token-demurrage` branch, 07-verification build-complete-readiness-2026-06-11; NOT yet on origin/main — 1644 CONSUMES it, does not rebuild |
| `NAOMS_UI_MOCK` flag + Critic Cat-14 + `@mock-fidelity` (1668 mock discipline) | **B** | item 1668 @ 05-align, not landed (fallback: per-item precedents 1650/1630/1607 + PC-414) |
| **`flow-funding` package** | **C** | net-new; PC-471 boundary justified in §3 |
| **`flow` chainType** (FlowPolicy + flow-agreement + story state) | **C** | net-new; §4 |
| **FlowPolicy(holon, context, version)** object | **C** | net-new; §5 |
| **flow-agreement** primitive (formality dial) | **C** | net-new; §6 |
| **gradient outflow / activity-decay** engines | **C** | net-new; §6 (demurrage is reuse-1645, NOT a net-new 1644 engine) |
| **simulation / dry-run harness** | **C** | net-new; §6.5 (may surface 1645 demurrage as a consumer) |
| **flow-funding sharing domain** (registers with `sharing` 656; auto-share flow outcome to direct relationships; Biscuit-attenuated N-hop) | **C** | net-new domain registration over State-A `sharing`; §7 transparency |

## 3. Package shape (Axis 1 → lean A2-pkg)

**One `flow-funding` package; modalities as pluggable engines inside it.**

- PC-471 distribution-boundary justification: flow funding ships its own
  `chainTypes:["flow"]`, its own routes/enrichers/materializers (FlowPolicy
  projection, flow-agreement projection, flow-epoch settlement), its own UI
  surfaces, and an independent release/versioning boundary (it can ship and
  version independently of `token`). It is **not** a mechanical fragment
  (`chainTypes:[]` + handler-registry-only) — it has real substrate. → satisfies
  PC-471; confirmed at IMPLEMENT.
- It **depends on** `token` (value movement via `token.pay`), `hives` (holon =
  hive/stewardship), `trust` (channels + caps). It does not fork or duplicate
  them (Rule 8 / compression discipline).
- Rejected: separate package per modality (over-production — engines share the
  flow event + ledger), and extend-`token` (owner directed a new package; flow
  funding has its own star, lifecycle, and distribution boundary).

## 4. Chain & event model (Axis 2 → lean A4)

**A new `flow` chainType carries policy / agreement / story state; value still
settles through `token.pay`.** (Honesty axiom: automated, agent-initiated,
policy-driven authority deserves a distinct, auditable home, separate from the
token package's per-transfer `CORE_APPROVAL_REQUIRED` gate.)

Chain-event placement (per `src/packages/AGENTS.md` VRC + apps-write-to-content):

- App events on the `flow` chain → `content` branch:
  `flow.policy_set{holon, context, version, params}`,
  `flow.agreement_proposed|accepted|revoked{parties, terms, formality}`,
  `flow.stream_opened{rate, accrualEpoch}` / `flow.stream_closed`,
  `flow.epoch_settled{allocations, basis}`, `flow.story_attested{ref}`.
- Governance/contract metadata → its writer-model branch (consent/VC/ocap, per
  040–042).
- Every concrete event declares `{type, nodeKind}` on the manifest (PC-329:
  `^[a-z][a-z0-9_]*$`; 1111 declaration hygiene). Cross-chain events (e.g. a flow
  epoch that triggers a `token.pay` on a `token` chain) go on
  `crossChainEventTypes[]`.
- **Value movement is never invented here**: a settled allocation emits a
  *request/authorization* that rides the existing `token.pay` path (§8 consent),
  so flow funding cannot move value the token ledger wouldn't.

## 5. FlowPolicy — the settings object (owner's per-context + experimentation requirement)

`FlowPolicy(holon, context, version)` is the armed configuration for one holon in
one context. Keyed triple → a versioned, signed `flow.policy_set` event.

Fields (the config surface; full schema finalized at IMPLEMENT): `floor`,
`ceiling`, `gradient` (curve shape between floor and ceiling), `armed_engines[]`
(subset of {gradient-outflow, activity-decay, demurrage}), per-engine params
(decay rate, tithe %, activity-decay curve), `allocation_policy` (Axis "D2"
fairness rule), `transparency_level` (outcome-transparency scope), `channels`
(which trust-edges, with caps).

- **Context scoping** (open-Q F2): a context is a named scope a holon binds a
  policy to (e.g. `nao`, `care-circles`, `household`, a stewardship-hive DID).
  Contexts are holon-local labels; cross-holon negotiation of settings is
  **out of MVP** (open-Q F5 → defaulted self-set; recorded).
- **Defaults + override** (F4): ship a TBFF-like default gradient any
  holon/context overrides. The default set is an ALIGN fork (D2 + C-params).
- **Versioning**: a new policy is a new version event; the fold reads the latest
  active version at settlement time (no silent mutation — Honesty axiom).

## 6. The flow-agreement primitive + the three anti-hoarding engines

### 6.1 One flow-agreement on a formality dial (Axis 4 → lean A1)

A single **flow-agreement** object spans a *formality dial*: at the informal end
it is a light **relational trust-weight / channel** (Simon's watershed); at the
formal end a **codified revenue-share contract** (Tree's negotiated %, duration,
expiry-math, tier, optional IOU). One primitive, two ends — rides NAOMS's
agreement-centric DNA (token `MintingAgreement`, consent/VC/ocap). Tree's "the
math on the contract defines expiry + amount" maps to agreement terms; the IOU
end reuses the **`iou` kind** (State B).

### 6.2 Three DISTINCT anti-hoarding mechanisms — do not conflate (Axis 5 → lean A3)

| Engine | Acts on | Trigger | MVP posture |
| --- | --- | --- | --- |
| **Gradient outflow** | surplus above ceiling | threshold crossing | **LIVE** |
| **Activity-decay of entitlement** | a node's *claim* (Tree "stay in the river") | inactivity | **LIVE** |
| **Demurrage** | idle *balances* (Gesell/Sarafu ~2%/mo) | elapsed-idle | **REUSE 1645** (not a 1644 engine) |

**Demurrage is item 1645's deliverable, not 1644's** (owner ALIGN decision; Rule
8). `1645-token-demurrage` is build-complete on its own branch. Flow funding does
NOT implement a demurrage engine; it **consumes 1645** — and may surface it in the
simulation surface (§6.5) as a consumer so a holon can preview decay per-context.
1644's own anti-hoarding contribution is **gradient outflow + activity-decay**
(both LIVE). 1644 BUILD has a soft dependency on 1645 for any live-demurrage
preview; absent 1645, gradient + activity-decay alone still satisfy the star.

### 6.3 Flow accrual model (Axis 6 → lean B2, now substrate-grounded)

**Lazy, fold-time, heartbeat-attested accrual — NOT a wall clock.** The verified
CIKU ceiling interpreter (State B) already proves the pattern NAOMS uses for
time-based value: `accrued = f(attestedElapsedHours since accrualEpoch)` where
elapsed is derived from **peer heartbeat attestations**, never `Date.now()`
(HC-21/DE-09). Flow streams reuse this: `flow.stream_opened{rate, accrualEpoch}`
emits no per-second transactions; `accrued = rate × attestedElapsed` is computed
at fold/settlement. Settlement trigger = an explicit, auditable
`flow.epoch_settled` event (periodic or on-threshold), not an implicit clock.
This resolves the "do we need streaming?" open question: **no** — event-sourced
lazy accrual is native, cheaper, and honest.

### 6.4 Allocation authority (Axis 7 → lean D3)

**Emergent, not routed.** When a holon's surplus flows, it is split across its
armed channels by aggregated, **trust-weighted** pull from below-floor
neighbours — need is gravity, trust is terrain, **no central router** (Simon's
make-or-break). Fairness-under-scarcity (when surplus can't reach everyone) is
the **D2 fork** (equal / need-weighted / proximity / quadratic / holon-defined)
— defaulted to *need-weighted with a per-claimant cap* (anti-capture, open-Q D4),
owner ratifies at ALIGN.

**Risk-integrated bounds (from 04-risk — woven here, not an addendum).** Two caps
bound the blast radius (FMEA F3/F7, STRIDE D1/S1): a **per-claimant cap** (no
single claimant — including a sybil-farmed one — captures a holon's surplus;
allocation targets are gated on **existing 030–031 trust edges**, so farmed edges
carry low weight → **DE-23**) and a **per-epoch outflow cap** (a deep transitive
cascade cannot drain a holon faster than its configured rate; settlement is
bounded by active channel count, not the global graph → **DE-24**). Convergence
**terminates** and refuses LOUD on non-convergence/non-conservation (never a
silent clamp — Honesty axiom AX-H1; open-Q B4 → DE-09).

### 6.5 Simulation / dry-run harness (owner experimentation requirement)

A holon runs a FlowPolicy variant over **synthetic or historical** flow events
through the **real engine on the real write path** (not a cheaper model — open-Q
L3 resolved toward fidelity) and watches a full flow epoch before committing real
value. This is where a holon can **preview 1645 demurrage** as a consumer (no
1644 demurrage engine), and where the owner's "experimentation per person/hive
per context" requirement is discharged.

## 7. Story → trust signal (Axis E4 — the hardest unresolved build)

Simon's load-bearing requirement: a quest/threshold completion by *unpriceable*
work must become something the network **perceives and flows toward**. Design
position (lean E4, owner-ratified at ALIGN): a `flow.story_attested` event is
typed as **testimony, not verified fact** (Owner Pref #1/#12; open-Q E5) and is
weighted into allocation only as a **trust-graph signal** — it nudges the terrain
(raises a channel's pull-weight) but never directly releases value. The numeric
weighting fold (open-Q E6) is **deferred to a post-MVP M-row** with an explicit
placeholder, NOT a silent omission (Honor Rule no-headers-as-deferral). This is
flagged the highest-risk intent and gets its own simulation coverage.

## 8. Consent & authority for automated outflow (open-Q A3 — security-critical)

The token ledger gates every `token.pay` with `CORE_APPROVAL_REQUIRED`
(action-tier). Automated flow must **compose with**, not bypass, that gate. Design:
a holon pre-authorizes flow via a **revocable, scoped ocap** ("flow my surplus
above ceiling along these channels, up to these caps, in this context") issued at
FlowPolicy-arm time; each settled allocation rides `token.pay` carrying that
capability as its authorization, bounded by the cap. Revocation is immediate
(a new policy version disarming the engine). This is the primary security surface
and the focus of the 04-risk security-auditor lens (runaway flow, drain attack,
consent bypass, capability over-scope).

**Privacy / transparency posture (owner ALIGN decision — local-first, reuse the
`sharing` package).** The owner ratified: *local-first, no centralization, each
node owns its own information; an auto-sharer shares with direct relationships and
a Biscuit contract governs N-hop sharing.* This maps onto **reuse of the State-A
`sharing` package (656)** — flow funding registers a **sharing domain** for flow
outcome/velocity that:
- **auto-shares with direct relationships** via the existing `sharer-friends`
  builtin + `engine/auto-share.ts` (`triggerAutoShare`) — no central transparency
  service; each node pushes its own outcome to its direct edges (**DE-26**);
- **governs N-hop sharing with a Biscuit-attenuated capability** — the reshare
  path (`engine/sharing-engine.ts:evaluateReshare`) carries a Biscuit token whose
  caveats bound the hop-count and scope, so transitive disclosure is *contracted*,
  not ambient (**DE-27**).

Flow topology (who-depends-on-whom; below-floor = in-need) is therefore never in
a central clear; per-edge detail travels only along Biscuit-authorized edges,
keeping faith with the encrypted-default (010–016) and the Wholeness axiom
(local-first, no central node). ZK proof-of-need remains the named post-MVP
`M-1644-ZK-NEED`. (Forks H1/H2/H3 resolved by this decision; DE-25 generalizes to
"no disclosure beyond the Biscuit-authorized hop scope".)

## 9. UI surfaces (mock-first — extends the 1627 wallet, NOT a new app)

Per `02-research/ui-surfaces-and-mock-first-plan.md` and the mock discipline
(1668 spirit; fallback to 1650/1630/1607 + PC-414 if 1668 unlanded — open-Q L1
decided at BUILD by 1668 land-status). MVP = the four ◆ surfaces, each with a
**binding mock** authored this phase (`03-design/mockup/`, by the product-designer
sub-agent) and each carrying a **per-M-row mock-fidelity gate on the real daemon**:

1. Flow-agreement creation (formality dial).
2. FlowPolicy configuration (floor/ceiling/gradient/engines/context-switcher).
3. Flow / velocity view (the felt "river").
4. Simulation surface.

UI-visible intents are tier=e2e with a **real-pointer driver** (PRE-ALIGN-GATE
check 5; no synthetic seam / `window.__` / DOM-click-via-evaluate). Data is seeded
through the **real write path** (`flow.policy_set`, `flow.agreement_accepted`,
`token.pay`), never `_graphPut`/static seed.

## 10. Systems-architect adversarial review (BLOCKING — D-SYSTEMS-ARCHITECT-BLOCKING)

Cross-package invariants and axiom alignment, reviewed against the whole system:

1. **Chain-event placement (VRC / apps-write-to-content).** ✔ App events →
   `content`; governance → writer-model branch; `{type,nodeKind}` declared;
   cross-chain `token.pay` trigger on `crossChainEventTypes[]`. No new violation.
2. **Clock-freedom (HC-21).** ✔ Accrual is heartbeat-attested-elapsed, mirroring
   the verified CIKU pattern; **no `Date.now()` in the fold.** A naïve wall-clock
   stream would have violated this — explicitly rejected in §6.3.
3. **Honesty axiom (no silent clamp/drop).** ⚠ Convergence/allocation math must
   refuse loudly on non-conservation rather than silently clamp (open-Q B4); TBFF's
   demo-grade exact-match is insufficient at NAOMS scale. **Carried to 04-risk +
   test plan** as a conservation-invariant contract.
4. **Authorization (CORE_APPROVAL_REQUIRED non-bypass).** ⚠ §8 ocap must be
   provably bounded; a capability that out-scopes its cap is an EoP. **Primary
   04-risk security lens.**
5. **Package boundary (PC-471).** ✔ §3 justification holds (own chainType +
   substrate + release boundary).
6. **Substrate sequencing.** ✔ **RESOLVED at ALIGN.** The ⛔ in the first cut
   ("BUILD blocked on 1596/1627") was a **stale-worktree artifact** (5885 commits
   behind). Token + wallet are **State A on origin/main** (re-verified post-rebase
   2026-06-12). Fork A0 dissolved; no sequencing block. Soft dependency: 1645
   demurrage (its own branch) for live-demurrage preview only.
7. **Wholeness axiom.** ✔ Flow funding coordinates over its own ledger (A5 =
   own-ledger MVP, external capital a planned follow-on); transparency is
   **local-first** (reuse `sharing` 656 auto-sharer + Biscuit, no central node).
   No external runtime dependency for core function.

**Verdict: APPROVED-WITH-OWNER-FORKS → forks now RESOLVED at ALIGN (2026-06-12).**
The design is internally coherent and axiom-aligned. Two ⚠ invariants
(conservation-loudness, ocap-bounding) are delegated to 04-risk with named test
contracts. The one ⛔ (A0 sequencing) dissolved on substrate re-verification. No
REWORK-REQUIRED finding.

## 11. Owner-ratification forks — RESOLVED at ALIGN (2026-06-12)

Walked at the FIRST HUMAN GATE; decisions recorded in
`05-align/alignment-decisions.md`. Each fork's resolution:

- **A0.** Sequencing → **DISSOLVED.** Token + wallet are State A on origin/main
  ("they are already on main"); my State-B call was a stale-worktree artifact.
- **A1.** One flow-agreement, formality dial → **RATIFIED** (facilitator-default,
  not overridden).
- **A2-pkg.** One `flow-funding` package, engines inside → **RATIFIED.**
- **A3.** Demurrage → **REUSE 1645** (not a 1644 engine; owner pointed to
  `1645-token-demurrage` build-complete). Gradient + activity-decay LIVE remain
  1644's anti-hoarding contribution.
- **A4.** New `flow` chain + reuse `token.pay` → **RATIFIED.**
- **D2.** Fairness = need-weighted + per-claimant cap → **RATIFIED.**
- **E4.** Story → trust-signal (nudge terrain, never release value; numeric fold
  post-MVP) → **RATIFIED.**
- **H1/H2/H3.** Transparency → **local-first; reuse `sharing` 656 auto-sharer for
  direct relationships + Biscuit-attenuated capability for N-hop** (§8). ZK
  post-MVP.
- **A5.** Capital → **own-ledger MVP; external capital a planned follow-on item.**

All other open questions (`open-questions.md` B–L) remain
`[blocks-implementation]` or facilitator-defaulted and recorded there.

## 12. Cross-references

- Implementation plan: `03-design/implementation-plan.md` (M-rows, steps,
  parallelization, integ/e2e gates).
- Dimensions of variation: `03-design/dimensions-of-variation.md`.
- Test plan DRAFT: `05-align/test-plan-v1.md` (DE checklist, tiers).
- Product brief / personas / mocks: `03-design/product-designer-verdict.md`,
  `03-design/personas/`, `03-design/mockup/`.
- Risk (next phase): `04-risk/` — security-auditor (STRIDE), risk-assessor (FMEA),
  ethics (axiom-alignment); the two ⚠ invariants above are pre-assigned.
