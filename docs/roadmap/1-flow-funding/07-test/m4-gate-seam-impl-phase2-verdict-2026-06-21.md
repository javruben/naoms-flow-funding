# M4 gate-seam IMPLEMENTATION — dev-time-self-critic Phase-2 verdict: RESOLVED (2026-06-21)

Phase-2 (implementation risk class, distinct from the Phase-1 design pass which PASSED
after 3 rounds / 6 holes) on the core capability primitive + gate seam. Advisory in-loop
critic; the merge-queue critic remains authoritative at land time (land owner-gated).

## Files reviewed
- `src/core/ucan/delegation-chain.ts` (NEW) — canonicalizePayArgs, unboundMaterialArgsPresent,
  verifyDelegationChain, InMemoryConsumeLedger, verifyPresentedCapability.
- `src/core/ucan/capability-token.ts` (MOD) — DelegationBounds/ActionBinding types,
  exported keyFingerprint+isScopeSubset, mintDelegationRoot/mintActionLeaf, deserialize validation.
- `src/core/security/approval-gate.ts` (MOD) — optional verifyPresentedCapability dep + the
  capability path, applied ADDITIVELY on top of the landed 1662 in-process surface.
- `src/core/ucan/tests/uc-delegation-chain.test.ts` (NEW) — 32/32 GREEN real-Ed25519/Blake3-FFI.

## The review's own line-by-line findings (caught + FIXED before commit, faithful to the PASSED design)
- **F1 (over-scope EoP, MUST):** the draft only ran `isScopeSubset(leaf,root)` — never asserted the
  leaf ITSELF authorizes `token.pay` (design §step-3). Fixed: `leaf.scope.tools === ["token.pay"]`
  exactly + threaded `opName` into `verifyPresentedCapability` (assert `=== "token.pay"`; it was
  dropped before reaching core). Dedicated arms: extra-tool⊆root, empty-[], present-on-non-token.pay.
- **F3 (ledger integrity, SHOULD):** no `amount > 0` check — a negative leaf would underflow the
  aggregate-cap Σ. Fixed: require `action_binding.amount > 0`. Arms: negative + zero.
- **F2 (audit faithfulness, low):** design B2 wants the root `approval_receipt` present as the audit
  link (auth still rests on the SIGNATURE). Fixed: assert presence. Arm: empty-receipt root.
- **F4 (structural, MUST):** the dropped agent added types+deserialize+verify+gate-path but NO mint
  path put the signed sub-objects into the SIGNED body (`mintToken` hardcodes `parent_hash:null`).
  Fixed: added `mintDelegationRoot` + `mintActionLeaf` (+ shared `finalizeToken`) so the sub-objects
  are covered by `content_hash` — the verify primitive is now testable with real sigs AND buildable
  by the step-2 flow minter.

## Stale-base silent-revert caught + corrected
The dropped agent's `approval-gate.ts` was based on a PRE-1662 main → the working-tree diff
REMOVED the entire 1662 M-1662-B "in-process" surface (union member + runtime backstop). Restored
the file from origin/main (`908ccc9ca3c`) and re-applied ONLY the 1644 additions on top → the diff
is now PURELY ADDITIVE (51 insertions, 0 deletions). No foreign work reverted.

## Phase-2 critic verdict (fresh-context sub-agent, canonical rubric/identity read verbatim)
**RESOLVED.** Independently verified: canonicalizer matches `tools-pay.ts` handlePay field-by-field
(the bind-vs-execute drift point — clean; enumeration complete, no `fee`/extra material arg);
B1-B4/N1/N2/A1-A4 all demonstrated; fail-closed on every path (gate falls through to interactive on
any-fail, no leak, no short-circuit); owner pubkey caller-resolved never token-read; caller==owner
never consulted; tampered leaf fails real Ed25519 (mechanism, not field-check); ledger atomic
(no await between read & mark), per-root Σ, single-use nonce; InMemoryConsumeLedger contract honest
that the production graph-backed binding (build-step 2, OUT OF SCOPE) must provide the same atomic
insert+Σ-read; test honesty — no pre-seeding/bypass/skip, every finding has a dedicated arm, ALLOW
path real (first FFI test 518ms = real dylib load). No security/faithfulness/test-theatre defect.

## Out of scope (not defects, deferred)
- Build-step 2: flow epoch-settle mints the root/leaf + presents on token.pay + the production
  graph-backed `capability_nonce_consumed` ledger binding + wiring the closure into the WS dispatch.
- Cross-identity 2-daemon arm + value-move e2e: E1/1596-gated.
- integ-flow-consent (single-daemon) goes GREEN after build-step 2 (build-host).

Sub-agent verdict line (verbatim): `VERDICT: resolved files=src/core/ucan/delegation-chain.ts,
src/core/ucan/capability-token.ts,src/core/security/approval-gate.ts,
src/core/ucan/tests/uc-delegation-chain.test.ts rationale=faithful to PASSED design (B1-B4/N1/N2/A1-A4
+ F1-F4 all demonstrated), fail-closed everywhere, owner-signature is the auth (tampered leaf fails
real Ed25519), canonicalizer matches handlePay field-by-field, ledger atomic/no-TOCTOU, 32/32
real-FFI GREEN with no theatre; build-step-2 wiring correctly out of scope`
