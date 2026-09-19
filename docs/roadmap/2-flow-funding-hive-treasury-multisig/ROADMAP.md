---
id: 1886
title: "A hive treasury circulates value under collective multi-signer governance"
star: "What if a shared treasury could flow value the way a person does — held in common, moved by many hands?"
intent: "Post-1644 follow-on: hive/pool treasuries hold FlowPolicies and circulate surplus under an n-of-m FROST quorum (collective signing), with a treasury-management + multi-signer approval UI. Covers the two 1644-deferred surfaces: hive-treasury flow governance (1) and multi-signer treasuries (2)."
status: backlog
work_type: feature
type: roadmap
audience: builder
last-verified: 2026-06-16
created: 2026-06-16
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
