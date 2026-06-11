---
item: 1644-flow-funding
phase: 04-risk
lens: ethics (axiom-alignment — Wholeness / Honesty / Mystery)
authored: 2026-06-12
independence: re-verified primitives independently; logs each axiom application for audit (D-AXIOM-LOGGING)
---

# 1644 Flow Funding — Ethics (axiom-alignment lens)

The Three Axioms cannot be overridden by policy/procedure/UX/DX. Each application
is logged for audit.

## Wholeness — complete in itself; no external dep for core function

- **AX-W1 [aligned].** Flow funding routes the system's **own** token value;
  core function needs no external ledger or oracle. Re-verified: value rides
  `token.pay` (State B, internal). ✔
- **AX-W2 [tension → resolved].** Open-Q A5 (touch real external capital?) would
  introduce an external dependency. *Application:* keep external capital **OUT of
  MVP**; if pursued, it is a separate item with its own Wholeness review. Logged
  as the boundary that preserves Wholeness.
- **AX-W3 [tension → mitigated].** Demurrage→investment-flight (Simon's LIVE
  concern): a decay that pushes value into flow-escaping external assets would
  *undermine* the whole. *Application:* demurrage **simulation-only** until
  proven per-context (A3) — the axiom-driven reason to not ship it live first.

## Honesty — crypto + epistemic; no silent mutations/drops/clamps

- **AX-H1 [CRITICAL guard].** Settlement MUST NOT silently clamp a non-conserving
  epoch. *Application:* conservation invariant **refuses loud** (DE-09). A silent
  clamp here is the archetypal Honesty violation — value would vanish unlogged.
  This is the single most important axiom application in the design.
- **AX-H2 [aligned].** Story-attestation is typed **testimony, not verified fact**
  (Owner Pref #1/#12; design §7). It nudges trust terrain but never *asserts* a
  fact or *releases* value. Re-verified intent against open-Q E5. ✔
- **AX-H3 [aligned].** No silent re-price of a half-settled epoch (version pinned
  at epoch open; DE-01). A mid-epoch mutation would be a silent state change.
- **AX-H4 [aligned].** Accrual is heartbeat-attested-elapsed, **never a wall
  clock** — re-verified against the CIKU `ceiling.ts` OTR-2 posture. A wall-clock
  accrual would be an epistemically dishonest "settled" claim before attestation.

## Mystery — epistemic humility; forgetting is a feature

- **AX-M1 [aligned, with a disambiguation].** Three decays must NOT be conflated
  (open-Q C5): (a) **activity-decay of entitlement** is a *forgetting* of a stale
  claim — aligns with Mystery (a claim not exercised fades). (b) **demurrage** is
  decay of *balance value* — an economic mechanism, NOT epistemic forgetting. (c)
  **GC of stale commitments** is data-forgetting. *Application:* the design keeps
  these three as distinct engines/mechanisms (design §6.2 table); a test asserting
  one must not pass on another (D-FF-ENGINE-POSTURE).
- **AX-M2 [aligned].** The system does not claim to *know* need — it lets need be
  *expressed* (emergent allocation, §6.4) rather than a central router *deciding*
  who deserves. Humility about unpriceable value (Simon's story→trust) is built
  in: the network perceives a signal, it does not adjudicate worth.

## Axiom-violation findings (BLOCK exit)

- **No outright axiom violations** in the design as written.
- **One CRITICAL guard (AX-H1)** that, if implemented as a silent clamp instead of
  a loud refuse, **would become** a Honesty violation. Carried to RISK-MITIGATE as
  a non-negotiable DE-09 assertion (loud refuse + test for the refuse path).
- Two tensions (AX-W2 external-capital, AX-W3/demurrage-flight) **resolved** by
  scope decisions (out-of-MVP / simulation-first) that are themselves the
  axiom-driven rationale for forks A5 and A3.

## Log summary (for audit)
Wholeness applied 3× (1 aligned, 2 tension-resolved); Honesty applied 4× (1
critical-guard, 3 aligned); Mystery applied 2× (both aligned, 1 with a
three-way disambiguation). No override of any axiom by UX/DX convenience.
