# M4 gate-seam — dev-time-self-critic Phase-1 verdict (2026-06-20)

Design reviewed: `06-implement/m4-gate-seam-security-design-2026-06-20.md`.
**VERDICT: CONCERNS** — core model sound (owner-rooted delegation + per-action
arg-bound single-use leaf + fail-closed; genuinely distinct from the 1611 loopback;
caller==owner never re-opened). 4 BLOCKING design gaps to close BEFORE coding; then
clears to PASS. (Validates the Phase-1 gate — these are real value-movement holes.)

## BLOCKING (resolve in the design doc, not deferred to code)
- **B1 — Bind ALL economically-material args (the contract / risk #4).** Leaf binds
  only {amount, recipient}; `token.pay` (handleTokenPay) carries more material fields
  (tokenKind/currency, loss_bearer, memo, invoice, source-vault, fee). A 150-of-kindA
  leaf could authorize 150-of-kindB. FIX: enumerate against handleTokenPay's ACTUAL
  arg schema; core checks the op carries NO economically-material arg unbound by the
  leaf (ALLOWLIST of bound fields, fail-closed on unrecognized extra). Bind tokenKind.
- **B2 — Real chain-verification primitive (doesn't exist).** `verifyToken(token,
  pubkey)` checks ONE sig; no parent_hash walk, no subset re-check, no owner-root
  pinning. FIX: specify `verifyDelegationChain` — per link: verifyToken(link,
  link-issuer-pubkey) + child.parent_hash==parent.content_hash + child.scope ⊆ parent
  (re-run isScopeSubset at VERIFY) + !isExpired per link + ROOT issuer fingerprint ==
  ownerDid key from the on-graph owner identity (same source `_resolveOwnerSigner`
  uses; NEVER a key carried in the token). Also: the gate must VERIFY approval_receipt
  (vs verify_approval_receipt) OR the design states auth rests entirely on the sig
  chain (don't inherit action-gate.ts:69 "any non-null receipt passes").
- **B3 — Owner-signed AGGREGATE + TIME ceiling on the standing root, core-checked.**
  One policy-arm approval currently authorizes unbounded-aggregate/unbounded-time
  pays; per-epoch/version caps are flow-side-at-mint, core never sees them → security
  reduces to "trust the flow engine" (no defense-in-depth). FIX: standing root carries
  an owner-signed total-value-over-lifetime cap + short `expires_at` (renewal = fresh
  owner approval) that CORE enforces independently; OR write the "honest flow engine"
  trust boundary as an explicit residual risk. "policy-version revoke is enough" is NOT
  enough alone (core never sees policy-version).
- **B4 — Root-replay → rogue off-engine leaves.** A stolen/exfiltrated standing root
  (can_delegate) + any signing key mints valid leaves (each link signs with its OWN
  key; only root is owner-pinned). Leaf-nonce only stops LEAF replay, not rogue-leaf
  minting. FIX: (a) root reachable only in-process to the flow engine (not a
  transportable artifact); AND/OR (b) leaf issuer_key_id MUST be an owner-authorized
  delegate key registered ON-GRAPH (random key can't sign valid leaves); AND (c) the
  B3 aggregate ceiling bounds blast radius if a delegate key leaks.

## ADVISORY (build-time care)
- A1 — consumed-nonce: SINGLE ATOMIC conditional-insert (insert-if-absent), not
  query→put (TOCTOU). mark-then-act is fail-closed for SAFETY; a crash between mark
  and token.pay STRANDS that allocation → confirm with flow it's re-derivable next
  epoch (conserved allocator recomputes), not a lost payment. Name it (safety>liveness).
- A2 — write-in-gate: gate is handler-ctx (not materializer) so guarded async
  securedAppend is OK (PC-788 is about materialize-phase enrichers), BUT: go through
  canonical write-path (1567), declare `capability_nonce_consumed` core node kind
  (PC-329/326, not package-redeclarable), AWAIT to completion before allow (no
  fire-and-forget), and confirm no gate-reentry under the token.pay write lock.
- A3 — FAIL path: mark nonce ONLY on the all-pass allow path, AFTER chain+arg verify;
  never on any fail branch. Don't leak failure reason to the caller (log it; surface
  generic "requires interactive approval").
- A4 — close the legacy door (1594 no-legacy-path): the on-disk flow-ocap +
  action-gate.ts:68-72 receipt-allow path is the "naive seam" + is currently DEAD
  (checkActionGate is NOT wired into enforceApprovalGate's live dispatch). Build must
  repurpose mintFlowOcap into the delegation ROOT (can_delegate:true) + add the
  per-action child minter, and PROVABLY CLOSE the old receipt-allow door for token.pay
  (no two doors to the same value movement).

## Round 2 (revised design) — CONCERNS → B1,B3,B4,A1-A4 CLOSED; B2 partial + N1/N2
B1 (arg enumeration complete vs handlePay; tokenId closes currency-sub), B3 (core
ledger removes flow-trust reduction), B4 (delegated_key closes rogue leaves), A1-A4
CLOSED. New: N1 (blocking — aggregate_cap/delegated_key outside TokenScope, ignored
by isScopeSubset → leaf could widen), N2 (canonicalize args per handlePay). Probes
cleared (ledger-DoS bounded, TOCTOU closed by A1, owner-key-rotation = correct
fail-closed, expiry checked at gate).

## Round 3 (N1+N2 closed) — VERDICT: PASS — SOUND TO BUILD
N1 CLOSED: bounds in SIGNED body sub-objects (delegation_bounds/root,
action_binding/leaf) — computeContentHash covers the whole body so the signature
protects them; verifyDelegationChain checks them EXPLICITLY (leaf carries NO
delegation_bounds → reject; leaf.issuer_key_id===root.delegated_key; ceiling read
from the OWNER-SIGNED ROOT, never a leaf value; isScopeSubset confined to op-class).
N2 CLOSED: canonicalization matched field-by-field vs handlePay. Caller==owner never
consulted; distinct from the 1611 loopback. 6 holes (B1-B4,N1,N2) caught + closed
BEFORE any code — the Phase-1 gate did its job on the value-movement surface.

## Build-notes (carry into implementation; fail-closed)
- lossBearer canonicalizer MUST use handlePay's `length>0` empty-string guard, not a
  literal `??` (`""` falls through to loss_bearer/payee).
- verifyDelegationChain MUST structurally validate the new delegation_bounds (root) /
  action_binding (leaf) sub-objects on deserialize, fail-closed.

## Build order (PASS — cleared)
core: extend CapabilityToken/TokenScope (delegation_bounds + action_binding);
verifyDelegationChain; enforceApprovalGate capability path; per-root consumption
ledger (`capability_nonce_consumed` core node kind); arg canonicalizer.
flow: mintFlowOcap → delegation ROOT (delegated_key + aggregate_cap + expires_at) +
per-action child minter; epoch-settle presents leaves on token.pay. → green
integ-flow-consent (build-host) → Phase-2 critic on the implementation.
Cross-identity 2-daemon arm stays E1/1596-gated.
