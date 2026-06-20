# M4 build-step 2 — flow consumer wiring + production ledger + WS-dispatch closure (2026-06-21)

Build-step 1 (the generic core capability primitive + gate seam) is VERIFIED + committed
(`78f782ec9a0`, Phase-2 RESOLVED). Build-step 2 wires flow into it + the production ledger,
to green `integ-flow-consent` (single-daemon, build-host). Faithful to the critic-PASSED design
(`m4-gate-seam-security-design-2026-06-20.md`, build order step 2). Land stays owner-gated.

## DECISION — the delegated engine key K (B4): ephemeral per-policy-arm IN-PROCESS key
B4 requires K ≠ owner key (a stolen root + a random key must not mint valid leaves). The existing
`mintFlowOcap` signs with the OWNER signFn — that is the ROOT signer, not K. Resolution:

- At `flow.policy_set` (owner-approved policy-arm), the flow engine generates a FRESH Ed25519
  keypair `K` in-process and mints the delegation ROOT (owner-signed, via the existing owner
  signFn) with `delegation_bounds.delegated_key = fingerprint(K.pub)`.
- `K`'s private half is held in-process by the flow engine for the policy-version's life. Epoch-settle
  signs per-action leaves with `K`. On revoke (new `policy_version`) OR process restart, `K` is
  discarded → no new leaves until re-arm (an owner action; the conserved allocator re-derives the
  allocation next epoch — NOT a lost payment).
- Rationale: matches the design B4 residual-risk framing ("K lives in-process, bounded by
  aggregate_cap + expiry + revoke") + the Mystery axiom (forgetting K on restart is acceptable, not a
  fault). It avoids introducing a new PERSISTENT protected-key lifecycle (least new surface). The
  blast radius of a K-compromise is bounded by the owner-signed `aggregate_cap` + the root `expires_at`
  + revoke-by-policy-version — exactly the design's stated bound.
- **K.pub resolution for the gate:** `verifyDelegationChain` needs K.pub BYTES (`verifyToken(leaf,
  K.pub)`), but the root carries only K's FINGERPRINT (one-way). In SINGLE-DAEMON the minting engine
  and the verifying gate are the SAME process → the WS-dispatch closure resolves K.pub from in-process
  engine state (no on-graph lookup needed). CROSS-DAEMON (E1-gated) would replicate K.pub on-graph as
  the delegate registration — deferred with the rest of the 2-daemon arm.

## Parts (single-daemon; cross-identity 2-daemon arm stays E1/1596-gated)

### B-1. flow-ocap.ts reconciliation (old single-cap model → delegation root + leaf)
- `mintFlowOcap` → mint the delegation ROOT: owner-signed, `can_delegate:true`, `scope.tools
  ⊇ ["token.pay"]`, `delegation_bounds = { delegated_key: fp(K), aggregate_cap, context,
  policy_version }`, `approval_receipt = <policy-arm owner receipt>`. `aggregate_cap` derives from the
  owner-signed `perEpochCap` (the coarse core ceiling).
- `verifyFlowOcapForAllocation` STAYS as the FINER mint-time gate (per-claimant cap / per-epoch total /
  context / policy-version-current / vault-unlocked, T-12/T-13/T-14, already 10/10). On PASS → mint a
  per-action LEAF via `mintActionLeaf` signed by `K`, bound to the canonicalized
  `{token, toDid, amount, loss_bearer, invoice, nonce}`.
- NOTE the OUTDATED `flow-ocap.ts` header ("rides E1/1596 `handleTokenPay`, `TokenOpNotYetWiredError`")
  — `handlePay` (tools-pay.ts, dispatched tools.ts:636) is the LIVE wired path; `handleTokenPay`
  (ops.ts:147) is the throwing stub. Single-daemon epoch-settle presents on `handlePay` via
  `args._capability = { leaf, root }`. Fix the stale header in this step.

### B-2. epoch-settle consumer wiring (handlers/epoch-settle.ts)
- Per conserved allocation: `verifyFlowOcapForAllocation` → mint leaf → dispatch the gated `token.pay`
  (handlePay) with `args._capability`. Single-daemon co-sign: holon + an ADMITTED claimant co-sign on
  one daemon (W-3-CLI waiver) → final-between-parties. (token.define + token.admit the claimant first.)

### B-3. production graph-backed ConsumeLedger (A1/A2)
- A CORE infra node kind `capability_nonce_consumed` declared on the core manifest (PC-329/326,
  NOT package-redeclarable); id = leaf nonce; carries `(root_id, amount)`.
- `tryConsume`: in ONE atomic step — refuse if the nonce node exists (replay) OR if `Σ(amount under
  root_id) + amount > aggregate_cap`; else `securedAppend` the node via the canonical write-path
  (1567), AWAIT to completion BEFORE returning `consumed:true` (no fire-and-forget; mark-then-act
  fail-closed). Atomicity via a UNIQUE constraint on nonce + the Σ-read in the same tx (the no-TOCTOU
  contract `InMemoryConsumeLedger` already encodes). Handler-context write (NOT a materializer → PC-788
  N/A).

### B-4. WS-dispatch closure wiring (message-router)
- For the token.pay dispatch surface, construct `EnforceApprovalGateDeps.verifyPresentedCapability` =
  closure over core `verifyPresentedCapability(opName, {leaf,root}, args, { ownerPubkey, leafIssuerPubkey:
  K.pub, ledger })`. `ownerPubkey` from the on-graph owner identity (same source `_resolveOwnerSigner`
  uses); `K.pub` from in-process engine state (single-daemon); `ledger` = the B-3 graph-backed binding.
  NEVER branch on caller==owner.

### B-5. green integ-flow-consent (single-daemon, build-host)
- `NAOMS_INTEG_FLOW_CONSENT=1` on build-host: token.define → token.admit claimant → flow.policy_set
  (arm: mint root + K) → flow.epoch_settle (per allocation: verify → mint leaf → present on token.pay →
  claimant credited). Assert claimant credited via REAL token.pay (token-chain fold readback, not
  pre-seeded); over-cap / revoked / vault-locked REFUSE before any value moves. MBP is flow-integ
  FORBIDDEN → run on build-host.

## Sequence
B-3 (core ledger, self-contained, deno-check on MBP) → B-1 (flow reconciliation) → B-2 (epoch-settle)
→ B-4 (closure wiring) → B-5 (build-host integ). Each goes through deno check; the integrated result
gets a build-step-2 Phase-2 critic before commit (same bar as step 1). Cross-identity 2-daemon arm +
value-move e2e stay E1/1596-gated.
