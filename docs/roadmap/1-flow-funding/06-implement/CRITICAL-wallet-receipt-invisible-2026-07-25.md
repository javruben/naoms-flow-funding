# 🚨 CRITICAL (owner's core bug, STILL PRESENT) — payee wallet shows NO "received from X" row

**Found:** 2026-07-25 by running the REAL 2-daemon e2e on Mac (it did NOT flake tonight —
replication + value movement WORKED). This is the owner's exact complaint
("i dont see the tokens coming into my wallet ... from another") — NOT yet fixed.

## Evidence (e2e-flow-funding-wallet-receipt.test.ts, real 2-daemon, Mac, ~00:00Z)
- Value moved: `settle valueMovement: paid [{amount:200,...}]`.
- Payee credited: `payee credit before=0 after=200 credited=200`.
- Payee wallet total shows the number: `payee wallet numbers: ["200","200"]`.
- **Payee Activity feed rows: `["Activity","Activity","Minted","genesis"]`** — the incoming
  flow settlement is INVISIBLE. No "received 200 from <payer> · flow settlement" row.
- Test FAILED at wallet attribution assertion (correctly — it's a real RED).

## Why uc missed it
The 12/12 token uc-1644 tests MOCK the token_event entry (feed row synthesized). The real
cross-device member-push path produces (or fails to produce) a token_event that
wallet-activity.js buildRow does not render as an attributed row.

## Root-cause candidates (ranked; NOT yet confirmed — needs a diagnostic run)
1. **subscribe grading strips it** — `token.subscribe`
   (tools-subscribe-accept-provisional.ts:68-107) grades each token_event by
   `isTokenHolder(node, callerDid)` (tools-nodes.ts:317 → issuerDid OR state.holders).
   `state.holders` is the MEMBERSHIP roster (privacy.ts:77 `membership.added`;
   card-materialize-hook admits), NOT the folded balance. A RELAY grade strips
   entry_kind/signer_did/amount/memo. BUT the payee is `token admit`-ed in the test and
   sees "Minted" (a holder label), so verify whether membership.added replicated to the
   payee daemon and whether the TRANSFER row specifically is graded relay.
2. **transfer token_event not projected on payee** — `_hook_token_event_projection`
   (push.ts:72) is a post-commit hook; if the member-push credit path doesn't land the
   transfer commit through the same post-commit hook on the payee, no token_event exists
   → nothing to render. (Payee balance=200 proves the ENTRY reached the fold; confirm the
   post-commit hook fired.)
3. **fields absent** — projection fired but amount/memo/signer_did absent (ciphertext
   catch HC-43, or signer stripped on the replicated commit).

## Fix constraints
- token is foundational — minimal, security-sound change. HC-43: a genuine relay/non-holder
  still gets the ciphertext floor. A caller who genuinely RECEIVED value (folded balance>0 /
  is the transfer's toDid) seeing the attribution of THEIR OWN received value is NOT a leak.
- RED-first: the failing 2-daemon wallet-receipt test IS the RED. Also add a tighter uc/integ
  that reproduces WITHOUT mocking the entry (drive the real projection+subscribe on the payee).
- Verify GREEN with the REAL 2-daemon test (works on Mac tonight).
- Zero Rule (worktree 1644-flow-completion). Prebuilt dylib NAOMS_FFI_LIB_PATH=/Users/mujo/dev/naoms/rust/target/release.

## Blocks
This blocks C4 (wallet-receipt) + C6 (narrative capstone now asserts the wallet terminal)
landing. The single-daemon e2e (C1,C2) + uc suites are GREEN and unaffected.
