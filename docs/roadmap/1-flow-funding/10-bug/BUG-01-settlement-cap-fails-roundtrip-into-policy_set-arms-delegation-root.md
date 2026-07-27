# BUG-01 — settlement cap fails to round-trip into `policy_set` params (arms the delegation root)

- **Item:** 1644-flow-funding
- **task_type:** bug (PROC-BUG)
- **Severity:** 🔴 CRITICAL (security-relevant — spending-authority bound that never arms)
- **Status:** OPEN — held off main; needs a `policy_set`-knowledgeable owner
- **Filed by:** drainer, 2026-07-27T18:15Z (own `date -u`), at DD's direction (1644 HOLD affirmed 18:14Z)
- **Found by:** 1816 c3 (`99de78b3`), four-cell test comparison, 2026-07-27T18:12Z

## What / where

The `1644-flow-completion` branch (net-positive: fixes 3 tests incl. its STAR
narrative flow + 2 agreement round-trips, its 3 new tests pass 7/0) also
**introduces 2 regressions** — both `policy_set` cap round-trip assertions,
present on the branch and absent on clean main:

- **CRITICAL — automated-settlement cap:** the absolute cap fails to round-trip
  into `policy_set` params. c3: *"a cap that fails to round-trip is a
  spending-authority bound that does not take effect."* It "arms the delegation
  root."
- **C5/G10 — policy fairness caps:** `perClaimantCap` / `perEpochCap` fail to
  round-trip into `policy_set` params (B-3).

Coherent failure story (not a flake): 1644 touches
`src/packages/token/domain/push.ts` and `tools-subscribe-accept-provisional.ts`,
and both broken tests concern whether cap values survive into `policy_set`.

## Evidence (c3's four cells, baseline b65592971c2)

```
11 test files 1644 MODIFIES (both sides):
   clean main   13 passed | 11 failed
   with 1644    16 passed | 12 failed     delta +3 passed, +1 failed
3 test files 1644 ADDS (merged side only):
   with 1644     7 passed |  0 failed
```

The `+1 failed` count hid that 3 tests were fixed and 2 specific ones broke —
verdict is from a **name-level** diff, not the count.

## Why held

Under the land-properly floor (no regressions, esp. security), a critical
spending-authority regression cannot land even though the branch is otherwise
net-positive. HOLD affirmed by DD 18:14Z.

## Resolution condition (to land 1644)

A `policy_set`-knowledgeable desk / the 1644 owner must determine whether the 2
cap regressions are **real** or **test-order artifacts** on the already-red
surface (that dir is 11-failing on clean main), then:
- real → fix so the caps round-trip; both tests green.
- artifact → prove test-order/ordering on the red surface, green under isolation.
- **widen the baseline** beyond the 14 touched files once the Rust-FFI
  `RefCell already borrowed` venue defect on
  `src/packages/flow-funding/tests/ + token/tests/` is stable (c3 18:12Z: a
  full-dir run panics 3/4; narrow-to-touched-files avoids it, 6-7s runs).

Then re-submit through the gate; the drainer lands on green.

## Not at risk meanwhile

`1644-flow-completion` is already captured on `main` (rewrite-preserve batch-1 +
Desk6's routed patch/bundle) — this is the land-as-functional upgrade, blocked
on the 2 named cap regressions. A fixable state, not a rejection.
