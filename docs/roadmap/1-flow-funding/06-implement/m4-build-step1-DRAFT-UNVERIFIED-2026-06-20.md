# M4 build-step 1 — DRAFT, UNVERIFIED (do NOT trust/commit without verification)

**State 2026-06-20.** A build sub-agent drafted build-step 1 (core capability
primitive + gate path) FAITHFULLY-INTENDED to the critic-PASSED design
(`m4-gate-seam-security-design-2026-06-20.md`), BUT its API connection dropped and
**its report was LOST** — so I have NO confirmation of: spec-faithfulness, whether it
hit a spec gap, or any unit test. The changes TYPE-CHECK clean but are **UNTESTED +
UNREVIEWED**. This is the value-movement gate → do NOT commit/trust until verified.

## Uncommitted draft in the worktree (type-checks, NOT verified)
- `src/core/ucan/delegation-chain.ts` (NEW, ~18KB) — presumably `verifyDelegationChain`.
- `src/core/ucan/capability-token.ts` (MODIFIED) — presumably delegation_bounds /
  action_binding body sub-objects + deserialize validation.
- `src/core/security/approval-gate.ts` (MODIFIED) — presumably the
  enforceApprovalGate capability-presentation path.
- (The two `e2e-*-cli.test.ts` untracked files are PRE-EXISTING, not this agent's.)
- **NO unit test was found** for delegation-chain — the agent likely did not reach the
  test step before the connection dropped.

## REQUIRED before any trust (the verification the lost report would have shown)
1. REVIEW each changed file line-by-line against the PASSED design (B1-B4, N1, N2 +
   the 2 build-notes): owner-pubkey from on-graph identity NOT the token;
   caller==owner NEVER consulted; leaf rejected if it carries delegation_bounds;
   ceiling+delegated_key read from the OWNER-SIGNED ROOT only; arg-canonicalizer uses
   handlePay's `length>0` lossBearer guard (NOT `??`); deserialize structurally
   validates the new sub-objects fail-closed; nonce mark-then-act atomic + fail-closed;
   no fire-and-forget write; legacy receipt door not reused.
2. WRITE + RUN the unit tests (real Ed25519 FFI): chain-verify ALLOW + every REFUSE arm
   (forged sig, non-delegated key, parent_hash mismatch, leaf-carries-bounds, arg
   mismatch incl. tokenId-substitution, unbound-extra-arg, expired, nonce-replay,
   aggregate-cap-exceeded). RED-first.
3. dev-time-self-critic **Phase-2** on the IMPLEMENTATION (the design passed Phase-1;
   the code needs its own review — implementation bugs are a distinct risk class).
4. Only then commit. Then build-step 2 (flow delegation-root + per-action mint +
   epoch-settle) → green integ-flow-consent (build-host).

## Why not committed
Honor Rule + Verify-before-asserting: untested, report-lost security-gate code on the
value-movement surface is not trustworthy. The PASSED design spec is complete +
durable, so if the draft is discarded the build re-derives cleanly. Decide at
verification time: salvage-and-verify the draft, or re-build clean.
