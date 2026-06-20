# M4 gate-seam security design — how a pre-authorized ocap authorizes automated token.pay non-bypass (2026-06-20)

Phase-1 design artifact for the M4 capability→approval-gate seam. The seam lives
in core-security (`approval-gate.ts`), OUTSIDE M4's sealed files_in_scope →
plan-amendment (see `m4-files-in-scope-amendment-2026-06-20.md`) + dev-time-self-
critic review BEFORE coding the 1611-hardened gate.

## Contract (frozen-plan:27-28/149, §8, T-12)
Automated settlement rides REAL token.pay (CORE_APPROVAL_REQUIRED) WITHOUT
interactive unlock and WITHOUT bypass; over-scope refused (EoP, §10 risk #4);
revoke via policy-version; vault-locked refuses LOUD.

## The security problem the naive seam does NOT solve (found 2026-06-20)
A naive seam — "enforceApprovalGate accepts an owner-signed, op-scoped, unexpired
capability → allow" — is **REPLAYABLE for over-scope**. A STANDING token.pay-scoped
flow-ocap (issued once at policy-arm to ride MANY settlements) carries owner-sig +
op-scope + receipt, but core cannot see flow's per-claimant/per-epoch/recipient
bounds, so a holder could replay the SAME cap for a different, over-scope token.pay
(wrong amount/recipient). Core verifying "cap-bounds" is impossible generically
(flow-specific) and core→package coupling if delegated. A standing cap also needs
per-epoch cumulative consumption tracking core can't do generically.

## Faithful design: per-action single-use caps under a standing delegation
Split into a GENERIC core primitive + a flow-specific minting policy, no core→flow
coupling, no replay, no cumulative-tracking-in-core.

1. **Policy-arm (owner approves ONCE):** `flow.policy_set` runs the real owner
   approval. That grant mints a STANDING **delegation** capability (the flow-ocap,
   already built) — it authorizes the flow engine to MINT per-action token.pay
   caps within bounds (context, per-claimant cap, per-epoch cap, policy-version).
   It is NOT itself a token.pay cap; it is the delegation ROOT.
2. **Settlement (per allocation):** epoch-settle, having computed a conserved
   allocation, FIRST runs flow-funding's `verifyFlowOcapForAllocation` (the
   standing delegation's bounds — per-claimant cap, per-epoch total, context,
   policy-version-current, vault-unlocked) → on PASS, mints a FRESH **per-action**
   capability token, a DELEGATED child (`parent_hash` = the delegation cap;
   `can_delegate:false`) cryptographically BOUND to THIS exact token.pay:
   `scope` carries op=token.pay + the exact `{amount, recipient, nonce}`
   (single-use). Presents it on the token.pay call.
3. **Core gate (GENERIC, no flow knowledge) — the seam:** `enforceApprovalGate`,
   before `requestActionApproval`, if the op carries a presented capability:
   - verify the delegation chain to the OWNER (verifyToken at each link vs the
     parent's issuer key; root issuer == ownerDid's key) — owner-rooted;
   - `!isExpired` at every link;
   - the leaf scope authorizes THIS op AND its bound `{amount, recipient}` MATCH
     the actual op args (generic arg-match — core reads `args.amount`/`args.toDid`,
     no flow semantics);
   - the leaf `nonce` is SINGLE-USE: not already consumed (a small core-side
     consumed-nonce set keyed by leaf id; generic, not flow-specific) → mark
     consumed on allow;
   - on ALL PASS → allow (the owner-rooted, action-bound, single-use cap IS the
     authorization evidence). On ANY FAIL → fall through to the interactive path
     (NO weakening). Fails closed.
   This is a GENERAL capability primitive (any package can pre-authorize a bounded
   automated action), reusable, and explicitly DISTINCT from the 1611-removed
   loopback (that was caller==owner, NO signature, NO scope, blanket — this is
   owner-SIGNED, op+arg-SCOPED, single-use, time-bounded, revocable).

## Why this is secure
- Replay: a leaf cap is single-use (nonce consumed) + arg-bound → cannot authorize
  a second or different token.pay.
- Over-scope: core checks the leaf's bound amount/recipient == the actual op args.
- Per-epoch cap: enforced by flow-funding (`verifyFlowOcapForAllocation`) at mint
  time (it only mints a leaf if the running epoch total is within cap) — core
  never needs flow-specific cumulative state.
- Revoke (T-13): a new policy-version disarms the standing delegation
  (verifyFlowOcapForAllocation refuses) → no new leaves minted.
- Vault-locked (T-14): verifyFlowOcapForAllocation refuses at mint.
- caller==owner is NEVER consulted (the deps warn against it) — auth is the
  owner SIGNATURE on the delegation chain, not the caller identity.

## Consumption store — DECIDED (economics ratify 2026-06-20): CORE-side, generic
The single-use nonce check is a GENERAL core capability concern (any package
pre-authorizing a bounded automated action needs it) — flow owning the store would
reintroduce the (B) core→package coupling. So CORE owns it:
- A generic `capability_nonce_consumed` graph node (id = the leaf cap id / nonce),
  written by core in the gate's ALLOW path, BEFORE the action proceeds (mark-then-
  act, so a crash after mark fails closed — the cap can't be replayed).
- Durable across restart (graph, not in-memory). Idempotent: a second presentation
  of the same nonce finds the consumed node → REFUSE (fall through to interactive).
- Critic must validate: (1) the gate-path write does not reintroduce a
  write-in-the-gate deadlock/hazard (cf. the PC-788/_writeLock silent-drop class —
  the gate is a handler-context, not a materialize-phase enricher, so a guarded
  async write should be safe, but the critic confirms); (2) mark-then-act ordering
  is fail-closed; (3) no TOCTOU between the consumed-check and the mark (single
  atomic upsert keyed on nonce).

## Critic open items (for Phase-1 review)
- Per-action minting latency (an Ed25519 sign per allocation) — settlement is not
  hot-path; acceptable, but confirm.
- Delegation-chain depth + verification cost bound (cap `max_delegation_depth`;
  the leaf is depth-1 under the standing root → cheap).
- Confirm the gate's caller==owner invariant is never consulted (auth = the owner
  SIGNATURE on the chain, not caller identity) — design holds it; critic verifies.

## Build order (post critic-PASS)
1. core: generic capability-presentation acceptance in enforceApprovalGate
   (verify chain + arg-match + single-use nonce) + the consumed-nonce store.
2. flow: epoch-settle mints per-action delegated caps + presents on token.pay;
   the standing flow-ocap becomes the delegation root (adjust mintFlowOcap to set
   can_delegate + the per-action child minter).
3. green integ-flow-consent (single-daemon); cross-identity stays E1-gated.
