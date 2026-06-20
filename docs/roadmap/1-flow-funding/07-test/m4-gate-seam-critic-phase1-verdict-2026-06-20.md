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

## Next
Revise the design to close B1-B4 (each a named subsection w/ the concrete check) →
re-route to critic → on PASS, build (core verifyDelegationChain + arg-bind + nonce
store; flow root+per-action mint) → green integ-flow-consent. Cross-identity E1-gated.
