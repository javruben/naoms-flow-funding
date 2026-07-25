# C8 — flow_outcome transparency reshare does not cross (M-TRANSPARENCY bug)

**Status: real bug, firsthand-confirmed on build1 @344bfa87779. SEPARATE from C7 (UI value-movement, fixed).**

## Symptom
After a UI-driven epoch settle that MOVES real value (C7 fix — `flow settlement leg confirmed paid` on both
daemons), the payer's flow-funding transparency **`flow_outcome` node never crosses to the payee**. C6
`e2e-flow-funding-narrative.test.ts:523` fails: `flow outcome did not CROSS (peer_did==payer, total_flowed>0)
within 120s`. Grep finds ZERO `flow_outcome` nodes on EITHER daemon.

## What works (rules out the obvious)
- Value moves: `flow settlement leg confirmed paid (confirm-on-push)` on founder AND invitee-a.
- `epoch-settle.ts:584` calls `triggerFlowReshareAfterSettle`.
- `sharing.flow-funding` domain registered on both (`triggerKinds:["flow_settlement"]`, pluginId
  `flow-funding-transparency`).
- `[sharing.apply_decisions] applied {peerDid:<payee>, domainCount:1, overrideCount:1}` — payee granted access.

## CORRECTED narrowing (firsthand code read)
- `build()` (flow-domain.ts) is FINE: it aggregates `total_flowed` from `flow_settlement.settledTotal`
  (=200, present immediately at settle) — NOT from confirmed-paid legs. So confirm-on-push timing is NOT the
  cause; the payload the payer should share carries `total_flowed:200`.
- ⇒ The bug is in **share EMISSION/DELIVERY**: the `sharing.flow-funding` reshare is never emitted/delivered to
  the payee (agent grep: zero flow-funding reshare emission; only token FROST signer-reshare from admit). So the
  payee's `materialize()` never fires → no `flow_outcome` node. Focus: `evaluateReshare` + suppress/flush in the
  sharing engine, whether the payer's transparency override actually makes the payee a share RECIPIENT, and
  cross-peer delivery of the share event. This is a sharing-engine subsystem issue, deeper than "UI wiring".

## Where the gap is (candidates, for a focused fix)
The reshare is TRIGGERED but produces/crosses NO `flow_outcome`. The receive-side `flow-domain.ts materialize()`
writes `flow_outcome` from a peer's shared payload — so the payer's SHARE payload (build side) is either not
produced, empty, or not delivered. Investigate:
- `sharing/flow-domain.ts` build/`buildDirectOutcome` — does it read the payer's `flow_settlement` and emit a
  non-empty outcome (total_flowed>0)? (I read materialize + buildForwardedOutcomes; the DIRECT-outcome build
  is the prime suspect — it may not aggregate the just-committed settlement, or the Biscuit N-hop capability
  mint returns null → shares without a capability → receive side drops it.)
- `reshare-trigger.ts` suppress/flush timing + `evaluateReshare` (sharing-engine) — does the flow-funding
  domain actually fire and SEND to the payee?
- Biscuit N-hop (`biscuit-nhop.ts`, flow-domain.ts:118 "share direct-only (no reshare authority)") — if the
  mint fails, the outcome may share without a capability and the receive side (`materialize` needs
  `cap.contract`) drops/nulls it.

## Impact / scope
- The flow_outcome node feeds the flow-funding "Received/Velocity" TRANSPARENCY surface — NOT the wallet receipt.
- The owner's literal ask ("see tokens come into my wallet from another") = the WALLET row, fed by the token
  TRANSFER, which works (C4) and now moves via UI (C7). So the owner-facing requirement does NOT depend on C8.
- C8 is the flow-funding transparency-attribution feature (M-TRANSPARENCY). Real bug; tracked here.

## Options (owner decision — see 0940Z/1030Z DD relay)
1. FIX the reshare path now (in-scope M-TRANSPARENCY; depth uncertain — needs the build/Biscuit investigation above).
2. Realign C6's terminal witness to C4's proven owner-facing outcome (payee token credit + wallet "received
   from payer" via UI) — the star's "dependent receives value" proof + the owner's literal ask — and carry C8
   as a tracked follow-on (M-row now; 10-bug after celebrate). NOT hiding the bug; the wallet path is genuinely real.

Repro: build1 `/root/dev/naoms-wt-1644c6b`, `c6-build1-c7.log`. Branch @344bfa87779.
