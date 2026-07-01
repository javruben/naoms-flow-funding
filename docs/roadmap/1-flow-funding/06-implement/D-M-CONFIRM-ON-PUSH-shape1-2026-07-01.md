# D — M-CONFIRM-ON-PUSH: shape-1 confirm-on-push reconciliation (2026-07-01)

Design note for the celebrate-blocking M-row
`07-test/M-CONFIRM-ON-PUSH-cross-device-settle-celebrate-blocking-2026-06-21.md`.
Every fact below is code-verified this turn (file:line cited); nothing assumed.

## Problem (recap)
`moveSettlementValue` (handlers/epoch-settle.ts:217-259) races each gated
`token.pay` against a **15s** timeout. A cross-device claimant's pay rides the
real FROST 2-of-2 quorum ceremony (`coordinateQuorumSign`,
core/crypto/chain-quorum-sign-coordinator.ts:236) + member push, which
legitimately exceeds 15s → the leg buckets `indeterminate`. The settle RESPONSE
reports `indeterminate`, and **nothing persists it**, so the holon (operator)
never sees the settlement resolve to `paid` even though the credit lands. A holon
settling to cross-device claimants would report `indeterminate` forever.

## Verified substrate facts
- **token.transfer entry** (token/tools-pay.ts:180-188) carries
  `{kind,toDid,loss_bearer,amount,memo,payerDid,invoiceRef?}` — the ONLY
  caller-threadable free field is **`memo`**. Committed on the per-token quorum
  chain `token-<tokenId>` (TOKEN_BRANCH_PREFIX), signed by the holon (payer).
- **The late-completing transfer lands on the HOLON's own daemon** (it is the
  ceremony initiator; `securedAppend` returns post-ceremony and inserts locally),
  firing the token-branch post-commit hook chain — token/register.ts:139-143
  registers `_hook_token_balance_materialize` as a **post-sync `PostCommitHookFn`**
  gated on the `"token-"` prefix, firing on BOTH local append AND push.
- **`memo` is gate-SAFE**: delegation-chain.ts:61-74 lists `memo` in
  `NON_MATERIAL_PAY_ARG_KEYS`; `unboundMaterialArgsPresent` (L121-132) returns
  false for it; `canonicalizePayArgs` (L98-115) excludes it. → Threading `memo`
  does NOT alter the leaf `action_binding` and does NOT trip the B1 fail-closed
  gate. It is the correct correlation carrier.
- **Enrichers/hooks MUST NOT emit chain events** (core silent-drop class,
  PC-788/551 `_writeLock` deadlock). → the reconciliation is a **graph-only**
  update; operator visibility rides the `flow_settlement` graph projection
  (PC-257 operator-events), NOT an ad-hoc WS broadcast.

## The fix (shape-1)
**(A) Correlation — thread a flow marker into the settlement pay `memo`.**
In `moveSettlementValue`, set
`memo = "flow-settle:" + settlementEntityId + ":" + alloc.id` on the `payArgs`
for every settlement `token.pay` (both fast-path and late legs, uniform). Pass
`settlementEntityId` (the `flow-settlement-<holon>-<context>-<ts>` id minted at
epoch-settle.ts:362) into `moveSettlementValue`. Gate-safe (verified above).

**(B) Persist a per-leg status map on the `flow_settlement` node.**
The generic triple materializer already projects `flow.epoch_settled` →
`flow_settlement` (manifest.ts:56) with `allocations:[{id,amount}]`. Add a
`legStatus` map property (default: an allocation with no entry = `pending`).
Written idempotently by the reconciliation hook. (Pending is the DEFAULT — we do
NOT persist `indeterminate` explicitly; absence of a paid entry = not-yet-paid.)

**(C) Reconciliation — flow-funding post-commit hook.**
Register (in register.ts, mirroring token/register.ts:139-143) a **post-sync
`PostCommitHookFn`** gated on the `"token-"` prefix:
`(db, chainId, branch, commit) => { if !branch.startsWith("token-") return;
read the committed transfer entry's memo; if it matches
"flow-settle:<entityId>:<claimantDid>", idempotently graphPut the
flow_settlement node <entityId> marking legStatus[claimantDid]="paid" (+ record
the transfer entryId).}` Best-effort + non-fatal (wrap in try/catch like
token_balance). Uses `graphQueryAsync`/`graphPutAsync` (PC-839). Fires on the
holon's late LOCAL commit; re-derives on replay (idempotent).

