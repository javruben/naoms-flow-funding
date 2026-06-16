---
title: "Flow Funding — competitor reference (C9)"
type: package-design
audience: contributor
last-verified: 2026-06-17
verified-by: 1644
---

# Flow Funding — competitor reference

Competitor benchmark for the four user-facing 1644 surfaces (PC-439 / Contract
C9). The surfaces are walked from binding mock → in-app under `NAOMS_UI_MOCK` →
wired backend; this doc names the comparison set and the capability bar each
surface must match-or-beat.

## Named competitors (value-circulation / anti-hoarding domain)

1. **Open Collective** — transparent collective funds: money in / out, recurring
   contributions, public budget ledger. Closest analogue to the **velocity
   ("river")** + transparency surfaces.
2. **Grassroots Economics — Sarafu / Commitment Pools** — community asset
   vouchers, commitment issuance, mutual-credit, trade balance. Closest to the
   **flow-agreement** (commitment) and **commons-tithe / pool** affordances.
3. **Circles UBI** — personal currencies on a trust graph with a demurrage-like
   decay. Closest to the **policy** surface's trust-weight + decay + demurrage.

## Capability table (owned interaction → competitor handling → match-or-beat)

| Interaction (surface) | Open Collective | Sarafu/GE | Circles | Flow Funding does | Tier |
|---|---|---|---|---|---|
| See value flowing in/out this period (velocity) | Budget ledger, manual | Trade balance | Balance only | Live "river": in/out, net, 6-mo history, gradient-band hero | must ✓ |
| First-run empty state (velocity) | Generic empty | n/a | n/a | Hides state chrome; "set band + create first agreement" | must ✓ |
| Set a viability band (floor/ceiling) (policy) | n/a (no floor/ceiling) | n/a | n/a | Floor/ceiling band + felt-threshold inference | must ✓ |
| Pick anti-hoarding mechanism (policy) | n/a | Demurrage (fixed) | Demurrage (fixed) | Gradient curve + gradient/decay/demurrage toggles | should ✓ |
| Choose denomination (policy) | Per-collective currency | Per-voucher | Per-personal-currency | Currency/token-kind selector per policy | must ✓ |
| Create a flow agreement (agreement) | Recurring contribution | Commitment issue | Trust connection | Formality dial: relational ↔ codified, co-sign | must ✓ |
| Simulate before committing (simulation) | n/a | n/a | n/a | Run a FlowPolicy variant over a scenario, no chain writes | could ✓ |
| Transparency level per relationship (policy) | Public-only | Public-only | Public graph | Outcome / story-gated / full / private edges | should ✓ |

## Browser-driven verification record

Each must-have row is verified in-app (Verify-Before-Handoff) by driving Chrome
against the `NAOMS_UI_MOCK` daemon and confirming the surface renders natively in
the Flow Funding feature tab with no shell-CSS leak (puppeteer harness; owner
re-approved 2026-06-16/17). The wired surfaces re-run this verification against
real `flow.*` data at each surface's close (per-M-row mock-fidelity gate).

## Where Flow Funding beats the set

No competitor offers the **gradient** model (simultaneous give-and-receive
between floor and ceiling) as a *configurable* policy, a **pre-commit
simulation** of that policy over a scenario, or a **formality dial** that lets
one relationship be relational trust-weight and another a codified revenue share
on the same rail. Those are the must-beat differentiators the surfaces exist to
deliver.
