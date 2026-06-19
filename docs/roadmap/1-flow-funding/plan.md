---
item: 1644-flow-funding
title: "Flow Funding — LIVE plan (resumable)"
updated: 2026-06-12
current_phase: 06-implement (BUILD) — ALIGN passed, critic plan-approved, frozen-plan SEALED → BUILD opens at M1
lifecycle: PROC-NEW-FEATURE
workflow_next: PROC-NEW-FEATURE-BUILD — M1 ✅ GREEN (82936b80e1); next M2 (flow-agreement bilateral + IOU). Human gate = CONVERGE (2nd)
---

# 1644 Flow Funding — LIVE plan

> Bar: a fresh facilitator resumes from THIS file alone. One `plan.md` at item
> root (check-12). Head-only narrative checkpoint is `_SESSION-HEAD-STATE.md`.

## Current position

- **SCOPE / RESEARCH** ✅ (gate passed: `02-research/{findings,approaches-considered}.md`).
- **DESIGN (03-design)** ✅ authored — `design.md` (3-state matrix; systems-architect
  verdict APPROVED-WITH-OWNER-FORKS), `dimensions-of-variation.md` (10/10 catalog),
  `implementation-plan.md` (M0–M7), `DEPENDENCIES.md`; product-designer
  `product-designer-verdict.md` + `personas/{tree-willard,simon-qb,yara-osei}.md` +
  `persona-set-manifest.json` + `mockup/` (binding mocks).
- **RISK (04-risk)** ✅ — `stride/fmea/ethics/risk-triad-v1.md` + RISK-MITIGATE
  `open-questions.md`; HIGH+ findings integrated into design (no addendum).
- **TEST PLAN DRAFT** ✅ — `05-align/test-plan-v1.md` (DE-01..27).
- **ALIGN (05-align)** ✅ owner walk DONE 2026-06-12 — `05-align/alignment-decisions.md`.
  Forks resolved: A0 dissolved (token/wallet State A on main) · A3 reuse-1645 ·
  H1/H2/H3 reuse sharing-656 auto-sharer + Biscuit N-hop · A5 own-ledger-MVP ·
  A1/A2-pkg/A4/D2/E4 ratified. Worktree REBASED onto origin/main.
- **NEXT:** await critic plan-review verdict (`scripts/critic-queue.sh`, entry
  `ec-20260612T131832-p1-…`) → on `plan-approved`, write `frozen-plan.md`
  (SHA-pin) → BUILD M1. On `plan-rework`, fold findings first. Do NOT submit to
  merge queue until owner CELEBRATE.

## BUILD milestones (execute after frozen-plan; base on origin/main, NO M0 gate)

Each M-row carries ≥1 integ/e2e gate (see `implementation-plan.md` for steps +
parallelization). Substrate is State A on origin/main (no substrate gate).

