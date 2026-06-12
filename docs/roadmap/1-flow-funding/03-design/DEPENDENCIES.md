---
item: 1644-flow-funding
phase: 03-design
title: "Dependencies — flow funding"
authored: 2026-06-12
---

# 1644 Flow Funding — Dependencies

Cross-item and cross-package dependencies, with substrate state (see
`design.md` §2). **Bold = hard BUILD-blocking (fork A0).**

## Hard dependencies — NONE BUILD-BLOCKING (A0 dissolved at ALIGN)

> Corrected 2026-06-12: the first cut tagged token/wallet State B from a stale
> worktree (5885 behind). Re-verified on origin/main — both are **State A**. No
> substrate gate; 1644 BUILD bases on origin/main.

- **`token` package (State A — `origin/main:src/packages/token/`).** Flow funding
  routes value via `token.pay` (action-tier, `CORE_APPROVAL_REQUIRED`) and reuses
  the `iou` kind + the CIKU heartbeat-attested-elapsed accrual pattern. Present.
- **Wallet UI (State A — `origin/main:src/packages/token/ui/wallet-*.js`,
  `wallet.css`).** The four ◆ surfaces EXTEND it. Present.

## Soft / reuse dependencies (present; reused — Rule 8)

- **1645 demurrage (State B — `1645-token-demurrage` branch, build-complete).**
  Flow funding **consumes** 1645's demurrage in the M5 simulation preview; it does
  NOT build its own demurrage engine. Soft-dep: absent 1645, gradient +
  activity-decay still satisfy the star.
- **`sharing` package 656 (State A — `origin/main:src/packages/sharing/`).** The
  owner's "auto-sharer": flow funding registers a sharing domain that auto-shares
  flow outcome to direct relationships (`sharer-friends`/`triggerAutoShare`) and
  uses `evaluateReshare` for N-hop. NO new auto-sharer.
- **Biscuit capability tokens (State A — wired in `sharing/agent-access.ts`,
  `sharers/`, consent 040 / ocap 042).** Attenuable caveats bound N-hop reshare
  hop-count + scope. The "Biscuit contract for sharing N-hops".

- **`hives` package (State A).** Holon = hive; `stewardship` hive
  (`templates.ts:183`) + `linked_entity_did` (`types.ts:32`) = land/river/forest;
  pool = hive + treasury. No fork or new identity type (Rule 8).
- **`trust` graph (State A, items 030–031).** Trust-edges are flow channels +
  caps; allocation is trust-weighted; trust-edge presence gates allocation
  targets. Story-attestation nudges trust-edge pull-weight (§7).
- **consent / VC / ocap (040–042).** The scoped, revocable flow-capability (§8)
  reuses these primitives; no new authorization mechanism.

## Process dependency (non-blocking; fallback defined)

- **1668 mock discipline (State B — at 05-align, NOT landed).** If 1668 lands
  before 1644 BUILD: adopt `NAOMS_UI_MOCK` + Critic Cat-14 + `@mock-fidelity` +
  `D-PER-M-ROW-MOCK-FIDELITY` directly. Else: fall back to the per-item precedents
  1668 promotes (1650/1630/1607) + the present `NAOMS_E2E_MOCK_BLOBS`/PC-414
  pattern (State A). Decided at BUILD by 1668 land-status (open-Q L1). Mock-first
  stands either way.

## Downstream / follow-on (informational)

- **External-capital bridge (A5):** own-ledger MVP; a separate planned follow-on
  item if the owner pursues real-external-capital flow.
- **1645 demurrage:** consumed by 1644's simulation preview (above); once 1645
  lands on origin/main the soft-dep hardens to a normal reuse.

## Dependency direction (no cycles)

```
hives(A) ───┐
trust(A) ───┤
ocap(A) ────┼─> flow-funding(C) ──reads──>  token(A, origin/main)
sharing656(A)┤                  ├──extends─> wallet(A, origin/main)
biscuit(A) ─┘                  ├──auto-shares via─> sharing 656 + Biscuit (A)
                                └──consumes (soft)─> 1645 demurrage (B, branch)
1668(B, process, fallback-able)
```
Flow funding depends on token/wallet/hives/trust/ocap/sharing/biscuit (+soft 1645);
nothing in those depends back on it (acyclic — Wholeness: flow funding is additive).
