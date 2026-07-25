# 1644 flow-funding COMPLETION — SESSION HEAD-STATE (read first)

## ⭐ TOP-LINE STATUS (2026-07-25 ~06:40Z, tip 4edc54fb642)
- ✅ C4 (owner core) GREEN on Mac + build1. automatedSettlementCap gap fixed. C1/C2 GREEN. 86/86 uc/integ.
- ✅ **C3/C6 ROOT-CAUSED + FIXED (not a prod bug):** the accept/settle click emitted 0 ops because
  puppeteer's default 800×600 viewport lets the ambient AI concierge dock OCCLUDE the flow app's
  Accept/settle control → `page.click` hit-tests the AI chip, inline onclick never fires. Wiring is
  CORRECT (agent verified `elementAtCenterIsButton=true → active` at 1440×900). Fix = set 1440×900 in
  the 2 tests (real desktop; assertion unchanged — real pointer click → bilateral fold). Committed
  `4edc54fb642`. NOT theatre (unrealistic 800×600 harness viewport, not a weakened assertion).
- ⏳→🔴 **Firsthand C3+C6 re-confirm FAILED (bbb5x4d4i, ~0712Z) — NOT green; do NOT claim/land.**
  Viewport fix WORKED (C3 now runs the full 7m flow, not a 3ms bail → the click fires). But:
  - C3 FAILED at "bilateral fold active on BOTH daemons" — build1 had `integ-1163-with-devices`
    CONTENDING (same cross-peer replication starvation class as the Mac co-tenancy). Cannot
    disambiguate contention-vs-real-defect without a genuinely QUIET multi-device runner.
  - C6 FAILED at "UI settle did not DIRECT surplus to the payee — no flow_settlement allocates
    amount>0" — DOWNSTREAM of the accept not folding active (payee never becomes an active-agreement
    counterparty → deriveClaimants omits them → settle allocates 0). So C6 hinges on C3's fold.
  - build1 env note (non-fatal): dylib built WITHOUT embeddings feature (onnx null → ollama fallthrough).
  NEXT to disambiguate: run C3 alone on a QUIET build1 (no integ-1163) — if it folds active, it was
  contention (viewport fix sufficient, just needs a non-co-tenant runner); if it still fails at the
  fold with 0 accept-replication, there is a REAL accept-fold/replication defect to fix. Only after C3
  folds active can C6 settle be judged.
- FOLLOW-ON candidate (canvas-desktop scope, NOT 1644): AI concierge dock occludes app controls at
  narrow widths — real responsive-layout bug worth its own BUG-NN.
- **NEXT once confirm is GREEN:** cascade-merge any sibling 1644 branches (owner standing rule 0632Z:
  ALWAYS cascade, never single-shot skip) → land via `--gate=owner-approval` with build1 evidence →
  converge. Owner AWAKE (PROC-DAY); status filed to conductor(1711)+QM(economics) for DD relay (no own Matrix).

## ⭐ (prev) TOP-LINE STATUS (2026-07-25 ~04:00Z, tip c61a0607bc4)
- ✅ **Owner's core requirement DELIVERED + verified on TWO runners.** C4 wallet-receipt
  GREEN on Mac AND build1 (Linux): payee wallet shows `"received 200 from <payer> · flow
  settlement"`. The demo-rejection bug is fixed. Also: automatedSettlementCap UI gap fixed.
- ✅ C1 (real hives), C2 (settle-from-UI) GREEN firsthand; 86/86 uc/integ GREEN.
- 🔴 **C3 (agreement-accept-from-UI) — REAL BUG** found via honest build1 multi-device testing:
  the accept-button click emits 0 `flow.agreement_accept` ops (deterministic, host-independent).
  Full analysis + candidates + build1 env recipe: `06-implement/C3-accept-from-ui-bug-2026-07-25.md`.
- 🔴 C6 (narrative capstone) — BLOCKED by the C3 accept bug (the narrative includes the accept step).
- **NEXT:** fix the C3 accept-from-UI path (PROD, not test) → re-verify C3+C6 GREEN on build1
  (env recipe in the C3 bug doc) → land via `--gate=owner-approval` with build1 evidence → converge.
  A PMR full-tier run (bqpufd3uv) is exercising the suite on build1 (will RED on C3/C6 = expected).