- **M1 — flow chain + FlowPolicy:** ✅ DONE + GREEN (commit 82936b80e1, pushed
  origin/1644-flow-funding). Package complete: `types.ts`, `manifest.ts` (flow
  chainType single-writer, flow.policy_set nodeKind flow_policy, eventTypePrefixes
  ["flow."] → generic triple materializer; deps[token,trust]),
  `manifest-operations.ts`, `handlers/policy-set.ts` (flow.policy_set provisions
  the holon's own flow chain via `createChain` + `securedAppend` content branch w/
  tripleFormat entityId=flow-policy-<holon>-<context>-v<n>; self-set only F5;
  flow.get_policy folds latest-active via ctx.graph.queryAsync), `namespace.ts`
  (prefix "flow."), `materializers/flow-policy.ts` (flowPolicySupersede POST
  enricher — awaits scope.graphQueryAsync, demotes prior versions is_latest:false;
  PC-700/701; the C3 mechanism), `enrichers/index.ts`, `register.ts`. `mod.ts`
  deliberately NOT created (loader discovers files individually; Compression).
  Gate `integ-flow-policy-set-and-read`: GREEN on prime (1 passed, 57s). RED proof
  (enricher disabled → latestActiveCount 2≠1) confirms the mechanism assertion
  bites (HC-10). Core missed-await fix from accef74bca DROPPED on rebase —
  SUPERSEDED on origin/main (selfIsRepoMember now async + awaits isMember).
  **PRIME TEST RECIPE (reuse for M2+):** MBP can't run flow integ tests (build-
  forbidden + CoW-cloned-dylib/copied-fixture crypto mismatch → vault.unlock
  aead::Error before the test body). Run on prime: `ssh prime`; reset its worktree
  `/Users/prime/dev/naoms/.claude/worktrees/1644-flow-funding` to origin/main
  (`git fetch origin && git reset --hard origin/main`); `rsync -az --delete
  src/packages/flow-funding/` MBP→prime; CoW-clone prime main dylib
  (`cp -c -R /Users/prime/dev/naoms/rust/target/release/. rust/target/release/` —
  hash matches origin/main rust/src, no cargo, freshness guard passes) +
  `scripts/worktree-wasm-ready.sh` + `scripts/worktree-fixtures-ready.sh`; run
  `NAOMS_FFI_LIB_PATH=rust/target/release/ /Users/prime/.deno/bin/deno test
  --allow-all --unstable-ffi --unstable-worker-options --no-check <test>`.
