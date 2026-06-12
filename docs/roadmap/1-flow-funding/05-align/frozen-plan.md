# frozen-plan — 1644-flow-funding @ a4409528fc

Seam to BUILD. Frozen at the post-ALIGN tip after owner walk (2026-06-12) +
critic Phase-1 **plan-approved** (`scripts/critic-queue.sh`, entry
`ec-20260612T214751-p1-…`, verdict 2026-06-12T19:53:59Z). Build crew may not
deviate from this file — see the plan-amendment protocol below.

## Pointers

- star_ref:    S-1644 ("What if money knew when to keep moving … so no node
  hoards while a dependent goes without?")
- design_sha:  `1e4b844bfe46957ca53f3668d46ddc05ffb90195` (03-design/design.md)
- dimensions_of_variation_sha: `e9f0bd4dd19bbaca153e63f0a9f1103fd28efdc2`
  (03-design/dimensions-of-variation.md — addresses every catalog entry)
- risk_sha:    `138ab493a1e3beb49faaa4788be6ce7646a284f1` (04-risk/ tree)
- align_sha:   `deb06d1a4fdc8ee764299ee7c42baae98dd2d80a` (05-align/test-plan-v1.md)
- plan_sha:    `8cc7ce1a21f0de64ac64bd99e8a62149d1cb448d` (plan.md — at item root
  per PRE-ALIGN-GATE check 12; the LIVE plan)
- implementation_plan_sha: `41256f45f682adae2a090bafdc76f11a5a8a4253`
- approved_at_tip: `a4409528fc3347b3274e423f6b9673e9141ff966`

## Hard constraints (flattened from 04-risk — rules, no reasoning)

- HC-01: A settled epoch MUST satisfy Σ(out) == surplus and **refuse LOUD** on
  imbalance — NO silent clamp. Source: STRIDE T1 / FMEA F4 / ethics AX-H1 / DE-09.
- HC-02: Automated flow MUST ride `token.pay` **carrying** a revocable scoped
  ocap as authorization, bounded by its cap, and MUST NOT bypass
  `CORE_APPROVAL_REQUIRED`. Source: STRIDE E1 / FMEA F2 / DE-12.
- HC-03: A flow in `vault-locked` with no valid pre-issued ocap MUST refuse LOUD
  (no silent-drop). Source: DE-14 / D-AUTHORIZATION-CONTEXT.
- HC-04: Accrual MUST be heartbeat-attested-elapsed (CIKU pattern); NO `Date.now()`
  in the fold. Source: HC-21 / DE-06.
- HC-05: Per-claimant cap AND per-epoch outflow cap MUST bound allocation; targets
  gated on existing 030–031 trust edges. Source: STRIDE S1/D1 / FMEA F3/F7 / DE-23/24.
- HC-06: Demurrage is **REUSE 1645** — 1644 MUST NOT implement a demurrage engine.
  Source: owner ALIGN A3 / DE-16.
- HC-07: Transparency is **local-first** — REUSE the `sharing` package (656)
  auto-sharer for direct relationships; N-hop disclosure MUST be bounded by a
  Biscuit caveat; NO central transparency service. Source: owner ALIGN H1/H2/H3 /
  DE-25/26/27.
- HC-08: MVP coordinates over the internal token ledger only; NO real external
  capital. Source: owner ALIGN A5.
- HC-09: UI-visible intents are tier=e2e with a real-pointer driver — NO
  `window.__` / DOM-click-via-evaluate / WS-as-UI; data seeded via the real write
  path. Source: PRE-ALIGN-GATE check 5 / DE-17..20.
- HC-10: Mechanism-claiming tests MUST assert the mechanism fired (not "suite
  green"). Source: 1594 Assert-the-Mechanism / mechanism-asserted column.

## Doctrine bindings

D-DESIGN-IS-ONE-DOCUMENT, D-NO-TEST-THEATRE, D-SUBSTRATE-THREE-STATE,
D-MILESTONE-GATED-BY-INTEG-OR-E2E, D-REAL-POINTER-DRIVER, D-MAX-PARALLELIZATION,
D-PER-M-ROW-MOCK-FIDELITY (1650), D-FF-ENGINE-POSTURE (reuse-1645),
Rule-8-reuse-before-build, Compression-discipline.

## Reuse ledger (Rule 8 — what 1644 does NOT build)

- `token.pay` / `token.define` / `iou` kind / CIKU accrual — REUSE (State A, origin/main).
- 1627 wallet microapp — EXTEND (State A).
- demurrage — REUSE 1645 (State B branch); consume in sim, no 1644 engine.
- auto-sharer + N-hop reshare — REUSE `sharing` 656 (`auto-share.ts`,
  `evaluateReshare`, `sharer-friends`) + Biscuit (State A).
- trust graph 030–031, consent/VC/ocap 040–042, hives/`stewardship` — REUSE.

## M-rows (build-crew work)

### M1 — A `flow` chain carries a versioned FlowPolicy per holon
deliverable_class:  integ
integ_tier:         single-daemon
e2e_cli_required:   false
files_in_scope:     src/packages/flow-funding/{manifest.ts,register.ts,namespace.ts,handlers/policy-set.ts,materializers/flow-policy.ts,tests/integ-flow-policy-set-and-read.test.ts}
contract:
  - A `flow.policy_set{holon,context,version,params}` written via the real handler projects a FlowPolicy node read back by fold. (Maps to T-01/T-02.)
  - A second version supersedes the first; settlement reads latest-active; no mid-epoch re-price. (Maps to T-01.)
  - The materializer awaits `scope.graphQueryAsync` (PC-700/701). (Maps to T-02.)
multi_daemon_integ: n/a (single-daemon)
e2e_cli:            n/a
success_criterion:  `integ-flow-policy-set-and-read` GREEN; PC-471 boundary comment present; `{type,nodeKind}` declared.
non_goals:          no value movement; no engines; no UI.
depends_on:         []
agent_role:         package-implementer
read_fence:         on
worker_prompt: |
  Scaffold the `flow-funding` package (PC-471 boundary: own chainTypes:["flow"],
  own materializers, independent release — see frozen-plan Reuse ledger). Declare
  `flow.policy_set` as `{type,nodeKind:"flow_policy"}` (PC-329). Implement the
  handler + a FlowPolicy materializer that `await scope.graphQueryAsync(...)`.
  Versioned read = latest-active-version at fold (HC-04 clock-free not relevant
  here; no Date.now). Write `integ-flow-policy-set-and-read` per frozen-plan
  T-01/T-02. Reuse hives/trust DIDs as holon ids (frozen-plan Reuse ledger); do
  NOT add a new identity type.

### M2 — A flow-agreement spans the formality dial, reusing the iou kind
deliverable_class:  integ
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/flow-funding/{handlers/agreement.ts,domain/agreement.ts,materializers/flow-agreement.ts,tests/integ-flow-agreement-bilateral.test.ts,tests/e2e-flow-agreement-cli.test.ts}
contract:
  - Two identities propose+accept ONE agreement on their own lanes (bilateral two-lane); revoke is immediate. (Maps to T-03.)
  - One object spans relational-weight end ↔ codified-contract end (parties/%/duration/expiry/tier). (Maps to T-04.)
  - The IOU end reuses the State-A `iou` kind → negative-until-cleared. (Maps to T-05.)
multi_daemon_integ: T-03 (integ-flow-agreement-bilateral, 2 daemons payer/payee)
e2e_cli:            T-03e (e2e-flow-agreement-cli — real CLI subprocess both sides)
success_criterion:  bilateral accept GREEN across 2 daemons; mechanism-asserted two-lane; IOU projects negative balance.
non_goals:          no automated outflow yet; no demurrage.
depends_on:         [M1]
agent_role:         package-implementer
read_fence:         on
worker_prompt: |
  Implement the flow-agreement primitive (design §6.1). Bilateral = each party
  writes its own acceptance on its own lane referencing one agreement id (NOT
  open-multi-writer — D-WRITER-MODEL). Formality dial = one object, two ends.
  IOU end: reuse `src/packages/token/kinds/iou/` (frozen-plan Reuse ledger). Tests
  assert the MECHANISM (two-lane bilateral), not just a row appearing (HC-10).

### M3 — Surplus settles to need: gradient + activity-decay, conserved & capped
deliverable_class:  integ
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/flow-funding/{engine/accrual.ts,engine/gradient.ts,engine/activity-decay.ts,engine/allocate.ts,handlers/epoch-settle.ts,tests/integ-flow-epoch-settle-conservation.test.ts,tests/e2e-flow-settle-cli.test.ts}
contract:
  - accrued = rate × attestedElapsed (CIKU pattern, NO Date.now in fold). (T-06/T-06b.)
  - gradient outflow (smooth floor→ceiling) + activity-decay engines. (T-07/T-08.)
  - epoch settlement Σ(out)==surplus, refuses LOUD on imbalance. (T-09.)
  - emergent trust-weighted allocation + per-claimant cap + per-epoch cap. (T-10/T-23/T-24.)
  - over-flow racing same headroom → second refused. (T-11.)
  - partition: provisional until attested; over-flow detected on reconnect. (T-21.)
multi_daemon_integ: T-09 (integ-flow-epoch-settle-conservation, 2 daemons + partition)
e2e_cli:            T-09e (e2e-flow-settle-cli)
success_criterion:  conservation GREEN; mechanism-asserted no-wall-clock + caps; over-flow refused.
non_goals:          NO demurrage engine (HC-06 reuse 1645); no ocap yet.
depends_on:         [M1]
agent_role:         engine-implementer
read_fence:         on
worker_prompt: |
  Implement accrual (reuse the CIKU heartbeat-attested-elapsed pattern from
  src/packages/token/kinds/ciku/ceiling.ts — HC-04, NO Date.now), gradient +
  activity-decay engines, and the conserved+capped allocator (HC-01/HC-05).
  Conservation MUST refuse loud (HC-01). Caps per frozen-plan HC-05. Tests assert
  the mechanism (no-wall-clock witness, conservation refuse path).

### M4 — Automated flow rides token.pay under a bounded, revocable ocap
deliverable_class:  e2e
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/flow-funding/{domain/flow-ocap.ts,handlers/epoch-settle.ts,tests/integ-flow-consent.test.ts,tests/e2e-flow-consent-bounded.test.ts}
contract:
  - scoped ocap issued at policy-arm bounds automated `token.pay`; over-scope refused. (T-12.)
  - settlement rides real `token.pay` (CORE_APPROVAL_REQUIRED non-bypass) without interactive unlock. (T-12.)
  - revoke via policy-version disarm stops future flow. (T-13.)
  - vault-locked w/o valid pre-ocap refuses LOUD. (T-14.)
multi_daemon_integ: T-12 (2 daemons cross-identity)
e2e_cli:            T-12e (e2e-flow-consent-bounded)
success_criterion:  bounded flow settles via real token.pay; over-cap+revoked+vault-locked all refused; mechanism-asserted gate-fired+cap-bounded.
non_goals:          no UI; no demurrage.
depends_on:         [M3]
agent_role:         security-implementer
read_fence:         on
worker_prompt: |
  Implement the revocable scoped ocap (design §8, HC-02/HC-03) reusing
  consent/VC/ocap 040–042. Settlement carries the capability ON the token.pay
  gate — compose, never bypass CORE_APPROVAL_REQUIRED. Failure-mode twins:
  consent-bounded-success + consent-over-cap-refused-failure (Honor Layer 9).

### M5 — A holon previews a flow epoch in simulation (consumes 1645 demurrage)
deliverable_class:  integ
integ_tier:         single-daemon
e2e_cli_required:   false
files_in_scope:     src/packages/flow-funding/{sim/driver.ts,sim/demurrage-preview.ts,tests/integ-flow-simulation-no-commit.test.ts}
contract:
  - sim epoch runs the REAL engine over in-process synthetic state; asserts ZERO `flow.*`/`token.pay` chain writes. (T-15.)
  - demurrage preview INVOKES 1645 (no 1644 engine). (T-16.)
multi_daemon_integ: n/a
e2e_cli:            n/a
success_criterion:  sim produces an allocation report with zero chain writes; demurrage preview consumes 1645 (mechanism-asserted reuse-1645); degrades gracefully if 1645 absent.
non_goals:          NO 1644 demurrage engine (HC-06); no real value movement.
depends_on:         [M3]
agent_role:         engine-implementer
read_fence:         on
worker_prompt: |
  Build the sim driver: real engine over in-process synthetic events, NO
  token.pay, NO chain commit (assert zero writes — T-15). Demurrage preview =
  consume 1645 (HC-06); soft-dep on the 1645 branch, degrade gracefully if
  unavailable. Mechanism-assert the sim path + reuse-1645.

### M-TRANSPARENCY — Flow outcome shares local-first (reuse sharing 656) + Biscuit N-hop
deliverable_class:  integ
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/flow-funding/{sharing/flow-domain.ts,sharing/biscuit-nhop.ts,tests/integ-flow-transparency-local-first.test.ts,tests/e2e-flow-transparency-cli.test.ts}
contract:
  - flow outcome/velocity auto-shares to DIRECT relationships via `sharing` 656 (`sharer-friends`/`triggerAutoShare`). (T-26.)
  - N-hop reshare carries a Biscuit-attenuated capability bounding hop-count+scope; beyond-scope reshare refused. (T-27.)
  - no disclosure to a node outside the Biscuit-authorized hop scope. (T-25.)
multi_daemon_integ: T-26 (2+ daemons across direct + N-hop)
e2e_cli:            T-26e (e2e-flow-transparency-cli)
success_criterion:  auto-share to direct rel GREEN; out-of-scope N-hop refused; mechanism-asserted sharing-656 + Biscuit caveat.
non_goals:          NO new auto-sharer; NO central transparency service (HC-07); ZK is post-MVP.
depends_on:         [M3]
agent_role:         package-implementer
read_fence:         on
worker_prompt: |
  Register a flow-funding sharing DOMAIN with `src/packages/sharing/` (656) via
  registerDomain; auto-share flow outcome to direct relationships through
  sharer-friends / engine/auto-share.ts:triggerAutoShare (HC-07, reuse — do NOT
  build a new auto-sharer). N-hop reshare (engine/sharing-engine.ts:evaluateReshare)
  carries a Biscuit caveat bounding hop-count+scope (frozen-plan Reuse ledger).
  Mechanism-assert sharing-656 auto-share + Biscuit caveat enforcement.

### M6 — The wallet shows flow funding (4 ◆ surfaces, mock-first, real backend)
deliverable_class:  e2e
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/token/ui/wallet-flow-*.js, src/packages/flow-funding/ui/*, src/packages/flow-funding/tests/e2e-flow-*-surface.test.ts
contract:
  - flow-agreement creation UI matches binding mock; real-pointer; mock-fidelity on real daemon. (T-17.)
  - FlowPolicy config UI + context switcher matches mock. (T-18.)
  - flow/velocity view (deficit/cup-full/cascade) matches mock. (T-19.)
  - simulation surface matches mock; runs real engine in-process. (T-20.)
multi_daemon_integ: per-surface integ where peer data needed
e2e_cli:            T-17e..T-20e (real-pointer e2e per surface, HC-09)
success_criterion:  each surface e2e GREEN with real-pointer driver + per-M-row mock-fidelity (fresh screenshots, real daemon); built FROM 03-design/mockup/.
non_goals:          no new app (extend 1627 wallet); ○ later surfaces deferred.
depends_on:         [M2, M3, M5, M-TRANSPARENCY]
agent_role:         ui-implementer
read_fence:         on
worker_prompt: |
  Build the four ◆ surfaces FROM the binding mocks at 03-design/mockup/
  (flow-agreement-creation, flow-policy-config, flow-velocity-view,
  flow-simulation), EXTENDING the 1627 wallet (not a new app). Real-pointer e2e
  only (HC-09 — no window.__/DOM-click-via-evaluate); seed via the real write
  path. Each surface closes with a per-M-row mock-fidelity comparison on a real
  daemon with FRESH screenshots (D-PER-M-ROW-MOCK-FIDELITY). Use `naoms dev
  --port <test>` for browser verification (never 3147).

### M7 — A node supports a dependent end-to-end (the star, demonstrated)
deliverable_class:  e2e
integ_tier:         multi-daemon
e2e_cli_required:   true
files_in_scope:     src/packages/flow-funding/tests/e2e-flow-funding-narrative.test.ts
contract:
  - arm policy → create agreement → cross ceiling → settle epoch → below-floor dependent receives → carrier trust-weight rises → visible in wallet. (T-22.)
multi_daemon_integ: T-22 (≥2 daemons)
e2e_cli:            T-22 (real CLI + real pointer)
success_criterion:  narrative GREEN driving 100% of MVP design intents; no DEFERRED/TODO/skip.
non_goals:          post-MVP items excluded.
depends_on:         [M1,M2,M3,M4,M5,M-TRANSPARENCY,M6]
agent_role:         e2e-author
read_fence:         on
worker_prompt: |
  Author the whole-design narrative E2E driving every MVP intent end-to-end on
  ≥2 real daemons with a real pointer + real CLI. No skips/TODO (Honor: E2E
  skip = critical).

## Test plan (verbatim from approved test-plan-v1.md @ deb06d1a)

T-NN ≡ DE-NN in `05-align/test-plan-v1.md` (align_sha `deb06d1a…`, critic
plan-approved). The DE→contract→tier→M-row→mechanism mapping (DE-01..27),
tier-order, ≥80% combined-tier target, daemon topology (1 daemon M1/M2/M5; 2
daemons M3/M4/M-TRANSPARENCY/M7), real-pointer e2e rows, and Layer-9 failure-mode
pairing (DE-09/11/12/14) are pinned by `align_sha` and reproduced there verbatim;
not duplicated here to avoid drift (single source of truth = the pinned blob).

## Plan-amendment protocol

Build crew may not deviate from this file. Mid-build discovery requiring deviation
→ build-facilitator writes `06-implement/plan-amendments/A-NN.md` (deviation +
evidence + proposed amendment); plan facilitator approves/rejects; amendment
appended to `frozen-plan-amendments.md`; new SHA pinned; build resumes against the
amended pin.
