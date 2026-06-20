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

## REVISION (closing critic Phase-1 CONCERNS — see 07-test/...-critic-phase1-verdict)

### B1 — bind ALL economically-material token.pay args (enumerated against handlePay)
`handlePay` (tools-pay.ts) reads these msg fields; the economically-material set the
leaf MUST bind (and core MUST arg-match exactly, fail-closed on any unbound material
field present in args) is:
- `token` / `tokenId` — **THE currency binding.** A tokenId identifies one token
  chain = one kind/currency; binding it CLOSES the kindA→kindB substitution (B1's
  core attack). REQUIRED.
- `toDid` / `to` — recipient. REQUIRED.
- `amount` — exact units. REQUIRED.
- `lossBearer` / `loss_bearer` — who bears loss (DE-27 ghost-guarantor surface);
  economically material → BIND (default = payee; a leaf must bind the resolved value).
- `invoice` — if the pay cites an invoice, the cited invoice id is material → BIND
  (a leaf without an invoice cite must NOT authorize an invoice-citing pay, and vice
  versa; the at-sign re-render already rejects amount-mismatch, but the BINDING must
  cover the cite identity).
- NOT material (need not bind): `memo` (a free note; carries no value semantics).
Core's check = ALLOWLIST: for every material field above, leaf.bound[field] ===
args[field]; AND args carries NO *other* field that affects value (fail-closed: if a
future token.pay arg appears that isn't in this allowlist, the gate REFUSES the
capability path and falls through to interactive — so a new material arg can't slip
through unbound). The leaf scope encodes these as a canonical bound-args object;
core compares the canonicalized args. (B2/B3/B4 resolutions: TODO this revision.)

### B2 — `verifyDelegationChain` (new core primitive) + auth rests on the owner SIGNATURE
`verifyToken(token, pubkey)` (capability-token.ts) checks ONE signature; no chain
walk. Add a core primitive `verifyDelegationChain(leaf, root, ownerPubkey, opArgs)`:
1. **Root** (owner-rooted): `verifyToken(root, ownerPubkey)` where `ownerPubkey` is
   resolved from the ON-GRAPH owner identity (the SAME source `_resolveOwnerSigner`
   uses — NEVER a key carried in the token) + `!isExpired(root)` + root.scope
   authorizes op-class token.pay + root carries `delegated_key` + `aggregate_cap` +
   `expires_at` (B3/B4).
2. **Leaf**: `verifyToken(leaf, K)` where `K`'s fingerprint == `leaf.issuer_key_id`
   AND `leaf.issuer_key_id === root.delegated_key` (B4 — the leaf MUST be signed by
   the owner-delegated engine key, not any key) + `leaf.parent_hash ===
   root.content_hash` + `isScopeSubset(leaf.scope, root.scope)` re-checked at VERIFY
   (not trusted from mint) + `!isExpired(leaf)`.
3. **Arg-bind (B1)**: every economically-material `opArgs` field === `leaf.bound[field]`
   (allowlist; fail-closed on unbound material field present).
**Authorization rests on the owner SIGNATURE on the root** (only the owner key can
mint a root). The `approval_receipt` is the AUDIT LINK to the policy-arm owner
approval, NOT the sole evidence — so we do NOT inherit action-gate.ts:69's
"any non-null receipt passes" (a forged receipt string is worthless without the
owner signature on the root). State the receipt is checked for presence + audit
provenance; authorization = the signature chain.

### B3 — owner-signed AGGREGATE + TIME ceiling on the root, core-enforced
The root's owner-signed scope carries `aggregate_cap` (total value authorized over
the root's life) + `expires_at` (short, owner-chosen; renewal = a fresh owner
approval at `flow.policy_set`). The core consumption store (below) becomes a
per-ROOT consumption LEDGER: each allowed leaf records `(root_id, leaf_nonce,
amount)`; the gate REFUSES if `Σ(amount under root_id) + leaf.amount > aggregate_cap`
OR the root is expired. So even a misbehaving/compromised flow engine CANNOT mint
leaves whose CUMULATIVE authorized value exceeds what the OWNER signed — core's
defense no longer reduces to "trust the flow engine." (Flow's
`verifyFlowOcapForAllocation` per-claimant/per-epoch caps remain as the finer,
mint-time bound; the root aggregate_cap is core's independent coarse ceiling.)

### B4 — root-replay closed: owner-signed delegate key + aggregate ceiling
The standing root is `can_delegate:true` and DELEGATES to a SPECIFIC engine key `K`
(`root.scope.delegated_key`), owner-signed. Leaves are valid ONLY if signed by `K`
AND parented to the root (B2 step 2). So a stolen root + a RANDOM key cannot mint
valid leaves (the random key's fingerprint ≠ `root.delegated_key`). The root IS the
on-graph delegate registration (owner-signed — no separate registry needed). Residual:
stolen root AND the engine key `K` together → mitigated by (a) `K` lives in the
signer subprocess / in-process (not a transportable artifact; same protection as the
owner key), and (b) the B3 `aggregate_cap` + short `expires_at` BOUND the blast
radius and TIME-window even if `K` leaks. Document the "engine key K compromise"
as the explicit, bounded residual risk (bounded by aggregate_cap + expiry + revoke).

### A1-A4 (build-time, confirmed in design)
- A1: consumption store = SINGLE ATOMIC conditional-insert keyed on leaf_nonce
  (insert-if-absent), carrying `(root_id, amount)`; mark-then-act fail-closed; a
  crash between mark and token.pay STRANDS that allocation — ACCEPTABLE because the
  conserved allocator re-derives it next epoch (NOT a lost payment); name it
  (safety > liveness). The aggregate-ledger sum is read in the same atomic step.
- A2: the `capability_nonce_consumed` write is a canonical write-path (1567)
  securedAppend in the gate's handler-context (NOT a materializer → PC-788 N/A);
  declare it a CORE infra node kind (PC-329/326, not package-redeclarable); AWAIT to
  completion before `allowed:true` (no fire-and-forget).
- A3: mark the nonce ONLY on the all-pass allow path, after chain+arg verify; never
  on any fail branch; on cap-FAIL fall through to interactive WITHOUT leaking the
  failure reason to the caller (log it; surface generic "requires interactive approval").
- A4: shut the legacy door (1594) — repurpose `mintFlowOcap` into the delegation ROOT
  (`can_delegate:true` + delegated_key + aggregate_cap + expires_at) + add the
  per-action child minter; the OLD action-gate.ts:68-72 receipt-allow path stays
  unreachable for token.pay (it already is — checkActionGate isn't wired into
  enforceApprovalGate); the build asserts no second door to token.pay value movement.

## Build order (post critic-PASS)
1. core: generic capability-presentation acceptance in enforceApprovalGate
   (verify chain + arg-match + single-use nonce) + the consumed-nonce store.
2. flow: epoch-settle mints per-action delegated caps + presents on token.pay;
   the standing flow-ocap becomes the delegation root (adjust mintFlowOcap to set
   can_delegate + the per-action child minter).
3. green integ-flow-consent (single-daemon); cross-identity stays E1-gated.