- **M2 — flow-agreement (formality dial) + IOU:** integ GREEN + PUSHED
  (origin/1644-flow-funding @ a8305186f2). `integ-flow-agreement-bilateral` GREEN on
  prime (2 daemons, cross-peer fold active→revoke; RED-proven by disabling
  flowAgreementFold). 3 prod fixes landed: friendship-branch-allowlist admits
  flow.agreement_*; handler drops `domain` (sharing-domain-key gate rejected peer
  replication); bilateral chain signs both lanes w/ shared content-signer (two-lane
  witness = payload author, handler-gated). PUSH-GATE LESSON: post-rescission
  pre-push gates surfaced fleet-main debt (1670 dup, stale catalogue, unreserved
  1693) as if mine (DIFF_BASE=old-tip); fix = absorb LATEST origin/main (fleet had
  deduped 1670; rebase auto-drops redundant commits) — NOT bypass. REMAINING M2:
  e2e-flow-agreement-cli (real CLI both sides, T-03e) + IOU-end arm (terms.iou →
  token.define kind:"iou" via tools-define.ts → negative-until-cleared, T-05).
  Old gate line: bilateral two-lane accept, reuse `iou` kind.
  **e2e-cli BLOCKED on prime (2026-06-15)**: test authored + deno-checks clean
  (reuses chat two-daemon-cli-harness — `spawnTwoDaemonCliHarness`/`peerPair`/`cli`;
  op flags are verbatim `--agreementId`/`--counterparty`/`--terms`<json>;
  PeerPairResult.chainId). BUT the harness's `spawnFreshFounderDaemon` (FULL fresh
  onboarding, NO fixture) exits **code 78 (EX_CONFIG)** on prime under the CoW-dylib
  passthrough — full crypto/signer init needs a CONSISTENT real-built dylib, which
  the no-cargo-on-prime passthrough can't give. The FIXTURE-based withDevices integ
  works on prime precisely because fixtures bypass onboarding. RESOLUTION OPTIONS
  (owner/next): (a) real cargo build on prime for this arm (against no-cargo
  guidance), (b) run e2e-cli on a build-capable host, or (c) a fixture-based 2-daemon
  CLI harness. Test left UNCOMMITTED (ratchet needs a GREEN run). NOT a test/prod
  defect — purely the fresh-founder prime-boot environment.
  **IOU arm — tractable but DEFERRED (compose with M4):** the negative-balance
  genuinely needs the full 2-daemon token co-present pay ceremony (token.define
  kind:iou + token.admit + token.pay → debtor token_balance negative;
  src/packages/token/tests/integ-token-pay-payee-credit.test.ts is the pattern). Its
  harness `tests/helpers/two-daemon-call.ts` is FIXTURE-based (alice/bob pre-onboard)
  → DOES run on prime. But value-movement is M4's surface ("flow rides token.pay"),
  so the IOU-end (iou define + reference + negative balance via the co-present pay)
  composes naturally with M4 — deferred there, not faked here. M2 is PARTIAL:
  integ-gate ✅ done+pushed; e2e-cli prime-blocked; IOU arm deferred to M4.
  **→ PIVOT to M3 (engines) — depends only on M1 (done), the core anti-hoarding
  value-circulation logic (the star), fixture-harness works on prime.**
  **REUSE MAP (verified 2026-06-14):** the bilateral two-lane = token's co-present
  dual-sign — `validateCoPresentEntry(entry,{payerHead})`
  (token/domain/ceremony.ts:71: both sigs atomic, distinct DIDs, payer-head in
  prevHashes, spend-nonce replay guard) + cross-daemon t=2 quorum via
  `appendTokenCommit`→`coordinateQuorumSign` (chain-quorum-wire.ts). **token.pay
  IS WIRED** at `token/tools-pay.ts:handlePay` (real `appendTokenCommit(db,node,
  "token.transfer",…)` + membership co-sign gate; NOT the `token/ops.ts` op-
  registry which is the newer NotYetWired layer — reuse the LANDED tools.ts/
  tools-pay.ts/tools-define.ts handlers, never ops.ts). IOU end = `iou` kind
  (token/kinds/iou/{verdicts.ts:iouMutualCreditMintVerdict/iouTransferVerdict,
  iou-package.ts:IOU_TOKEN_KIND="iou"}) — mutual-credit, negative-until-cleared,
  cleared via the wired token.pay transfer. **2-identity integ harness =
  `withDevices(...)` (tests/helpers/with-devices.ts:106)** — founder + invitee
  peer-pair, two DISTINCT ownerDids (NOT the agent-hallucinated
  spawnTwoDaemonCall/n4-daemon-harness). e2e-cli spawn helper TBV (PC-323 bans
  inline Deno.Command). Build+test on prime per the M1 recipe above.
  **LOCKED DESIGN (verified 2026-06-14):** the agreement lives on the BILATERAL
  FRIENDSHIP CHAIN `fcAB` (`deriveFriendshipChainId(ownerDid,peerDid)` from
  contacts/friendship-chain-id.ts; probe `ctx.chain.get(fcId)`), NOT each holon's
  owner-local flow chain — fcAB is created AT pair-time so it provably replicates
  (chat canary proves it); a post-pair owner-local chain's chain-identity key is
  NOT in the pairing blob → would NOT replicate (silent-drop-classes.md:60). Mirror
  chat-send.ts: `securedAppend(db,{chainId:fcId,branch:<flow branch>,type:
  "flow.agreement_*",payload,signerDid,signerKeyId:\`${signerDid}#key-0\`})` DIRECTLY
  (cross-chain event — flow-funding doesn't own fcAB; bypasses package cap gate like
  chat does for message.sent). Declare flow.agreement_proposed/accepted/revoked as
  manifest `crossChainEventTypes` (1111 — events emitted onto a chain of a DIFFERENT
  type than the package owns) → nodeKind `flow_agreement`. Custom materializer folds
  both lanes: status `active` iff proposer-terms AND counterparty-acceptance both on
  the node (handles either arrival order); `revoked` on flow.agreement_revoked.
  Mechanism (HC-10): active ONLY because two distinct commits (signer A proposed +
  signer B accepted) both landed+replicated on fcAB — assert via chain.query{fcAB}.
  IOU end = token.define kind:"iou" (tools-define.ts wired) → negative-until-cleared.
  Harness: `withDevices({groups:[{identity:"founder",devices:1},{identity:"invitee-a",
  devices:1}]})`; `env.allHandles`=[A,B] (.ws/.ownerDid distinct), `env.friendshipChainIds["0-1"]`
  =fcAB; cross-peer assert via `chain.query{chainId:fcAB}` + load-invariant pollUntil
  (pattern: tests/features/canaries/integ-canary-chat-edit-retract.test.ts).
