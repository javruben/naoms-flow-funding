# M4 build plan — automated flow rides token.pay under a bounded, revocable ocap

Frozen-plan M4 (security-implementer). Design §8 (design.md:236-267) — the
PRIMARY security surface. depends_on [M3] (epoch-settle exists).

## Contract (frozen-plan)
- T-12: a scoped ocap issued at policy-arm bounds automated `token.pay`;
  over-scope refused. Settlement rides REAL `token.pay` (CORE_APPROVAL_REQUIRED
  **non-bypass**) WITHOUT interactive unlock.
- T-13: revoke via policy-version disarm stops future flow.
- T-14: vault-locked w/o valid pre-ocap refuses LOUD.
- success: bounded flow settles via real token.pay; over-cap + revoked +
  vault-locked all refused; mechanism-asserted gate-fired + cap-bounded.
- non_goals: no UI; no demurrage.
- Failure-mode twins (Honor Layer 9): consent-bounded-success +
  consent-over-cap-refused-failure.

## Files in scope (frozen-plan)
- `src/packages/flow-funding/domain/flow-ocap.ts` (NEW — the scoped ocap:
  issue at policy-arm, bound checks, revoke-on-policy-version).
- `src/packages/flow-funding/handlers/epoch-settle.ts` (settlement rides
  token.pay carrying the capability).
- `src/packages/flow-funding/tests/integ-flow-consent.test.ts`
- `src/packages/flow-funding/tests/e2e-flow-consent-bounded.test.ts`

