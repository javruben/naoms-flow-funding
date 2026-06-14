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
- **M2 — flow-agreement (formality dial) + IOU:** bilateral two-lane accept,
  reuse `iou` kind. Gate: `integ-flow-agreement-bilateral` (mechanism: two-lane).
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
- **M3 — engines (gradient + activity-decay LIVE):** heartbeat-attested accrual
  (CIKU pattern, no wall-clock), conservation-loud, caps (DE-23/24).
  Gate: `integ-flow-epoch-settle-conservation`.
- **M4 — consent / scoped ocap:** bounded capability rides `token.pay`
  (CORE_APPROVAL_REQUIRED non-bypass). Gate: `e2e-flow-consent-bounded` (2 daemons).
- **M5 — simulation harness (CONSUMES 1645 demurrage, no 1644 engine):** real
  engine over in-process synthetic state, zero chain writes; soft-dep 1645.
  Gate: `integ-flow-simulation-no-commit` (DE-16 reuse-1645).
- **M-TRANSPARENCY — local-first share (reuse sharing 656) + Biscuit N-hop:**
  register flow sharing-domain, auto-share to direct relationships
  (`sharer-friends`/`triggerAutoShare`), Biscuit caveat bounds N-hop reshare.
  Gate: `integ-flow-transparency-local-first` (DE-25/26/27).
- **M6 — wallet UI (4 ◆ surfaces, mock-first):** build FROM `03-design/mockup/`,
  real-pointer e2e + per-M-row mock-fidelity on real daemon. Gates: `e2e-<surface>`.
- **M7 — whole-design narrative E2E:** node supports a dependent end-to-end,
  drives 100% MVP intents. Gate: `e2e-flow-funding-narrative`.
- **post-MVP (named, not silent):** `M-1644-STORY-WEIGHT-FOLD` (E6),
  `M-1644-ZK-NEED` (H2), external-capital bridge (A5), ○ later UI surfaces.

## Standing constraints
Zero Rule (this worktree only); push ≠ merge (force-with-lease OK on own branch
post-rebase); don't touch 3147; don't edit the 1668 worktree. Substrate now
State A on origin/main (worktree rebased) — no re-grep-on-branch needed.
