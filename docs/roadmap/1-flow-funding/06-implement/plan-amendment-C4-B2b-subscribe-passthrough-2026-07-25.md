# Plan-amendment C4-B2b — token.subscribe must relay the new amount + memo fields

**Status:** STOP+AMEND (proposed) — raised by the C4 wallet/cross-identity
implementer per HC-C3 ("the ONLY backend touch allowed is the push.ts projection
fields; if you find you need more backend, STOP + write a plan-amendment, do NOT
fake"). Awaiting owner/conductor sign-off before the second backend file is touched.

## What is done (in scope, landed on `1644-flow-completion-wallet-c4`)

- **push.ts projection (amendment C4 / B-2, allowed):** `_hook_token_event_projection`
  now projects `amount` + `memo` (additive, guarded, HC-43-safe — a ciphertext
  payload stores neither). Proven at the GRAPH tier:
  `uc-1644-token-event-flow-fields.test.ts` (3/3 GREEN) queries the `token_event`
  node directly and asserts `amount` + `memo` + `signer_did` project for a
  flow-settlement `token.transfer`, and are OMITTED for a value-less/older entry
  and for an opaque payload.
- **Payee UI (C4/G2, pure UI):** `wallet-activity.js` `foldActivityEvents` passes
  `amount`/`memo` through; `buildRow` renders "received N from <payer> · flow
  settlement" for an incoming transfer, gated on `signer_did` (never a bare
  "Transfer"). `uc-1644-wallet-receipt-attribution.test.ts` (2/2 GREEN).
- **Payer UI (C4/B-4, pure UI):** new `wallet-flow-settlements.js` reads the
  EXISTING `flow.get_settlement` and renders "sent N to <payee> · flow settlement ·
  paid ✓". `uc-1644-flow-sent-receipt.test.ts` (4/4 GREEN).

## The gap that needs a decision (why STOP)

The `token_event` node now CARRIES `amount` + `memo`, but the read op that surfaces
the node to the wallet feed — `handleSubscribe`
(`src/packages/token/tools-subscribe-accept-provisional.ts:75-100`) — maps a HOLDER
row through an EXPLICIT allowlist:

```
commit_id, chain_id, token_id, grade, entry_kind, signer_did, (notice/noticeKind)
```

It does **not** relay `amount` or `memo`. So in the LIVE 2-daemon app the payee's
`buildRow` receives `signer_did` (already relayed) but NOT the amount/memo — it
renders **"received from <payer>"** (attribution present; satisfies the owner's core
"who did it come from" complaint and the e2e `attributesToPayer` witness, which
matches on the payer DID) but WITHOUT the **amount N** and WITHOUT the **"· flow
settlement"** label. Those two enrichments are inert until `handleSubscribe` relays
the fields.

This is NOT faked and NOT silently dropped: the projection uc proves the backend
writes the fields; the buildRow uc proves the UI renders them when present; only the
one relay hop is missing, and it lives in a file **outside this task's ownership**
(`tools-subscribe-accept-provisional.ts`, not `push.ts`).

## Proposed minimal change (needs sign-off)

In `handleSubscribe`, the HOLDER branch only, add two additive passthroughs:

```ts
...(p.amount !== undefined ? { amount: p.amount } : {}),
...(p.memo !== undefined ? { memo: p.memo } : {}),
```

- HOLDER-only (the RELAY branch stays the ciphertext floor — HC-43 preserved: a
  non-holder never receives amount/memo).
- Additive + guarded (older nodes without the fields are unaffected).
- RED coverage already latent: `uc-wallet-subscribe-events.test.ts` drives the full
  commit→projection→handleSubscribe→fold path; a new arm asserting a flow-settlement
  transfer's subscribe event carries `amount`+`memo` would be RED before this change,
  GREEN after. (Note: that integ file currently fails 5/5 on THIS Mac at
  `token.define` setup — a pre-existing real-signing/FFI flake, verified on baseline
  by stashing all C4 edits; the new arm is runnable on Kronos / build-host.)

## Why not just do it

HC-C3 scopes the allowed backend touch to `push.ts` only and mandates STOP+amend for
any further backend. `tools-subscribe-accept-provisional.ts` is a second backend file
and not in this task's ownership (another agent may be editing the token op surface).
The change is trivial but the boundary is explicit — hence this amendment rather than
an unsanctioned edit.
