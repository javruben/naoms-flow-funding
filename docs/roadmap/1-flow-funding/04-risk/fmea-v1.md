---
item: 1644-flow-funding
phase: 04-risk
lens: risk-assessor (FMEA + blast-radius + pre-mortem + legal/compliance)
authored: 2026-06-12
independence: re-verified State-A/B primitives independently of the STRIDE + ethics lenses
scoring: RPN = severity(1-10) × likelihood(1-10) × detectability(1-10, higher=harder-to-detect); HIGH = RPN ≥ 60
---

# 1644 Flow Funding — FMEA (risk-assessor lens)

## §0 Independent re-verification
Re-grepped independently: `token` chainType declared (1596 manifest:438);
`iou` kind present (`…/kinds/iou/`); `stewardship` hive (`templates.ts:183`).
The token package's **absence from this worktree** (State B) is itself the
top-RPN process risk — see F1.

## Failure-mode table

| ID | Failure mode | Sev | Lik | Det | RPN | Mitigation (→ design/plan) |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | BUILD starts before 1596/1627 land → flow funding compiles against absent substrate, churns | 7 | 7 | 3 | **147** | Fork A0 + M0 gate; DESIGN/mocks/test-plan only until merge |
| F2 | ocap over-scope drains value w/o consent (mirrors STRIDE E1) | 10 | 3 | 4 | **120** | Bounded scoped ocap, composes-with token gate, DE-12/14 |
| F3 | Runaway cascade drains a holon faster than intended | 8 | 4 | 4 | **128** | Per-claimant + per-epoch caps; DE-24 |
| F4 | Non-conservation settlement mis-routes value silently | 9 | 3 | 5 | **135** | Conservation refuse-loud; DE-09 |
| F5 | Convergence non-termination at scale w/ cycles | 6 | 4 | 4 | **96** | Termination+convergence guarantee, loud refuse; DE-09 ext |
| F6 | Demurrage shipped LIVE prematurely → investment-flight, users exit | 8 | 3 | 5 | **120** | Demurrage simulation-only first (A3); DE-16 |
| F7 | Sybil trust-edge farming harvests surplus | 6 | 4 | 5 | **120** | Trust-edge-gated + per-claimant cap; DE-23 |
| F8 | Mid-epoch policy re-price corrupts a half-settled epoch | 6 | 3 | 4 | 72 | Version pinned at epoch open; DE-01 |
| F9 | Flow topology leak (dependency graph disclosure) | 7 | 4 | 5 | **140** | Outcome-transparency only; ZK post-MVP; DE-25 (privacy) |
| F10 | Story-attestation treated as fact, mis-directs value | 6 | 3 | 4 | 72 | Typed testimony, trust-nudge-only, never releases value (§7) |
| F11 | Mock-fidelity false-green (UI looks done, real backend differs) | 6 | 5 | 4 | **120** | Per-M-row mock-fidelity on real daemon; real write path |

## Blast-radius

- **F2/F3/F4 (value movement):** blast radius = a holon's surplus + its direct
  channels' caps per epoch. Bounded by design (caps + conservation); cannot
  cascade unbounded because each hop is itself a capped, signed, conserved
  settlement. NOT system-wide.
- **F1 (process):** blast radius = wasted BUILD effort across concurrent sessions
  — exactly the failure the Zero Rule + A0 gate prevent.
- **F9 (privacy):** blast radius = social, hard to reverse once disclosed → treat
  as high even at moderate likelihood.

## Pre-mortem (it's 6 months later and 1644 failed — why?)

1. We built against the 1596 branch, it changed under us, and the merge never
   happened cleanly. → A0 gate + base-on-tip decision at ALIGN.
2. Demurrage went live, people moved money out to escape decay, circulation
   *fell*. → simulation-first; owner ratifies live-demurrage separately later.
3. The convergence math silently clamped a non-conserving epoch and nobody
   noticed value leaking. → conservation refuse-loud is non-negotiable (DE-09).
4. The UI looked finished in mocks but the real flow never settled in the wallet.
   → per-M-row mock-fidelity on real daemon (F11).

## Legal / compliance (informational — owner's to weigh)

- Automated money movement between people may implicate money-transmission /
  e-money regimes in some jurisdictions. NAOMS posture: flow funding coordinates
  over its **own internal ledger** (Wholeness; open-Q A5 keeps real external
  capital OUT of MVP), which materially reduces but does not eliminate exposure.
  **Flagged for owner; not an engineering blocker.** Not a HIGH engineering risk.

## HIGH (RPN ≥ 60) summary — BLOCK until integrated
F1(147), F9(140), F4(135), F3(128), F2(120), F6(120), F7(120), F11(120), F5(96),
F8(72), F10(72). All carry named mitigations already in design/plan; RISK-MITIGATE
adds DE-23/24/25 and confirms no-addendum integration.
