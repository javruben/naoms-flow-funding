---
item: 1644-flow-funding
phase: 04-risk
lens: security-auditor (STRIDE)
authored: 2026-06-12
independence: this lens re-verified the State-A/B primitives it relies on (see §0); it does NOT trust the FMEA or ethics lenses
---

# 1644 Flow Funding — STRIDE (security-auditor lens)

## §0 Independent re-verification (D-INDEPENDENT-RE-VERIFICATION)

Re-verified, not inherited from design.md:
- `token.pay` action-tier + `CORE_APPROVAL_REQUIRED` — re-grepped
  `origin/1596-token-branches-2026-06-06:src/packages/token/manifest.ts` (ops
  table, HC-34 comment). ✔ State B confirmed.
- CIKU ceiling = heartbeat-attested-elapsed, no wall-clock — re-read
  `…/kinds/ciku/ceiling.ts` (OTR-2 posture: over-mint detected on reconnect). ✔
- `stewardship` hive + `linked_entity_did` — `hives/templates.ts:183`,
  `types.ts:32`. ✔ State A.

## STRIDE findings (severity ∈ {Low, Medium, High, Critical})

### S — Spoofing
- **S1 [High] Sybil trust-edge farming to attract flow.** An attacker mints many
  identities, farms trust-edges to a generous holon, and harvests surplus.
  *Mitigation (→ design §6.4 / §8):* allocation targets gated on **existing
  030–031 trust edges with caps**; per-claimant cap (D2) bounds any single
  claimant; trust is quantitative + asymmetric so farmed edges carry low weight.
  **Carried as test DE-10 + new DE-23 (sybil-drain-bounded).**
- **S2 [Medium] Holon-identity spoof on a flow-agreement.** Mitigated by the
  bilateral two-lane signed acceptance (each party signs its own lane) — an
  unsigned/forged acceptance is refused. Covered DE-03.

### T — Tampering
- **T1 [High] Allocation-math tampering / non-conservation.** A malicious or buggy
  settlement that emits Σ(out) ≠ surplus silently mis-routes value.
  *Mitigation:* **conservation invariant refuses LOUD** (design §10.3, DE-09); no
  silent clamp (Honesty axiom). **HIGH — must be integrated, not deferred.**
- **T2 [Medium] FlowPolicy version tamper / mid-epoch re-price.** A new policy
  version landing mid-settlement re-prices a half-settled epoch. *Mitigation:*
  settlement pins the active version at epoch open; later versions apply next
  epoch (DE-01, design §5).

### R — Repudiation
- **R1 [Low] Deny an agreement/flow occurred.** Signed `flow.*` chain events are
  non-repudiable by construction (the auditable-home rationale for the new `flow`
  chain, design §4). No additional mitigation needed.

### I — Information Disclosure
- **I1 [High] Flow topology reveals the dependency graph.** Who-depends-on-whom is
  socially sensitive (who is below floor = who is in need). A naïve
  "everyone-sees-everything" transparency (Tree's first framing) would leak this.
  *Mitigation (→ design §7/§9, open-Q H1/H2):* **outcome-transparency +
  story-upstream**, NOT per-transaction-in-the-clear; relationship-scoped
  visibility; the network perceives *need-or-value* without per-edge detail. ZK
  proof-of-need is a named post-MVP M-row (`M-1644-ZK-NEED`). **HIGH — privacy
  posture must be explicit in design before align.**

### D — Denial of Service
- **D1 [High] Cascade amplification / runaway flow.** A deep transitive cascade
  (arbitrary depth, D-CARDINALITY) could amplify into a settlement storm or drain
  a holon faster than intended. *Mitigation:* per-epoch settlement bounded by
  **active channel count** (not global graph); per-claimant + per-epoch outflow
  **caps**; settlement is lazy/event-triggered, not per-second. **New DE-24
  (runaway-flow-blast-radius-capped).**
- **D2 [Medium] Convergence non-termination at scale with cycles.** TBFF's
  20-iteration demo bound is insufficient. *Mitigation:* explicit
  **termination + convergence guarantee** with a loud refuse on non-convergence
  (open-Q B4 → DE-09 extension). Carried to RISK-MITIGATE.
- **D3 [Low] `flow.policy_set` event flooding.** Bounded by the holon's own lane
  write-rate + existing chain admission; low.

### E — Elevation of Privilege
- **E1 [Critical] Flow-ocap over-scope → unauthorized automated `token.pay`.** The
  single highest risk: a capability that out-scopes its declared cap, or a flow
  that bypasses `CORE_APPROVAL_REQUIRED`, drains value without consent.
  *Mitigation (→ design §8):* the scoped ocap is **provably bounded** (above-
  ceiling, named channels, explicit caps, named context); each settlement rides
  `token.pay` **carrying** the capability, bounded by the cap; the token ledger's
  per-transfer gate is **composed-with, never bypassed**; revocation is immediate
  via policy-version disarm; a flow in `vault-locked` with no valid pre-ocap
  **refuses loud** (DE-14). **CRITICAL — primary BUILD security focus; DE-12 +
  DE-14, two-daemon e2e.**

## Critical/High summary (BLOCK exit until integrated at RISK-MITIGATE)
- **Critical:** E1 (ocap over-scope).
- **High:** S1 (sybil-drain), T1 (non-conservation), I1 (topology disclosure),
  D1 (runaway cascade).
All five have named mitigations already reflected in design §6/§7/§8/§10 + the
test plan; RISK-MITIGATE confirms integration (no addendum) and adds DE-23/24.