- LANDING NOT done: C3/C6 must be GREEN first (HC-C5 — no unverified cross-identity land = no theatre).

**Session:** c10 (`cbb29fd9`). **Updated:** 2026-07-25 ~00:xxZ.
**Branch/worktree:** `1644-flow-completion`
(`.claude/worktrees/1644-flow-completion`), pushed to origin. **Owner
directive:** continue through the night, ≤3 concurrent agents, RED-first,
PROC-NEW-FEATURE BUILD. Trigger: owner rejected a flow-funding demo as theatre
("hives not in the data", "don't see tokens coming into a wallet from another").

## Where we are (PROC-NEW-FEATURE BUILD)

- **Gap analysis** ✅ `06-implement/completion-gap-analysis-2026-07-24.md`
  (4-auditor, cited). Verdict: backend REAL+proven; gap is UI + fabricated
  contexts + missing M7.
- **Frozen-plan (completion)** ✅
  `05-align/frozen-plan-completion-2026-07-24.md` — 6 C-rows (C1 real contexts,
  C2 settle-from-UI, C3 accept-in-UI, C4 wallet source-attribution, C5 kill
  inert controls, C6 star narrative). HC-C1..C5.
- **RED tests** ✅ committed `0aab6870bf3` (6 files in
  `src/packages/flow-funding/tests/`). RED run-confirmed: context-provenance,
  narrative, uc-controls-no-drop(5/5). Structural-RED (flaky-on-Mac iroh at
  setup, GREEN needs build-host/Kronos): settle-from-ui, wallet-receipt,
  agreement-accept-ui.
- **Critic plan-review** ✅ enrolled CRQ
  `ec-20260724T221902-p1-c10-flow-completion-0e2d9953`; independent critic agent
  VERDICT = **REVISE** → `05-align/critic-verdict-completion-2026-07-24.md`.

## NEXT: apply the 4 blocking critic findings BEFORE implementation

- **B-1 (fatal)** — Fix `e2e-flow-funding-narrative.test.ts`: it polls the PAYEE
  for `flow_settlement` (holon-local, never crosses). Witness `flow_outcome`
  (sharing/flow-domain.ts:62-64 `writesNodeTypes:["flow_outcome"]`) + the payee
  WALLET row instead. ALSO add the missing C3 accept gesture (it jumps
  propose→settle). Source real claimants.
