# 1644 flow-funding COMPLETION — SESSION HEAD-STATE (read first)

**Session:** c10 (`cbb29fd9`). **Updated:** 2026-07-25 ~00:xxZ. **Branch/worktree:**
`1644-flow-completion` (`.claude/worktrees/1644-flow-completion`), pushed to origin.
**Owner directive:** continue through the night, ≤3 concurrent agents, RED-first,
PROC-NEW-FEATURE BUILD. Trigger: owner rejected a flow-funding demo as theatre
("hives not in the data", "don't see tokens coming into a wallet from another").

## Where we are (PROC-NEW-FEATURE BUILD)

- **Gap analysis** ✅ `06-implement/completion-gap-analysis-2026-07-24.md` (4-auditor, cited). Verdict: backend REAL+proven; gap is UI + fabricated contexts + missing M7.
- **Frozen-plan (completion)** ✅ `05-align/frozen-plan-completion-2026-07-24.md` — 6 C-rows (C1 real contexts, C2 settle-from-UI, C3 accept-in-UI, C4 wallet source-attribution, C5 kill inert controls, C6 star narrative). HC-C1..C5.
- **RED tests** ✅ committed `0aab6870bf3` (6 files in `src/packages/flow-funding/tests/`). RED run-confirmed: context-provenance, narrative, uc-controls-no-drop(5/5). Structural-RED (flaky-on-Mac iroh at setup, GREEN needs build-host/Kronos): settle-from-ui, wallet-receipt, agreement-accept-ui.
- **Critic plan-review** ✅ enrolled CRQ `ec-20260724T221902-p1-c10-flow-completion-0e2d9953`; independent critic agent VERDICT = **REVISE** → `05-align/critic-verdict-completion-2026-07-24.md`.

## NEXT: apply the 4 blocking critic findings BEFORE implementation

- **B-1 (fatal)** — Fix `e2e-flow-funding-narrative.test.ts`: it polls the PAYEE for `flow_settlement` (holon-local, never crosses). Witness `flow_outcome` (sharing/flow-domain.ts:62-64 `writesNodeTypes:["flow_outcome"]`) + the payee WALLET row instead. ALSO add the missing C3 accept gesture (it jumps propose→settle). Source real claimants.
- **B-2 (fatal)** — C4 projection: `_hook_token_event_projection` (token/domain/push.ts:133-150) writes NO memo/amount/to-from. "from" IS derivable from `signer_did` (pure UI — do this for C4 payee "received from X"). The "· flow settlement · paid ✓" memo label + per-row amount NEED a projection field = NEW BACKEND → **write `06-implement/plan-amendment-C4-2026-07-25.md`**: scope C4 to signer_did-based "from" attribution (pure UI, satisfies wallet-receipt RED) + amount via token_balance delta or get_settlement; DEFER memo-label/paid-badge to a projection M-row OR include the projection change explicitly (owner: decide — probably include it, it's small, HC-C3 says amend not fake).
- **B-3** — add policy caps (perClaimantCap/perEpochCap) round-trip assertion to `uc-flow-controls-no-drop.test.ts` (C5/G10).
- **B-4** — add PAYER-side receipt RED test (flow.get_settlement "sent N to X · paid") — extend `wallet-receipt` or new file.
- **N-1/N-2 (non-blocking)** — C2/narrative: specify where UI sources `balance`+`claimants` (epoch_settle refuses-loud on unabsorbed surplus). C2 test hardcodes "awip" which C1 removes — coordinate.

## THEN: implementation (PHASE C), ≤3 concurrent agents, disjoint files

- Agent A: flow-funding/ui (C1 contexts, C2 settle, C3 accept, C5 controls) — ALL flow-tab.js/flow-surfaces.js work (same files → one agent, sequential).
- Agent B: token/ui wallet (C4 wallet-activity from/to via signer_did, get_settlement reader) + velocity "Received"→flow_outcome.
- Agent C: C4 projection field (if amendment includes it) OR C6 narrative wiring/verify.
- Each impl commit: RED:/GREEN: ratchet evidence + `RATCHET-WAIVER-SUPERSEDED: 0aab6870bf3`.
- GREEN verification of 2-daemon UI tests: build-host/Kronos (Mac iroh co-tenancy flaky). CI must run them (HC-C5, not env-gated).
- Then land via merge queue (gate per row), converge, celebrate.

## Constraints (do not relearn)
Zero Rule (work in this worktree). No new backend unless amended. No fabricated data (HC-C1). No inert control (HC-C2). Real-pointer (HC-09). Prebuilt dylib at `/Users/mujo/dev/naoms/rust/target/release` (NAOMS_FFI_LIB_PATH; no rust build). Owner Matrix delivery still BLOCKED (no c10 identity, conductor down). Persistent inbox monitor task = bkglozc1k.
