# M4 plan-amendment — files_in_scope extension to the core gate-seam (2026-06-20)

**Amends** `05-align/frozen-plan.md` (SEALED @ a4409528fc) M4 `files_in_scope`.
**Authority:** economics (quartermaster) ruling 2026-06-20 — the seam IS M4's
defining T-12 contract (frozen-plan:27-28/149: "ocap as authorization … MUST NOT
bypass CORE_APPROVAL_REQUIRED … without interactive unlock"); the safeguard is the
dev-time-self-critic + critic queue, NOT an owner-decision. Not escalated.

## Why
The frozen-plan M4 `files_in_scope` lists ONLY flow-funding files
(`domain/flow-ocap.ts`, `handlers/epoch-settle.ts`, `tests/integ-flow-consent.test.ts`,
`tests/e2e-flow-consent-bounded.test.ts`). But the non-interactive non-bypass
composition (the M4 contract) is UNREACHABLE without a core-security consumer:
`src/core/security/approval-gate.ts enforceApprovalGate` is interactive-only and
threads no capability. The contract therefore REQUIRES touching core-security — a
detail the sealed plan did not anticipate.

## Amendment (additive — no contract change)
Extend M4 `files_in_scope` to include:
- `src/core/security/approval-gate.ts` — accept an owner-rooted, action-bound,
  single-use capability to satisfy the gate non-interactively (GENERIC primitive;
  no flow coupling). Design: `m4-gate-seam-security-design-2026-06-20.md`.
- `src/core/security/<capability-presentation helper + consumed-nonce store>` (new,
  generic) as the design's critic-review resolves.
- `src/core/ucan/capability-token.ts` — IF per-action delegation needs a minor
  helper (child-mint convenience); reuse first.

No change to the M4 CONTRACT (T-12/13/14), success_criterion, or non_goals. The
cross-identity 2-daemon arm stays E1/1596-gated.

## Gate
dev-time-self-critic on the security DESIGN (Phase-1) → on PASS, build → critic
queue (Phase-2) on the implementation. Citations: frozen-plan:27-28/149, design §8,
sealed a4409528fc + critic Phase-1 ec-20260612T214751-p1.
