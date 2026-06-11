---
item: 1644-flow-funding
phase: 03-design
title: "Dependencies — flow funding"
authored: 2026-06-12
---

# 1644 Flow Funding — Dependencies

Cross-item and cross-package dependencies, with substrate state (see
`design.md` §2). **Bold = hard BUILD-blocking (fork A0).**

## Hard dependencies (BUILD-blocking)

- **1596 `token` package (State B — `origin/1596-token-branches-2026-06-06`).**
  Flow funding routes value via `token.pay` (action-tier, `CORE_APPROVAL_REQUIRED`)
  and reuses the `iou` kind + the CIKU heartbeat-attested-elapsed accrual pattern.
  **Not present in this worktree** — must land on `origin/main` (or 1644's BUILD
  branch bases on the 1596 tip). Tracked as M0 / fork A0.
- **1627 wallet UI (State B — `origin/1627-wallet-ui-browser`).** The four ◆
  flow-funding surfaces EXTEND the wallet microapp (`token/ui/wallet-*.js`,
  `wallet.css`). MVP UI (M6) blocks on the wallet landing.

## Soft dependencies (present; reused)

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

## Downstream (items that may depend on 1644 later — informational)

- Demurrage (item 032, cancelled — design notes only): 1644 is its first concrete
  consumer; 032's open questions revisited at the demurrage M-row.
- Future external-capital bridge (open-Q A5): out of MVP; a separate item if the
  owner pursues real-external-capital flow.

## Dependency direction (no cycles)

```
hives(A) ─┐
trust(A) ─┼─> flow-funding(C) ──reads──> token(B,1596)
ocap(A) ──┘                  └──extends─> wallet(B,1627)
1668(B, process, fallback-able)
```
Flow funding depends on token/wallet/hives/trust/ocap; nothing in those depends
back on flow funding (acyclic — Wholeness axiom: flow funding is additive).