- **M3 — engines (gradient + activity-decay LIVE):** ✅ core done + PUSHED. Pure
  engines (engine/{accrual,gradient,activity-decay,allocate}.ts) UNIT-GREEN on MBP
  (13/13, RED-proven by stubbing the allocator) — CIKU heartbeat-attested accrual
  (no wall-clock, structural), gradient outflow, claim activity-decay, conserved
  (Σ(out)==surplus, refuse-loud) + per-claimant-cap water-fill allocator. handlers/
  epoch-settle.ts + `integ-flow-epoch-settle-conservation` GREEN on prime (55s,
  RED-proven by swapping the refuse path) — settles balance 800→surplus 300 conserved,
  refuses loud (residual 250) on unconservable. Gate ✅. REMAINING M3: multi-daemon
  partition arm (T-21, over-flow detect on reconnect) + e2e-flow-settle-cli (shares
  the M2 e2e-cli fresh-founder prime blocker). **→ M5 next (sim; depends M3).**
- **M4 — consent / scoped ocap:** bounded capability rides `token.pay`
  (CORE_APPROVAL_REQUIRED non-bypass). Gate: `e2e-flow-consent-bounded` (2 daemons).
- **M5 — simulation harness (CONSUMES 1645 demurrage, no 1644 engine):** ✅ done +
  PUSHED. sim/driver.ts (pure, reuses M3 engines over synthetic state, conserved,
  no-mutation, refusal-recording) + sim/demurrage-preview.ts (1645 soft-dep via
  variable dynamic import, degrades — 1645 absent on main, HC-06 no 1644 engine) +
  handlers/simulate.ts (flow.simulate, committed:false). Unit GREEN MBP (5/5,
  RED-proven); `integ-flow-simulation-no-commit` GREEN prime (55s, RED-proven):
  real engine ran (300 flowed conserved), ZERO flow_settlement node, demurrage
  degraded (T-15/T-16). Gate ✅.
  **NIGHT PROGRESS (PROC-NIGHT 2026-06-14/15):** M1 ✅, M2-core (integ) ✅, M3
  (engines+settle) ✅, M5 (sim) ✅ — all GREEN+pushed. Deferred/blocked: M2 e2e-cli
  (fresh-founder prime boot exit-78), M2 IOU arm (→M4), M3 partition arm + e2e-settle-cli.
  NEXT: M-TRANSPARENCY (reuse sharing-656 + Biscuit) and/or M4 (ocap on token.pay).
- **M-TRANSPARENCY — local-first share (reuse sharing 656) + Biscuit N-hop:**
  register flow sharing-domain, auto-share to direct relationships
  (`sharer-friends`/`triggerAutoShare`), Biscuit caveat bounds N-hop reshare.
  Gate: `integ-flow-transparency-local-first` (DE-25/26/27).
