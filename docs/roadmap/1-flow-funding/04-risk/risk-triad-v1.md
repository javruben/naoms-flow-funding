---
item: 1644-flow-funding
phase: 04-risk
artifact: risk-triad (cross-lens synthesis)
authored: 2026-06-12
inputs: [stride-v1.md, fmea-v1.md, ethics-v1.md]
---

# 1644 Flow Funding — Risk Triad (cross-lens synthesis)

Synthesizes the three INDEPENDENT lenses: convergences (multiple lenses
independently flag the same thing → high confidence) and contradictions (lenses
disagree → owner/architect must resolve).

## Convergences (independently flagged by ≥2 lenses → high confidence)

| Theme | STRIDE | FMEA | Ethics | Disposition |
| --- | --- | --- | --- | --- |
| **Unauthorized automated value movement** | E1 (Critical) | F2 (RPN 120) | AX-H1 adjacent | **#1 risk** — bounded ocap, compose-with token gate, DE-12/14 |
| **Silent non-conservation** | T1 (High) | F4 (RPN 135) | AX-H1 (CRITICAL guard) | Conservation **refuse-loud**, DE-09 — non-negotiable |
| **Runaway cascade / drain** | D1 (High) | F3 (RPN 128) | — | Per-claimant + per-epoch caps, DE-24 |
| **Sybil trust-edge farming** | S1 (High) | F7 (RPN 120) | — | Trust-edge-gated + cap, DE-23 |
| **Topology / privacy leak** | I1 (High) | F9 (RPN 140) | (Honesty-adjacent) | Outcome-transparency only; ZK post-MVP; DE-25 |
| **Demurrage live too early** | — | F6 (RPN 120) | AX-W3 (Wholeness tension) | Simulation-only first (fork A3); DE-16 |

Six themes, all converging on mitigations **already present** in design §6/§7/§8/
§10 + the test plan. No theme is un-mitigated.

## Contradictions / unresolved tensions (→ owner at ALIGN)

1. **Transparency vs privacy (I1/F9 vs the star's "everyone sees value
   created").** Tree's intake wants high transparency; STRIDE+FMEA want minimal
   topology disclosure. *Synthesis:* outcome-transparency + story-upstream
   reconciles them, but the exact disclosure scope (relationship-scoped vs
   ecosystem-wide, identities vs terms vs amounts) is **open-Q H1/H3 → owner
   fork**. Not engineer-resolvable.
2. **Demurrage value (anti-hoarding) vs investment-flight (Wholeness).** FMEA F6 +
   Ethics AX-W3 say "don't ship live"; the star wants idle value to decay.
   *Synthesis:* simulation-first (A3) is the agreed de-risk, but **whether/when
   demurrage ever goes live network-wide is an owner decision**, not MVP.
3. **Process risk F1 (substrate sequencing) outranks every product risk by RPN.**
   The lenses converge that the biggest near-term risk is not a design flaw but
   **building before 1596/1627 land** (fork A0). The owner must choose:
   gate-on-merge vs base-BUILD-on-1596-tip.

## New DE rows for RISK-MITIGATE (test-author absorbs)
- **DE-23** sybil-drain-bounded (S1/F7).
- **DE-24** runaway-flow-blast-radius-capped (D1/F3).
- **DE-25** flow-topology-privacy (I1/F9): assert non-disclosure of per-edge
  dependency detail under the chosen transparency level.

## Gate readiness
- All Critical/High/axiom-guard findings have named mitigations integrated into
  ONE coherent design (no addendum) — confirmed at RISK-MITIGATE.
- Residual owner-decisions (transparency scope, demurrage-go-live, A0 sequencing)
  are **forks for the ALIGN walk**, correctly NOT resolved unilaterally.
