# BUG-02 — flow-funding control surface is **0/5 green on main**, and 3 of the 5 are tracked by nothing

- **Item:** 1644-flow-funding
- **task_type:** bug (PROC-BUG)
- **Severity:** 🔴 HIGH — a payments/policy control surface where **no** control is proven to reach
  `policy_set`. One of the five (the absolute settlement cap, BUG-01) is CRITICAL and
  security-relevant; this row exists because the other three had **no bug row, no owner, and no
  visibility at all**.
- **Status:** OPEN
- **Filed by:** 1650 (`c16/7e4f40fa`), 2026-07-27T20:01:23Z (own `date -u`), at DD's direction
  (20:00Z ruling §Please-also-file).
- **Measured on:** `origin/main` `2429c66490c`
- **xref:** `BUG-01-settlement-cap-fails-roundtrip-into-policy_set-arms-delegation-root.md`
  (covers cases 4–5 below; **its attribution is being corrected separately** — the
  `1644-flow-completion` branch *reveals* the cap defect, it does not introduce it, because a test
  absent from main cannot be a regression).

## What

`src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts` on **clean main** is:

```
0 passed | 5 failed
```

Every case asserts the same contract in a different control: **a value set in the flow-funding
control UI must round-trip into `policy_set` params.** None of them does.

| # | case | on main | tracked by |
| --- | --- | --- | --- |
| 1 | `C5/G6` felt-threshold toggle → persists to `policy_set` (not a status stub) | 🔴 RED | **NOTHING** |
| 2 | `C5/G7` commons-tithe slider → round-trips into `policy_set` | 🔴 RED | **NOTHING** |
| 3 | `C5/G8` policy transparency radios → round-trips into `policy_set` | 🔴 RED | **NOTHING** |
| 4 | `C5/G10` fairness caps `perClaimantCap`/`perEpochCap` (B-3) | 🔴 RED (branch-only case) | BUG-01 |
| 5 | `CRITICAL` automated-settlement absolute cap (arms the delegation root) | 🔴 RED (branch-only case) | BUG-01 |

**Rows 1–3 exist on main today and fail on main today.** `.naoms/roadmap/1644-flow-funding/10-bug/`
contained exactly one file (BUG-01) before this one, and BUG-01 covers only rows 4–5. So three
currently-failing controls on a payments surface were invisible to the roadmap.

## Reproduce (control-paired — do not run one side alone)

```
git checkout origin/main
deno test --allow-all src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts
  -> 0 passed | 5 failed
```

🔴 **Run the main control BEFORE attributing any of these to a branch.** This bug row exists partly
because a branch-only run of `1644-flow-completion` shows `5 of 7 failed` and reads as "the branch
broke three tests" — it did not; all three were already red. The same trap produced BUG-01's
original attribution.

## Hypothesis — ONE root cause, not four

🟠 **GUESS (explicitly unproven, stated so nobody promotes it):** all five are the same family — the
control value never reaches `policy_set` — so this is likely **one** defect in the save/dispatch
path rather than four independent control bugs. Two pieces of support, neither conclusive:

- All five assertions fail at the same point in shape: the value is set in the UI and is not present
  in the dispatched `policy_set` params.
- 1816 c3 (`99de78b3`, 2026-07-27T19:58Z) measured on the `1644-flow-completion` branch that the two
  cap cases fail **for a non-cap reason** — the branch's own new `tokenId` guard makes `savePolicy`
  refuse to dispatch, so the round-trip is never exercised at all. **If a dispatch-level block
  explains the cap cases, a dispatch-level cause for G6/G7/G8 is the first thing to check.**

⇒ **Whoever picks this up: start at `savePolicy` / the dispatch path, not at the five controls.**
Fixing one control at a time is the expensive read of this evidence.

## What this row does NOT claim

- 🟡 It does **not** claim a root cause — see the hypothesis label above.
- 🟡 It does **not** cover the `e2e`/`integ` tier. Only the `uc` tier was run (17 files,
  control-paired); the 18 `e2e`/`integ` flow-funding files were **not** run and their status on main
  is **unknown**. This row is about a measured `uc` result, not about the whole subsystem.
- 🟡 It does **not** block `1644-flow-completion`. That branch is measured **strict improvement**
  on this tier: 0 green→red, +3 passing, and it turns rows for `C5/G9`-grid and `C5/G9`-duration
  from RED to GREEN. **Merging it makes this surface better, not worse.**

— 1650 (`c16/7e4f40fa`)
