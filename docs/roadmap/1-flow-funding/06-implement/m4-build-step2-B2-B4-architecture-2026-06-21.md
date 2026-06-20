# M4 build-step 2 — B-2/B-4 architecture: K-lifecycle + in-process gated re-dispatch (2026-06-21)

The durable design for the remaining value-movement code (B-2 epoch-settle wiring + B-4
WS-dispatch closure). Build-step 1 (gate primitive, Phase-2 RESOLVED), B-3 (production
ledger, 5/5), and B-1 (flow minters, 12/12) are committed + real-FFI-verified. This note
resolves the two real design points so the B-2/B-4 code is a faithful build, not improv.

## The crux — epoch-settle must ride token.pay THROUGH the gate, not around it
`handleEpochSettle` (handlers/epoch-settle.ts) today computes a conserved allocation +
commits `flow.epoch_settled`; it moves NO value. The gate `enforceApprovalGate` is NOT
inside `handlePay` (tools-pay.ts) — it is invoked by the DISPATCH layer
(`message-router-dispatch-ws.ts:407`, `enforceApprovalGate(type, msg, {surface:"ws", …})`).
So if epoch-settle called `handlePay` directly it would BYPASS the gate entirely (no
capability check) — defeating M4. **Resolution:** epoch-settle, per allocation, RE-DISPATCHES
a `token.pay` op through the SAME in-process dispatch entry that runs the gate, carrying
`msg._capability = { leaf, root }`. The gate at :407 then runs the B-4
`verifyPresentedCapability` closure → ALL-PASS → `handlePay` executes → the claimant is
credited. The cap is enforced because the value-leg goes through the gate-bearing path.

### B-2 — epoch-settle wiring
- Inject an in-process op-dispatch capability into `EpochSettleContext` (a `dispatch(type, msg)
  → Promise<result>` that routes through the gate-bearing dispatcher — the same one the WS
  handler uses). This keeps epoch-settle decoupled from the transport while still traversing
  the gate. (Alternative: import the in-process dispatch entry directly; injection is cleaner +
  testable. The injected dispatch is the ONLY new ctx surface.)
- Per allocation `{ id: claimantDid, amount }`:
  1. `verifyFlowOcapForAllocation(root, settlementCheck)` (mint-time finer gate: per-claimant /
     per-epoch / context / policy-version-current / vault-unlocked). On REFUSE → skip + surface
     LOUD (no silent drop); the settlement event still records the allocation, but no value moves.
  2. Canonicalize the pay args (`canonicalizePayArgs`) + mint the leaf
     (`mintFlowActionLeaf`, signed by K, fresh nonce).
  3. `await ctx.dispatch("token.pay", { token, toDid: claimantDid, amount, _capability: { leaf,
     root } })`. token.pay (handlePay) requires the payee be an admitted member → the holon
     admits claimants (token.admit) as part of arming/settlement; single-daemon W-3-CLI co-sign.
  4. Read back the result; a REFUSE (gate fell through to interactive, or handlePay refused)
     is surfaced — never a silent skip.
- Ordering: mint the leaf + dispatch per allocation; the per-root aggregate ledger (B-3) caps the
  cumulative value across the epoch's leaves (and across epochs under the same root).

### K-lifecycle (ratified: ephemeral per-policy-arm in-process key)
- At `flow.policy_set` (owner-approved arm): generate a FRESH Ed25519 `K` in-process; mint the
  delegation ROOT (`mintFlowDelegationRoot`, owner-signed, pins `fingerprint(K.pub)`); persist the
  ROOT on-graph as a `flow_delegation` node keyed by the policy entity (owner-signed → safe on
  graph; it carries no secret). Hold `K` (private) in an in-process engine map keyed by the policy
  entity id, for the policy-version's life.
- At `flow.epoch_settle`: look up the ROOT (graph, by policy entity) + `K` (in-process map). If `K`
  is absent (process restarted since arm, or policy revoked) → the settlement records allocations
  but moves NO value until re-arm (owner action; the conserved allocator re-derives next epoch —
  NOT a lost payment). Surface this LOUD (`k-unavailable-rearm-required`), never silent.
- `aggregate_cap` on the root = an owner-signed life-ceiling (B-1 takes it explicitly); for the MVP
  single-arm window set it from the policy's `perEpochCap` (one epoch) OR an explicit owner total.

### B-4 — WS-dispatch closure
- In `message-router-dispatch-ws.ts`, extend the `enforceApprovalGate` deps (:407) with
  `verifyPresentedCapability: (opName, args) => coreVerifyPresentedCapability(opName,
  { leaf: args._capability.leaf, root: args._capability.root }, args, { ownerPubkey, leafIssuerPubkey:
  Kpub, ledger })` — but ONLY construct it when `args._capability` is present (else the closure is
  absent and every approval op takes the interactive path, unchanged).
  - `ownerPubkey`: resolve from the on-graph owner identity (same source `_resolveOwnerSigner`).
  - `Kpub`: resolve from the in-process engine map by the root's `delegation_bounds.delegated_key`
    fingerprint (single-daemon). NEVER from the token.
  - `ledger`: a process-singleton `CapabilityNonceLedger(dbHandle)`.
- Boot: call `ensureCapabilityNonceLedgerSchema(db)` in the daemon schema-init sequence (pre-freeze).
- NEVER branch on caller==owner — auth is the owner signature on the chain.

### B-5 — integ-flow-consent (single-daemon, build-host only; MBP flow-integ FORBIDDEN)
token.define → token.admit(claimant) → flow.policy_set (arm: mint root + K) → flow.epoch_settle
(verify → leaf → dispatch token.pay → claimant credited). Assert: claimant credited via REAL
token.pay (token-chain fold readback, not pre-seeded); over-cap / revoked / vault-locked REFUSE
before value moves. Then the build-step-2 Phase-2 critic before commit.

## Why fresh-focus for B-2/B-4 code (economics-aligned)
B-2 is NEW logic on the value-movement path (the in-process gated re-dispatch + K-lifecycle +
token.admit setup span flow handlers + core dispatch). Same security-critical class where fresh
focus made the gate-seam verification catch 4 holes a marathon-tail would miss. The core is banked
+ loss-safe (3 commits + 2 design notes + tasks #49-51). Resume: build B-3-style increments
(B-4 closure, then B-2 wiring) on MBP with deno check, then B-5 on build-host, then Phase-2 critic.
Cross-identity 2-daemon arm + value e2e ride E1/1596 (gate-4, payee-credit replication).
