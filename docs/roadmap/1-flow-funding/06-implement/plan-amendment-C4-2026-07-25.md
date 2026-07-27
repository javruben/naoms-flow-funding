# Plan-amendment C4 — token_event projection carries amount + flow-settle memo

**Trigger:** critic finding B-2. `_hook_token_event_projection`
(`src/packages/token/domain/push.ts:133-150`) currently projects only
`commit_id/chain_id/branch/event_type/token_id/entry_kind/signer_did` — NO
amount, NO memo. C4 (wallet shows "received N **from** X · flow settlement · paid")
needs more than `signer_did`.

**Decision: INCLUDE a minimal, additive projection change in C4 scope** (not a
deferral). Rationale: the owner's explicit requirement is to SEE the amount and
the source of an incoming flow. `signer_did` alone gives "from" but not the
amount or the flow-settle correlation. Adding `amount` + `memo` to the existing
projection hook is additive, low-risk, and is the honest minimal wiring — exactly
what HC-C3 means by "amend, do not fake." This is NOT a new subsystem; it is two
fields on an existing hook.

**Scope delta to C4 (frozen-plan-completion):**
- `src/packages/token/domain/push.ts` `_hook_token_event_projection`: also
  project `amount` and `memo` (the `flow-settle:<settlementId>` memo already
  rides the `token.pay`, per `epoch-settle.ts:moveSettlementValue`) onto the
  `token_event` node. Additive columns; guard for absence (older events).
- RED coverage: the C4 `wallet-receipt` test asserts the payee row shows the
  AMOUNT and a flow-settlement attribution (from `signer_did` + memo), not a bare
  balance. Add the projection-field assertion at the WS/graph tier
  (`token_event` carries amount+memo after a flow settlement) so the backend
  delta is mechanism-asserted, not just UI.
- Keeps HC-C3 honest: the ONE backend touch is named here and bounded.

**Payer side (B-4):** the "sent N to X · paid ✓" row reads `flow.get_settlement`
(already exists, per-leg paid status) — pure UI, no backend. Add its RED test.

**Constraint:** this projection change touches the `token` package, not just
flow-funding — the C4 implementer must respect the token package's manifest/test
conventions and add a token-side uc/integ proving the new fields project.