**(D) Operator visibility.** The wallet/CLI reads the `flow_settlement` node's
`legStatus` — a settlement leg shows `pending` until the credit commits, then
`paid`. (This is the operator-visible settle-status artifact the QM flagged as
possibly walk-relevant.)

## Acceptance (from the M-row)
2-daemon e2e: holon settles surplus to a cross-device claimant whose gated pay
exceeds 15s (→ `indeterminate` in the response); after the FROST ceremony
completes + the credit replicates, assert the holon's `flow_settlement`
`legStatus[claimant]` transitions to `paid`. Run on idle m5090
(`NAOMS_E2E_FLOW_2DAEMON_CLI=1` / `NAOMS_INTEG_FLOW_2DAEMON=1`).

## Files to touch (flow-funding only — NO matrix, NO core-gate change)
- `handlers/epoch-settle.ts` — pass `entityId` into `moveSettlementValue`; set
  `memo` on `payArgs`.
- `register.ts` — register the reconciliation post-commit hook.
- new `domain/settlement-confirm-hook.ts` (or `materializers/`) — the hook.
- `manifest.ts` — (if a queryable `legStatus` needs declaration; graph prop on
  existing `flow_settlement` node — verify no new nodeKind needed).
- `tests/integ-flow-payee-credit-2daemon.test.ts` + `e2e-flow-payee-credit-cli.test.ts`
  — add the record-transition assertion.

## SHIPPED DESIGN (supersedes "The fix" above — refined during implementation)

Two changes vs the sketch above, both forced by verified facts:

1. **Confirm state lives on a DEDICATED `flow_settlement_confirm` node, NOT a
   `legStatus` property of `flow_settlement`.** Why: `_graphPutAsync` is a
   full-property put and the generic triple materializer re-projects
   `flow.epoch_settled` on every backfill/replay — which would CLOBBER a
   `legStatus` property (the confirming `token.transfer` is a different event on a
   different chain, so the hook does not re-run in lockstep with that re-put). A
   dedicated hook-owned node (id `flow-settle-confirm:<settlementId>:<claimant>`)
   is never touched by any generic materializer → replay-durable regardless of
   cross-chain order. Idempotent full-state upsert.
2. **NO chain event; graph-only.** A post-commit hook MUST NOT `securedAppend`
   (PC-788/551 `_writeLock`). So there is no `flow.settlement_confirmed` chain
   event — the confirm is a pure graph projection of the `token.transfer` chain
   event (analogous to `token_balance`). Operator visibility is the new
   `flow.get_settlement` read verb, which JOINs `flow_settlement.allocations`
   with the `flow_settlement_confirm` nodes → per-leg `paid` | `unconfirmed`.

Shipped files: `handlers/epoch-settle.ts` (memo tag + `settlementId` on payload +
`handleGetSettlement`), `domain/settlement-confirm-hook.ts` (the hook),
`register.ts` (register hook), `manifest.ts` (`flow_settlement_confirm` graphType
+ `flow.get_settlement` wsTypes), `manifest-operations.ts` (`get_settlement` op →
`flow-funding get-settlement` CLI), `namespace.ts` (route), `cli-index.json`
(regen), `tests/e2e-flow-payee-credit-cli.test.ts` (leg unconfirmed→paid
assertion + `@mechanism-asserted M-CONFIRM-ON-PUSH`). Type-checks green.

## Open impl detail (resolve while coding)
- Does the `PostCommitHookFn` `commit` param carry the entry payload (memo), or
  must the hook re-read the branch-head entry? If it carries the payload → O(1)
  per commit; else read the head token.transfer entry. Either is idempotent.
- Confirm the `flow_settlement` legStatus write survives the generic
  materializer re-projecting the node on a later `flow.epoch_settled` (different
  entityId per epoch → no clobber; same-entityId re-fold is idempotent).
