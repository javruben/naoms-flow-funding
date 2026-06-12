---
item: 1644-flow-funding
phase: 05-align
title: "Alignment decisions — owner walk 2026-06-12"
authored: 2026-06-12
gate: FIRST HUMAN GATE (PROC-NEW-FEATURE-ALIGN-WITH-USER)
---

# 1644 Flow Funding — Alignment Decisions (owner walk, 2026-06-12)

Owner answers at the ALIGN gate, with the substrate corrections they triggered.
These bind the REDUNDANCY-CHECK → frozen-plan seam.

## Substrate correction (owner-triggered; re-verified on current origin/main)

The DESIGN substrate matrix was authored against a **stale worktree base (5885
commits behind origin/main)** — the STALE-LOCAL-MAIN-TREE trap. After
`git rebase origin/main`, re-verified:

- **`token` package + `1627` wallet are on `origin/main`** → **State A**, not
  State B. `src/packages/token/manifest.ts`, `kinds/iou/`, `ui/wallet.css`
  present on origin/main (verified 2026-06-12). **Fork A0 DISSOLVES** — no
  BUILD-blocking substrate dependency.
- **`1645-token-demurrage`** is built on its own branch (07-verification
  `build-complete-readiness-2026-06-11.md`), NOT on origin/main yet → demurrage
  is **State B (reuse 1645)**, not a 1644-built engine.
- **Auto-sharer EXISTS**: `src/packages/sharing/` (package 656) — `engine/
  auto-share.ts` (`triggerAutoShare`/`triggerHiveAutoShare`), `engine/sharing-
  engine.ts:evaluateReshare` (reshare/N-hop), `sharers/sharer-friends.ts`
  (direct-relationship sharer), **Biscuit already wired** (`agent-access.ts`,
  `sharers/`, `docs/contracts.md`) → **State A (reuse)**.

## The four dialog forks

- **A0 — sequencing:** *"They are already on main."* → **DISSOLVED.** Token +
  wallet are State A; no gate-on-merge needed. BUILD bases on origin/main.
- **A3 — demurrage:** *→ `1645-token-demurrage/07-verification/build-complete-
  readiness-2026-06-11.md`.* → **REUSE 1645's demurrage** (Rule 8). Flow funding
  does NOT implement its own demurrage engine; it consumes 1645. The earlier
  "demurrage simulation-only" 1644 lean is **superseded** — demurrage posture is
  1645's; 1644 may still expose it in the simulation surface as a *consumer*.
- **H1/H2/H3 — transparency:** *"Local-first, no centralization, each node owns
  its info. Create an auto-sharer to share with direct relationships and a
  Biscuit contract for sharing N-hops."* → **REUSE the `sharing` package (656):**
  register a flow-funding sharing domain that auto-shares flow outcome/velocity
  with **direct relationships** (`sharer-friends`), and uses a **Biscuit-
  attenuated capability** for **N-hop** sharing (the reshare path). No new
  auto-sharer; no central transparency service. ZK proof-of-need stays a named
  post-MVP item.
- **A5 — capital:** **Own-ledger MVP, external later.** MVP coordinates over the
  internal token ledger; a real-external-capital bridge is a planned follow-on
  item (Wholeness axiom; lower compliance exposure in MVP).

## Strong-lean forks (facilitator-defaulted; owner did not override)

- **A1** one flow-agreement on a formality dial — PROCEED.
- **A2-pkg** one `flow-funding` package, modalities as engines — PROCEED.
- **A4** new `flow` chain for policy/agreement/story; reuse `token.pay` for value
  — PROCEED.
- **D2** fairness = need-weighted + per-claimant cap — PROCEED.
- **E4** story nudges trust-terrain, never releases value; numeric fold = named
  post-MVP M-row — PROCEED.

## Check-8 disposition (gate non-pass → resolved)

Owner: *"the critic queue is running and is legacy. does not use the daemon.
use it."* → The Phase-1 plan-review is submitted to the **legacy file-based
`scripts/critic-queue.sh plan-review`** (daemon-independent; available under
MCP-down). Check-8 is therefore **satisfiable** — verdict pending the elected
critic. See `critic-queue-submission.md`.

## Net design deltas to integrate (REDUNDANCY-CHECK)

1. Substrate matrix: token/wallet A; demurrage = reuse 1645 (B); sharing 656 +
   Biscuit = A (reuse). Drop the net-new demurrage engine + the bespoke
   transparency mechanism from 1644 scope.
2. Implementation plan: remove "M5 demurrage engine (build)"; add "reuse 1645
   demurrage" + "M-TRANSPARENCY: register sharing-domain + Biscuit N-hop". A0/M0
   gate removed.
3. DEPENDENCIES: token/wallet/1645/sharing-656/biscuit all named; 1645 +
   external-capital are the cross-item links.
4. Test plan: DE-16 demurrage → assert 1645 consumption (not a 1644 engine);
   add DE-26 auto-share-direct + DE-27 biscuit-N-hop-attenuation.
