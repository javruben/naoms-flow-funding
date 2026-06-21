# M-row: cross-device-aware settle (confirm-on-push) — CELEBRATE-BLOCKING

**Filed 2026-06-21. Status: OPEN. Marked celebrate-blocking (economics QM, owner-class UX bar).**

## What

`flow.epoch_settle`'s per-allocation gated `token.pay` re-dispatch uses a **15s
`Promise.race` deadline** (epoch-settle.ts:217-228) sized for the single-daemon
online co-sign WAIVER. For a **cross-device** claimant the gated pay rides the
real FROST 2-of-2 quorum ceremony (coordinateQuorumSign) + member push, which
**legitimately exceeds 15s**. So the settle HONESTLY buckets the leg
`indeterminate` ("MAY have committed; reconcile") while the ceremony completes +
credits the claimant in the background.

That is correct + honest for a single settlement (the 2-daemon proof asserts the
real credit on the claimant daemon). **But a holon settling to cross-device
claimants would report `indeterminate` for EVERY claimant, forever** — the
holon never sees a `paid` confirmation even though the credit lands. Same class
as "render fns built but nothing projects to them": the mechanism works but the
operator-visible outcome never resolves.

## Why celebrate-blocking

Flow-funding is not celebrate-ready while its primary cross-identity settlement
path can never report `paid`. The operator (holon) MUST be able to see that an
automated cross-device settlement succeeded. `indeterminate`-forever is a
permanent degraded state, not acceptable polish-later.

## The faithful fix (own gated M-row — NOT built into the proof arm)

A **cross-device-aware settle** that flips `indeterminate → paid` when the credit
replicates. Two candidate shapes (design call at build time):
1. **Confirm-on-push reconciliation**: epoch-settle records the dispatched leg as
   pending; a hook on the token-balance materialize / member-push receipt flips
   the FlowPolicy's settlement record `indeterminate → paid` (+ emits a
   `flow.settlement_confirmed` operator event) when the claimant credit lands.
2. **Topology-aware deadline**: detect the cross-device quorum-t2 path and await
   the ceremony with a longer, bounded deadline (sized to the ceremony budget),
   bucketing `paid` on completion; fall back to `indeterminate` only on a true
   timeout.

Shape (1) is preferred (non-blocking settle, honest pending→confirmed) but is the
larger change. Decide at build time. The `indeterminate` honesty bucket from #53
stays the truthful interim state until confirmation.

## Acceptance

The 2-daemon e2e-CLI shows the holon's settlement record transition to `paid`
(or `flow.settlement_confirmed`) after the claimant credit replicates — not a
permanent `indeterminate`.

## Composes with

- The 2-daemon payee-credit proof (this milestone) — that proof asserts the real
  credit + accepts honest `indeterminate`; this M-row makes the operator-visible
  outcome resolve.
- 1596 E1 gate-4 (the member-push + credit replication this hooks onto).