## Design §8 (security-critical) — the rules
1. token ledger gates EVERY `token.pay` with CORE_APPROVAL_REQUIRED (action-tier).
2. Automated flow MUST **compose with**, NOT bypass, that gate.
3. Holon pre-authorizes via a revocable, scoped ocap ("flow my surplus above
   ceiling along these channels, up to these caps, in this context") issued at
   FlowPolicy-arm time.
4. Each settled allocation rides `token.pay` carrying that capability as its
   authorization, bounded by the cap.
5. Revocation is immediate = a new policy version disarming the engine.
6. A capability that out-scopes its cap is an EoP (Elevation of Privilege) — the
   ocap MUST be provably bounded. (§10 risk #4.)

## Reuse surface (frozen-plan Reuse ledger + design)
- **Biscuit** attenuable capability (design:79) — already used in M-TRANSPARENCY
  (`flow-funding/sharing/biscuit-nhop.ts`): mint/attenuate/verify, max_hops +
  scope caveats. The flow-ocap can mint a Biscuit with caveats bounding
  (context, channels, per-claimant cap, per-epoch cap, policy-version) and the
  token.pay rider verifies it.
- **consent** package (`src/packages/consent/`) — consent/VC/ocap 040-042
  (consent-tools.ts, pre-consent-hooks.ts, namespace.ts). Grant/revoke primitives.
- **token.pay** (`src/packages/token/ops.ts` + manifest) — the action-tier op
  gated by CORE_APPROVAL_REQUIRED.

## KEY RESEARCH — the non-bypass composition SEAM (FOUND 2026-06-20)
**The gate-satisfaction seam is `tokenApprovalReceipt`.** `checkActionGate(toolName,
tokenApprovalReceipt)` at `src/core/security/action-gate.ts:51` — after
`requiresActionApproval(toolName)` is true (token.pay IS), lines 68-72:
```
if (tokenApprovalReceipt) {
  // Token was minted with a per-action approval receipt — allow
  return { allowed: true, requiresApproval: false };
}
```
So a caller TOKEN carrying a valid per-action approval receipt SATISFIES the gate
non-interactively — the receipt IS the approval evidence, NOT a bypass. This is the
composition M4 rides: a pre-authorized, scoped, receipt-bearing capability, NOT
`installActionApprovalAutoGrant` (that is the TEST-mode live-prompt auto-responder —
using it in prod would be theatre per Honor no-test-theatre).

`requestActionApproval` (action-gate.ts:107) is the INTERACTIVE path (owner-authority,
routed to identity[ownerDid].approvals, createApprovalRequest + broadcast +
poll-for-grant). The owner grants ONCE at policy-arm; that grant mints the
receipt-bearing capability the settlement later presents.

### RESOLVED — the standing pre-auth primitive EXISTS (REUSE, no bypass)
`src/core/ucan/capability-token.ts`:
- `mintToken(signFn, scope: TokenScope, expiryMs, approvalReceipt?, pubkeyOverride?)`
  (l.109) → a UCAN `CapabilityToken` carrying `scope` (tools/operations/domains/
  delegation) + `approval_receipt` (l.128) + `expires_at` (l.124). This IS the
  standing, scoped, expiring, receipt-bearing pre-auth.
- Gate enforcement l.308: `if (requiresActionApproval(toolName) && !token.approval_receipt)`
  → a token WITHOUT a receipt is refused for an approval-required tool; WITH a valid
  receipt scoped to the tool, it passes. Non-bypass.
- `verifyToken` (l.141) checks the signature; `isExpired` checks the window.
- `src/core/ucan/overnight-token.ts` is the precedent: it mints a standing cap token
  via this primitive carrying an `approvalReceipt` from the pre-approval flow. NOTE
  the overnight EXCLUSION list does NOT contain `token.pay` (it excludes consent/
  identity/trust/hive/contract/delegation) — so a token.pay-scoped standing cap is
  architecturally sanctioned.

### M4 composition (faithful, reuse-heavy — NO bypass)
1. At `flow.policy_set` (policy-arm), the owner approves the flow authorization ONCE
   (interactive — `requestActionApproval`, action-gate.ts:107, owner-authority).
2. flow-ocap mints (via `mintToken`) a capability token scoped to `token.pay`,
   carrying that approval_receipt, expiry = policy window, + Biscuit caveats
   (biscuit-nhop pattern) bounding context + per-claimant cap + per-epoch cap +
   POLICY-VERSION-N. Persist it bound to the FlowPolicy version.
3. At settlement, epoch-settle verifies the ocap (signature + not-expired + caveat
   bounds: this epoch's allocation ≤ caps, context matches, policy-version current,
   vault-unlocked) → if in-scope, calls REAL `token.pay` presenting the cap token →
   checkActionGate sees the receipt → allows non-interactively. Over-scope / revoked
   (stale policy-version) / vault-locked → REFUSE LOUD, no token.pay (T-12/13/14).
4. Revoke (T-13) = `flow.policy_set` new version → ocap's policy-version caveat stale
   → verify fails → future flow stops.
NEXT BUILD STEP: confirm the token.pay handler's path to RECEIVE + thread the cap
token (how `tokenApprovalReceipt` reaches checkActionGate from a token.pay WS call —
the caller's session token vs an explicitly-presented cap token), then build
flow-ocap.ts RED-first. The integ asserts gate-FIRED (real approval path, not
test auto-grant) + cap-BOUNDED (over-cap refused). Do NOT use
installActionApprovalAutoGrant as the prod mechanism (test-only; theatre in prod).

## Build order (RED-first, mechanism-asserted; e2e gated on CLI-collision ruling)
1. RESEARCH the token.pay gate composition (above) — DO NOT build until the
   non-bypass composition mechanism is identified + verified in code.
2. `domain/flow-ocap.ts`: mint a Biscuit-scoped ocap at flow.policy_set time
   (caveats: context, per-claimant cap, per-epoch cap, policy-version,
   allow-redistribution=false); verify+bound at settlement.
3. epoch-settle.ts: each allocation calls REAL token.pay carrying the ocap;
   over-scope / revoked (stale policy-version) / vault-locked → REFUSE LOUD.
4. integ-flow-consent (2-daemon cross-identity, T-12): bounded settles via real
   token.pay; over-cap refused; revoked-by-new-policy-version refused;
   vault-locked refused. Failure-mode twins.
5. e2e-flow-consent-bounded (T-12e) — BLOCKED on the same `naoms flow` CLI
   namespace collision as T-26e/T-03e (kronos flowCommand shadows flow verbs);
   gated on economics' ruling. Author it; green when the namespace is resolved.

## Cross-cutting note
T-12e shares the `naoms flow` CLI namespace block (see 07-test/m-transparency-
verify-2026-06-20.md). M2/M3/M4/M-TRANSPARENCY e2es all gated on the same ruling.
