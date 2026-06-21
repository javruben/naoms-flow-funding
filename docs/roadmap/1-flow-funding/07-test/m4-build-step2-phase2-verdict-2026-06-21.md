# M4 build-step 2 — Phase-2 dev-time-self-critic verdict (2026-06-21)

**Verdict: PASS-WITH-FOLLOWUPS.** No BLOCK-class defect. The implementation is a faithful,
security-sound build of the critic-PASSED design. Advisory critic (general-purpose sub-agent,
read-only review of `3de70228051..5d0ca028c20`).

## Security summary (all confirmed by the critic)
- verifier is consult-only, fail-closed fall-through (any cap failure → interactive, never weakens it);
- never branches on `caller==owner` (auth = owner signature on the root via `bridgePubkey()`);
- nonce consumed ONLY on the all-pass path (mark-then-act, no double-spend);
- leaf bound to the EXACT re-canonicalized args (loss_bearer/invoice defaults match `handlePay`);
- `aggregate_cap` (per-root ledger) bounds Σ(leaf amounts), fresh nonce per allocation;
- B1 `type`/`_id` allowlist addition is SAFE (`type` independently asserted `== "token.pay"`);
- K-absent → records-but-no-value surfaced LOUD (`k-unavailable-rearm-required`), no silent movement.

## B-5 result (build-host, single-daemon) — 2/2 GREEN
The M4 gate-seam is PROVEN end-to-end on the production path: owner-signed root (`bridgeSign "ucan:v1"`)
→ K-signed single-use leaf → re-dispatch THROUGH the gate → the capability satisfies
CORE_APPROVAL_REQUIRED NON-INTERACTIVELY → `handlePay` commits TWO real `token.transfer` entries
(entryId witnesses). The non-bypass safety arm holds (unarmed → no value moves).

## Findings + disposition
- **#1 [MEDIUM — honesty] FIXED.** The 15s no-block timeout dumped the allocation into `refused`, but a
  timeout is INDETERMINATE — if the cap verified (nonce consumed) and `handlePay` was merely slow, value
  moved. Reporting "refused" violates the Honesty Axiom. Fixed: a distinct `indeterminate` bucket on the
  `valueMovement` summary (`gated-pay-timeout: the transfer MAY have committed; reconcile via ledger /
  token chain`), surfaced LOUD; the integ asserts `indeterminate.length === 0` on the happy path.
- **#2 [LOW — faithfulness] ANNOTATED.** `verifyFlowOcapForAllocation`'s `policyVersion` check is
  redundant-with-K-discard in the live single-daemon path (root + `currentPolicyVersion` read off the same
  node). Annotated in `flow-ocap.ts`: the load-bearing revocation IS the in-process K discard on re-arm;
  the version check is kept as defense-in-depth for an independently-sourced stale root.
- **#3 [LOW — boot] FIXED.** `capability_nonce_consumed` added to `KNOWN_TABLES` (graph/schema/guard.ts)
  so `validateTables` no longer warns and a future stricter check won't reject it.
- **#4 [INFO] E1 deferral is HONEST, not theatre.** Asserting the payee BALANCE single-daemon would assert
  the WRONG mechanism (the W-3 `handlePay` transfer lacks the `spendNonce` the dual-sign ceremony supplies,
  HC-03; `token_balance` materialize refuses it). The integ asserts the gate-seam mechanism
  (`vm.paid[].entryId` = the committed real transfer) and defers the balance to 1596 E1. Correctly attributed.
- **#5 [INFO — coverage] FOLLOW-UP (M-row).** The live over-cap aggregate-ledger REFUSAL (arm a small
  `automatedSettlementCap`, settle above it → ledger refuses Σ>cap before value moves) is unit-proven
  (uc-capability-nonce-ledger 5/5) but not yet a green integ arm. Now well-defined; land as the next integ
  increment.
- **#6 [INFO] Compression clean** — no dead code, scaffolds, shims, or missing-receiver deferrals.

## Status
Build-step 2 complete: B-0/B-1/B-2/B-3/B-4 wired + B-5 GREEN (2/2) + Phase-2 PASS, findings #1-3 fixed,
#5 a tracked follow-up. Land owner-gated. The 2-daemon payee-credit arm rides 1596 E1 (gate-4,
payee-credit-replication).