- **B-2 (fatal)** — C4 projection: `_hook_token_event_projection`
  (token/domain/push.ts:133-150) writes NO memo/amount/to-from. "from" IS
  derivable from `signer_did` (pure UI — do this for C4 payee "received from
  X"). The "· flow settlement · paid ✓" memo label + per-row amount NEED a
  projection field = NEW BACKEND → **write
  `06-implement/plan-amendment-C4-2026-07-25.md`**: scope C4 to signer_did-based
  "from" attribution (pure UI, satisfies wallet-receipt RED) + amount via
  token_balance delta or get_settlement; DEFER memo-label/paid-badge to a
  projection M-row OR include the projection change explicitly (owner: decide —
  probably include it, it's small, HC-C3 says amend not fake).
- **B-3** — add policy caps (perClaimantCap/perEpochCap) round-trip assertion to
  `uc-flow-controls-no-drop.test.ts` (C5/G10).
- **B-4** — add PAYER-side receipt RED test (flow.get_settlement "sent N to X ·
  paid") — extend `wallet-receipt` or new file.
- **N-1/N-2 (non-blocking)** — C2/narrative: specify where UI sources
  `balance`+`claimants` (epoch_settle refuses-loud on unabsorbed surplus). C2
  test hardcodes "awip" which C1 removes — coordinate.

## THEN: implementation (PHASE C), ≤3 concurrent agents, disjoint files

- Agent A: flow-funding/ui (C1 contexts, C2 settle, C3 accept, C5 controls) —
  ALL flow-tab.js/flow-surfaces.js work (same files → one agent, sequential).
- Agent B: token/ui wallet (C4 wallet-activity from/to via signer_did,
  get_settlement reader) + velocity "Received"→flow_outcome.
- Agent C: C4 projection field (if amendment includes it) OR C6 narrative
  wiring/verify.
- Each impl commit: RED:/GREEN: ratchet evidence +
  `RATCHET-WAIVER-SUPERSEDED: 0aab6870bf3`.
- GREEN verification of 2-daemon UI tests: build-host/Kronos (Mac iroh
  co-tenancy flaky). CI must run them (HC-C5, not env-gated).
- Then land via merge queue (gate per row), converge, celebrate.

## PROGRESS UPDATE (2026-07-25, feature tip c8b618e03e5)

- **C1/C2/C3/C5 (flow-funding UI)** ✅ DONE + integrated (agent A, merged). Real
  hives, settle-from-UI, accept-UI, all inert controls wired (caps incl. B-3).
  Velocity Received→flow_outcome.
- **C4 (wallet)** ✅ DONE + integrated (agent B + B2b). Payee "received N from
  X", payer "sent · paid ✓", push.ts amount+memo projection, token.subscribe
  relay.
- **Integrated uc suite: 19/19 GREEN** (controls-no-drop 6/6, accept-wiring,
  token C4 ×12).
- **Single-daemon browser e2e** (context-provenance C1, settle-from-ui C2):
  agent-A-verified GREEN (daemon logged `surplus:200 settledTotal:200`).
- **Critic B-1/B-2/B-3/B-4** all addressed: B-2 amendment (projection)
  delivered; B-3 caps test added; B-4 payer receipt added; B-1 narrative fix =
  agent C IN PROGRESS.
- **2-daemon browser tests** (wallet-receipt C4, agreement-accept-ui C3,
  narrative C6): structurally correct, GREEN pending **Kronos** (Mac iroh
  co-tenancy flakes at cross-peer setup). NOT env-gated, NOT faked.

## 🧭 NIGHT-END STATE (2026-07-25 ~03:05Z, tip df22fb1cd39, pushed) — LANDING = PROVEN BLOCK

**Code complete + owner's core requirement VERIFIED. Landing blocked on
multi-device runner (all down for the night).**

DONE + verified firsthand THIS session (not relayed):

- automatedSettlementCap UI affordance (the #1 gap) — RED→GREEN, `649020ea917`.
- Owner's ACTUAL bug (wallet receipt invisible) — root-caused + FIXED + verified
  on the REAL 2-daemon path:
  `["received 200 from z6Mki4X2y24A… · flow settlement"]`, `2c95e039029`.
- Firsthand GREEN: C1 context-provenance, C2 settle-from-ui, policy e2e
  (single-daemon); **C4 wallet-receipt (2-daemon)**; 86/86 uc/integ (flow uc
  71 + token uc-1644 12 + new integ 3).

PROVEN BLOCK on landing (C3 agreement-accept-ui + C6 narrative are
EXPECTED-RED-ON-MAC):

- This Mac: sustained load ~19-20 + 8 co-tenant test-daemons → the 40s
  UI-proposal cross-peer replication window loses to iroh co-tenancy (narrative
  failed there 2×; wallet-receipt passed because it uses CLI-settle + 120s
  credit poll — the tighter window is the difference).
- Configured regression runners build1 + build2: BOTH UNREACHABLE
  (Indonesia-night; expected).
- build3=Linux/no-chrome/no-dylib/no-commit; gpu-host + prime = off-limits.
- **merge-gate default regression tier SKIPS multi-device** (needs
  NAOMS_PMR_INCLUDE_MULTIDEVICE=1, full tier) → a plain `--gate=owner-approval`
  submit would MERGE without running C3/C6 = theatre. NOT DONE (would violate
  "no theatre / I will catch it each time").

## BUILD1 ATTEMPT (2026-07-25 ~01:30-02:20Z) — runner came back but is UNDER-PROVISIONED for these e2e

build1 (Linux, sf-node, `/root/dev/naoms`) returned mid-night. I tried to get
C3/C4/C6 GREEN there via the sanctioned remote-worktree helper + direct SSH
runs. Hit env gap after gap:

1. `xdg-mime` absent → OAuth default-browser pre-condition throws. Fix:
   `NAOMS_SKIP_DEFAULT_BROWSER_CHECK=1` (sanctioned CI bypass,
   tests/helpers/default-browser.ts:257 — only skips the OAuth deep-link check
   these tests don't exercise).
2. `findBrowser()` can't use snap chromium (wrapper). Fix:
   `NAOMS_BROWSER_PATH=/root/.cache/puppeteer/
   chrome/linux-151.0.7922.34/chrome-linux64/chrome`
   (Chrome-for-Testing 151, works).
3. git-snapshot worktree lacks gitignored fixtures. Fix:
   `ln -s /root/dev/naoms/tests/fixtures/
   state-seeds <wt>/tests/fixtures/state-seeds`
   (main checkout HAS founder/naoms.db + invitee-a/b + keys).
4. **BLOCKER (not solved):** with 1-3 applied, `startDaemonFromFixturePath`
   fails — the **daemon subprocess EXITS before /health binds**
   (fixture-daemon.ts:1614). Likely a dylib/feature or crypto-smoke mismatch on
   build1's `libnaoms_core.so` (needs a rust rebuild with signer-ffi/whisper —
   heavy, do NOT do ad-hoc). Also fresh-founder onboarding (wallet-receipt)
   exited 1 (~4m) — same class. CONCLUSION: build1 accessed ad-hoc is NOT a
   provisioned e2e runner. The PROPER path is the Kronos merge-gate runner with
   `NAOMS_PMR_INCLUDE_MULTIDEVICE=1` (full tier) — it provisions dylib+fixtures+
   browser correctly. Env fixes 1-3 above still apply and should be exported for
   any manual runner attempt. NOT DONE: forcing a `--gate=owner-approval` land
   WITHOUT C3/C6 CI-verified would violate HC-C5 (cross- identity value tests
   MUST run in CI, not unverified) — that is the theatre this seam exists to
   prevent.

EXACT NEXT (when a PROVISIONED multi-device runner is available):

1. Run C3+C6 on a multi-device runner for REAL GREEN, e.g.
   `NAOMS_PMR_INCLUDE_E2E=1 NAOMS_PMR_INCLUDE_MULTIDEVICE=1 scripts/pre-merge-regression.sh --tier=full`
   (remote-dispatches to build1/build2) OR run the 3 two-daemon e2e directly on
   a quiet provisioned runner. Fix any real failures (C3/C6 are structurally
   correct; C4's terminal is already GREEN so the wallet logic is proven).
2. THEN enroll the 6 touched e2e in the critic-queue with honest
   `--tests-passed` (live critic 1238 is running) → get Phase-2 verdicts →
   `merge-queue.sh add 1644-flow-completion 1644 "<desc>"
   --gate=e2e --tests-passed`
   (regression re-verifies on the runner). Plan re-submit
   `critic-queue.sh plan-review 1644 1644-flow-completion "<desc>"` first (was
   rejected-plan-rework; B-1..B-4 all addressed).
3. Converge; NO hollow-celebrate (multi-device GREEN is the real proof, HC-C5).

- RESIDUAL M-row candidate (non-blocking): payee replica `state.holders`
  sometimes omits self on admit membership fold (racy) — party-based subscribe
  grading makes the wallet correct regardless.

## ✅✅ OWNER'S CORE BUG FIXED + VERIFIED FIRSTHAND (2026-07-25 ~00:52Z, tip 2c95e039029)

The wallet-receipt-invisible bug is FIXED and I re-ran the REAL 2-daemon test
MYSELF:
`payee Activity feed rows: ["received 200 from z6Mki4X2y24A1aTQ… · flow settlement"]`,
`credited=200`, `ok | 1 passed | 0 failed`. Regression firsthand: **86/86
GREEN** (new integ 3

- token uc-1644 12 + flow uc 71). The exact row the owner asked for now renders
  on the real cross-identity path. Root cause (agent-confirmed via instrumented
  2-daemon diagnostic, I reviewed the diff + HC-43):
  1. `_autoTripleWrap` promotes namespace-registered events (token.transfer) to
     JSON-LD (@context/@graph, entry as rdf:JSON literal); push.ts did plain
     `JSON.parse().entry` → undefined → entry_kind/amount/memo projected NULL on
     both daemons. FIX: push.ts unwraps BOTH shapes via canonical
     `unwrapJsonLdPayload`/`unwrapJsonLdLiteral` + stores `to_did`.
  2. payee's replica `state.holders` listed only issuer →
     isTokenHolder(payee)=false → graded RELAY → feed dropped it. FIX:
     tools-subscribe grades a NAMED PARTY (to_did or signer) as holder of THEIR
     OWN event. HC-43 verified intact: relay branch returns base only
     (commit_id/chain_id/token_id/grade) — `to_did` used for grading, NEVER
     returned to a relay. New test:
     `token/tests/integ-wallet-receipt-jsonld-projection-subscribe.test.ts`
     (real wrap→ projection→subscribe; success + failure-mode). RED/GREEN in
     commit body. RESIDUAL (follow-on M-row candidate, NOT blocking): the deeper
     cause of #2 — why the admit `membership.added` fold sometimes doesn't add
     the payee to their own replica's state.holders (racy) — is UNFIXED; the
     party-based grading makes the wallet correct regardless.

## (history) 🚨🚨 NEW CRITICAL BUG (2026-07-25 ~00:05Z) — owner's core complaint STILL PRESENT

Ran the REAL 2-daemon `e2e-flow-funding-wallet-receipt.test.ts` on Mac (did NOT
flake — replication + value movement WORKED). Result: value moved (`paid 200`,
payee `credited=200`, wallet total shows `["200","200"]`) BUT the payee Activity
feed = `["Activity","Activity",
"Minted","genesis"]` — **the incoming flow
settlement is INVISIBLE** (no "received 200 from
<payer>" row). This is EXACTLY the owner's rejection ("i dont see the tokens
coming into my wallet from another"). The 12/12 token uc-1644 MISSED it (they
mock the token_event entry).

- Full analysis: `06-implement/CRITICAL-wallet-receipt-invisible-2026-07-25.md`.
- Root-cause candidates: (1) token.subscribe grades the transfer token_event
  "relay" via isTokenHolder(state.holders=membership roster, not folded balance)
  → strips entry_kind/signer_did/amount/memo; (2) transfer token_event not
  projected on payee's post-commit hook path; (3) fields absent. NOT yet
  confirmed — needs diagnostic run.
- **DELEGATED to 1 background agent** (root-cause→fix→verify with the real
  2-daemon test), brief carries full evidence + HC-43 constraint (a genuine
  relay still ciphertext floor; a balance-holder seeing their OWN received value
  is not a leak). Do NOT run a 2-daemon test concurrently (iroh co-tenancy
  contention). Await its result.
- This blocks C4 (wallet-receipt) + C6 (narrative capstone now asserts the
  wallet terminal). C1/C2 single-daemon e2e + all uc suites GREEN + unaffected.
- KEY LESSON (re-confirmed): run the REAL 2-daemon path; do NOT trust uc-green +
  "structurally-correct-Kronos-pending". The Mac runs 2-daemon fine at night
  (quiet fleet).

## Landing pipeline mechanics (learned 2026-07-25 — for when code is GREEN)

- Merge gate IS Kronos:
  `scripts/merge-queue.sh add <branch> <item> "<desc>" --gate=e2e --tests-passed`
  → kronos:picker-tick → merge-gate-runner runs regression on the RUNNER peer.
- BUT `--gate=e2e` REFUSES unless every touched `e2e-*/integ-*.test.ts` has an
  approved Phase-2 critic verdict in `.naoms/critic-queue.json` (git-common-dir,
  NOT worktree).
- `critic-queue.sh add <path> <branch> <item> "<desc>" --kind=e2e` REQUIRES
  `--tests-passed` (100% local pass) + combined-tier ≥80% coverage. NO
  defer-to-Kronos enrollment exists — every approved e2e in the queue is locally
  GREEN first. So the 3 two-daemon e2e MUST pass locally (Mac at night works) or
  on a provisioned runner before enrollment.
- LIVE formal critic (1238) is running (`review --loop` + critic session on
  system-stability). Route verdicts THROUGH it (independent) — never self-stamp.
  My plan sits `rejected-plan-rework` (the REVISE I addressed); resubmit
  `critic-queue.sh plan-review` ONLY after code is GREEN (Honor: build/fix prod
  → test → submit; do not submit mid-fix).
- Branch: 13 ahead / 36 behind origin/main; ZERO file overlap with main's 36 →
  clean merge, no reabsorb needed for conflicts.
- Touched e2e needing Phase-2 verdicts: context-provenance✅, settle-from-ui✅,
  policy✅ (all GREEN on Mac firsthand), agreement-accept-ui⏳,
  wallet-receipt⏳(BUG), narrative⏳.

## ✅ CRITICAL GAP CLOSED (2026-07-25, tip 649020ea917) — automatedSettlementCap

The automatedSettlementCap UI affordance is IMPLEMENTED + pushed. RED→GREEN
done:

- `flow-surfaces.js`: new "Automated settlement" card with
  `#automatedSettlementCap`.
- `flow-tab.js` savePolicy sends `params.automatedSettlementCap` (>0);
  loadPolicy re-hydrates it.
- uc RED "CRITICAL: automated-settlement cap" → GREEN; full uc suite **71/71
  GREEN**.
- `e2e-flow-funding-narrative.test.ts` (C6 capstone) now ARMS the cap FROM THE
  UI (not CLI — honest) so the settle moves REAL value, and asserts the payee
  WALLET receipt terminal. Stale "KNOWN PRODUCTION GAP" header rewritten (gap
  closed). 2-daemon browser terminals remain EXPECTED-RED-ON-MAC → GREEN pending
  Kronos. NEXT (in order): (1) reabsorb origin/main (branch 36 behind — rebase
  not merge, drainer-broadcast entangle) (2) land per-row via merge-queue.sh (3)
  Kronos run for the 3 two-daemon e2e → REAL GREEN (4) converge, NO
  hollow-celebrate.

## 🚨 (SUPERSEDED — now CLOSED above) CRITICAL GAP found by agent C (C6)

**UI-driven settle moves NO token value.** `moveSettlementValue`
(epoch-settle.ts) only fires when the FlowPolicy has an armed delegation root;
`policy-set.ts` arms it only when `params.automatedSettlementCap > 0`; but the
Policy UI (`flow-tab.js
savePolicy`) never sends `automatedSettlementCap` and NO
UI field exists (repo-grep: only types.ts + policy-set.ts). ⇒ a UI-armed policy
moves no value ⇒ the payee wallet receipt CANNOT render from the UI loop = the
owner's core "see tokens arrive from another" is not actually reachable via UI.
DECISION (owner intent = YES make it real): **ADD a UI affordance in the Policy
surface to arm `automatedSettlementCap`** (a field

- savePolicy sends it), so the UI-driven loop moves value → wallet receipt
  renders → C6 narrative can terminate on the real wallet row (not just
  flow_outcome). This is a small flow-tab.js/flow-surfaces.js addition (agent
  A's files). Add a uc/e2e RED proving policy_set from UI carries
  automatedSettlementCap and arms the root. Do NOT CLI-arm as a workaround
  (makes "driven from UI" a lie); do NOT descope silently. C6 narrative agent
  branch = `worktree-agent-a76c285e5fc9e63ec` @ 2d1368a30df (merge it).

## REMAINING

1. Merge agent C narrative (worktree-agent-a76c285e5fc9e63ec @2d1368a30df) —
   test-only, disjoint.
2. Fix the CRITICAL gap above (automatedSettlementCap UI affordance) — makes the
   loop actually move value from UI.
3. Integrate agent C. Run full runnable suite once more.
4. LAND per-row via merge queue (gate=e2e or owner-approval; per-row proof).
   Drainer merges.
5. Trigger Kronos run for the 3 two-daemon UI e2e to get real GREEN; if any
   fails, fix.
6. Converge / celebrate motion (do NOT hollow-celebrate; 2-daemon GREEN on
   Kronos is the real proof).
7. Owner Matrix delivery still blocked (no c10 identity, conductor down) — reach
   QM/conductor per PROC-NIGHT.

## Constraints (do not relearn)

Zero Rule (work in this worktree). No new backend unless amended. No fabricated
data (HC-C1). No inert control (HC-C2). Real-pointer (HC-09). Prebuilt dylib at
`/Users/mujo/dev/naoms/rust/target/release` (NAOMS_FFI_LIB_PATH; no rust build).
Owner Matrix delivery still BLOCKED (no c10 identity, conductor down).
Persistent inbox monitor task = bkglozc1k.