- **M6 — wallet UI (4 ◆ surfaces, mock-first):** build FROM `03-design/mockup/`,
  real-pointer e2e + per-M-row mock-fidelity on real daemon. Gates: `e2e-<surface>`.
  **M6.0 mock-in-app ✅ DONE + OWNER-APPROVED + PUSHED (38656fb2b3f).** The four
  surfaces render NATIVELY in a "Flow Funding" feature tab behind `NAOMS_UI_MOCK`
  (the canonical pattern — `docs/build/standards/browser-app-mock-implementation.md`;
  NOT a standalone file/iframe/port, which got 1258 cancelled). Built: absorbed
  origin/main for the 1668 serving path (`isUiMockEnabled`/`_maybeInjectUiMockConfig`/
  screen-routing bypass); `scripts/build-flow-mock-ui.ts` transform (binding
  `ui/mock/*.html` → scoped `ui/flow-mock.{css,js}`, served==source via regen);
  `ui/flow-tab.js` (registers `flow-funding`, uiMock branch mounts); registered in
  `feature-registry.js` + `nav-rail.js` DRAWER_CATEGORIES.Money (icon+label).
  Verified in-app by driving Chrome vs the NAOMS_UI_MOCK daemon. **Owner-directed
  scope (2026-06-16/17):** (3) currency/token-kind selector ADDED to Policy (IN
  MVP) → **FlowPolicy becomes per-(holon, context, token-kind); fold the token-kind
  dimension into M1's policy entityId when wiring**; velocity first-run empty-state
  ADDED (hide hero/Simulate/band/nav/tabs when no flows; fixed latent missing
  `.hidden`); (1) hive-treasury UI + (2) multi-signer treasuries SPLIT to new item
  **1696**. **M6.1+ REMAINING — wire each surface to real `flow.*` ops** (non-uiMock
  path of flow-tab.js): policy→`flow.policy_set`/`get_policy` (M1 handlers exist);
  velocity→`flow.epoch_settle` reads + agreement folds; agreement→`flow.agreement_*`
  (M2); simulation→`flow.simulate` (M5). Per-surface real-pointer e2e + Cat-14
  `@mock-fidelity`/`@mock-sha`. PC-439 competitor-reference authored
  (`docs/design/flow-funding-competitor-reference.md`).
  - **M6.1a ✅ DONE + PUSHED (`d1c965a6946`) — backend: FlowPolicy keyed per
    (holon, context, token-kind).** `tokenKind` free string default `"custom"`
    (matches token substrate) threaded through `policy_set`/`get_policy` schema +
    handler entityId + supersede materializer (scoped by `token_kind` so one
    kind's new version can't demote another's). Unit test RED→GREEN on MBP (3/3);
    integ per-token-kind isolation block added (real round-trip running on
    build-host). Implements owner ALIGN scope item (3). economics confirmed
    free-string + package-constant model (no registry exists).
  - **M6.1b ✅ DONE + PUSHED (`92c76ac402e`) — frontend: wired Policy surface.**
    Real-app path of flow-tab.js mounts the Policy surface's OWN renderer
    (`window.__flowMockSurfaces.policy`, exposed from the generator) fed real
    `ctx.api.get_policy`/`policy_set` (1677 renderer-reuse, not a rebuilt form).
    Selector→`humanLabel` (denomination; economics ratified — NOT a token-kind
    id); `tokenKind` stays `custom` (mechanism-switching = 1696). Unbacked
    sections (anti-hoarding/tithe/transparency = M-TRANSPARENCY) tagged
    "preview · not yet saved"; mock synthetic figures stripped (no
    synthetic-as-real). DOM unit test `uc-flow-policy-surface-wired.test.ts`
    (deno-dom, MBP) RED→GREEN 4/4. Live browser e2e (real onboarding) folds into
    M6.2 verification.
  - **M6.2 NEXT — wire Velocity (epoch reads) / Agreement (flow.agreement_*) /
    Simulation (flow.simulate)** with the same renderer-reuse + honest-placeholder
    discipline, then a real-onboarding browser e2e covering all four surfaces.
- **M7 — whole-design narrative E2E:** node supports a dependent end-to-end,
  drives 100% MVP intents. Gate: `e2e-flow-funding-narrative`.
- **post-MVP (named, not silent):** `M-1644-STORY-WEIGHT-FOLD` (E6),
  `M-1644-ZK-NEED` (H2), external-capital bridge (A5), ○ later UI surfaces.

## Standing constraints
Zero Rule (this worktree only); push ≠ merge (force-with-lease OK on own branch
post-rebase); don't touch 3147; don't edit the 1668 worktree. Substrate now
State A on origin/main (worktree rebased) — no re-grep-on-branch needed.
