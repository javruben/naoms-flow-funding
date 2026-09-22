---
id: 1886
title: "A hive treasury circulates value under collective multi-signer governance"
star: "What if a shared treasury could flow value the way a person does — held in common, moved by many hands?"
intent: "Post-1644 follow-on: hive/pool treasuries hold FlowPolicies and circulate surplus under an n-of-m FROST quorum (collective signing), with a treasury-management + multi-signer approval UI. Covers the two 1644-deferred surfaces: hive-treasury flow governance (1) and multi-signer treasuries (2)."
status: backlog
work_type: feature
type: roadmap
audience: builder
last-verified: 2026-09-19
created: 2026-06-16
phase: 01-backlog
verified-by: "roadmap triage sweep 2026-09-19"
---

# 1696 — A hive treasury circulates value under collective multi-signer governance

**Star:** What if a shared treasury could flow value the way a person does — held in common, moved by many hands?

## Problem

Post-1644 follow-on: hive/pool treasuries hold FlowPolicies and circulate surplus under an n-of-m FROST quorum (collective signing), with a treasury-management + multi-signer approval UI. Covers the two 1644-deferred surfaces: hive-treasury flow governance (1) and multi-signer treasuries (2).

## Milestones

_Defined during this item's DESIGN phase. Scope captured in
`01-backlog/scope-intake.md` (hive-treasury flow governance + multi-signer
treasuries). No milestone deliverables declared yet — this item is at
`01-backlog`._

<!-- STATE-SYNC:BEGIN 2026-09-19 -->
## Current State (verified 2026-09-19)

Checked against `origin/main` = **`aa185b1436a`**. Everything below this
block is the older record, left intact; where it disagrees, this is newer.

> Measured in worktree `rt-a8` at HEAD `aa185b1436a`, which is 98 commits behind
> `origin/main` (`git rev-list --count HEAD..origin/main` -> 98). Every path cited
> below was checked against `git diff --name-only HEAD origin/main`; none of them
> appears in that gap, so the reading holds for `origin/main` too.

**Verdict:** backlog (live) — nothing built. Legitimately early: an intent with a scope-intake and no code.

**Where the work lives:** NOT on main. `rg -n -i 'treasury' src/packages/flow-funding/ -l` -> zero rows. Positive control on the same instrument: `rg -n 'FlowPolicy|flow_policy' src/ -l` -> 5+ rows including `src/packages/flow-funding/materializers/flow-policy.ts`, so the search CAN see this package.

### What is actually built
- Only the 1644 substrate this item builds ON: `src/packages/flow-funding/materializers/flow-policy.ts`, `src/packages/flow-funding/handlers/policy-set.ts`, `src/packages/flow-funding/handlers/epoch-settle.ts`, `src/packages/flow-funding/domain/flow-ocap.ts`.
- No hive-treasury node, no n-of-m FROST quorum over a treasury, no multi-signer approval UI.

### What is left
- First concrete step: run the DESIGN phase. `01-backlog/scope-intake.md` carries the two deferred 1644 surfaces; no milestone deliverables are declared yet, so nothing can be picked up as build work until design names them.
- The reuse surface to design against is the existing FROST quorum machinery (`src/core/chain/signer/quorum.ts`) plus the 1644 FlowPolicy files cited above.
<!-- STATE-SYNC:END -->

<!-- STATE-SYNC:BEGIN 2026-09-19-p2 -->
## Second-pass review (2026-09-19)

Checked against `origin/main` = `cacd530207c`. This worktree's HEAD `59a961809d9` is
104 commits BEHIND that tip, so every path below was read out of `origin/main`
directly (`git show origin/main:<path>` / `git grep origin/main`), not out of the
worktree. No file cited below appears in `git diff --name-only HEAD origin/main`
for this item unless the paragraph says so.

**Remaining:** engineering
**Verdict:** backlog

DESIGN has not been run. The item has `01-backlog/scope-intake.md` and a
ROADMAP.md whose Problem section is the intent verbatim; no milestone
deliverables are declared, so there is nothing pickup-able as build work yet.
That makes it design ENGINEERING, not a human gate — no decision is pending on
anyone's desk. The reuse base is real on `origin/main`
(`src/core/chain/signer/quorum.ts` for FROST n-of-m, plus the 1644 FlowPolicy
files), so the design starts from existing quorum machinery.
<!-- STATE-SYNC:END -->
