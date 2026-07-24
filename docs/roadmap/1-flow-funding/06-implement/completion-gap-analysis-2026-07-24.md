---
title: "1644 flow-funding — completion gap analysis (real vs placeholder vs missing)"
type: gap-analysis
item: 1644-flow-funding
authored: 2026-07-24
authored_by: c10 (owner-directed, post-demo rejection)
method: 4 parallel read-only auditors (UI, backend+wallet, design-vs-delivered, tests), every claim file:line-cited
---

# Flow-Funding Completion Gap Analysis

**Owner trigger (2026-07-24):** a demo was rejected — "the hives on it are not
actually in the data", "i dont see the tokens coming into my wallet and going
into the wallet of another", "full theatre and cheating". This analysis
establishes exactly what is real vs placeholder vs missing, cited to code.

## Headline

**The backend is fully real and CLI/integ-proven — value genuinely moves
cross-identity (0→200 in `e2e-flow-payee-credit-cli.test.ts`, real FROST 2-of-2,
real `token.pay`). Zero backend stubs.** The entire gap is **UI wiring + config
provenance + one missing capstone E2E**. The star ("value circulates to
dependents, no node hoards") is *provable in tests* but is **neither driveable
nor visible in the wallet UI**.

The owner's two complaints are both **real, code-confirmed defects**, not
misperceptions:
1. The flow contexts ("hives") are hardcoded example labels, not the user's data.
2. Incoming value is never attributed to its source in any wallet/UI surface.

## Real (keep — do not touch)

- **All backend handlers/engines/materializers/sharing** — `handlers/{epoch-settle,policy-set,agreement,simulate}.ts`, `engine/{gradient,activity-decay,accrual,allocate}.ts`, `materializers/*`, `domain/{flow-ocap,engine-key-registry,settlement-confirm-hook}.ts`, `sharing/flow-domain.ts`. REAL, conserved-and-capped, refuse-loud, proven.
- **Cross-identity value movement** — proven at CLI (`e2e-flow-payee-credit-cli`) + WS (`integ-flow-payee-credit-2daemon`, `integ-flow-transparency-local-first`). All **OFF by default** in CI (env-gated).
- **Policy/Simulate/Velocity-band UI reads** — the values that ARE shown (armed floor/ceiling, sim report) are real, cross-checked against independent ops in browser e2e.

## Gaps — prioritized

### P0 — the loop is invisible / incomplete in the UI (the owner's complaint)

- **G1 — Contexts are fabricated.** `flow-surfaces.js:39-45` (`POLICY_CONTEXTS`)
  + `flow-tab.js:41-47` (`CONTEXTS`) — five invented labels incl. "Watershed
  hive", duplicated in both files, presented with NO `preview` tag and NO daemon
  fetch. Not read from the user's hives / stewardship-hive DIDs / trust edges.
  Every UI test pins `context="awip"` so the fabrication is untested.
- **G2 — No UI shows incoming value attributed to its source.** Three named
  spots (backend auditor B1-B4):
  - `token/ui/wallet-activity.js buildRow` (:230-259) drops `signerDid`; renders
    an unattributed "Transfer", never "received N **from** Alice"; ignores the
    `flow-settle:` memo.
  - **No wallet UI calls `flow.get_settlement`** (zero callers) — the outgoing
    "you sent N to Bob · paid ✓" row is unbuilt.
  - `flow-tab.js` velocity "Received" (:469-483) reads *self-holon*
    `flow_settlement` (single-writer, does NOT replicate to the payee) instead
    of `flow_outcome` (the node that DOES cross the boundary — and has **zero UI
    readers anywhere**).
- **G3 — No UI trigger to settle.** `flow.epoch_settle` is wired only as an op +
  CLI verb (`manifest-operations.ts:205`); never called from `ui/`. A user
  cannot circulate surplus from the app — only via CLI.
- **G4 — No UI to accept an agreement.** `flow.agreement_accept` exists as op +
  CLI verb (`manifest-operations.ts:138`) but is never called from `ui/`. The
  surface tells the user the counterparty will "co-sign" — a step with no UI.
- **G5 — M7 capstone E2E missing.** The frozen-plan M7 contract ("arm → agree →
  cross ceiling → settle → dependent receives → **visible in the wallet**", "no
  DEFERRED/TODO/skip") was **never built** — no `e2e-flow-funding-narrative.test.ts`
  exists. The single test that would prove the star end-to-end is absent.

### P1 — inert / preview controls (render as functional, do nothing)

- **G6** — Felt-threshold toggle is a stub ("being wired", `flow-tab.js:265-270`).
- **G7** — Commons-tithe slider value is never sent to any op (`flow-surfaces.js:172-182`).
- **G8** — Policy Transparency radios (`name="transp"`) are never read; the
  transparency *level* cannot be configured though the sharing mechanism runs.
- **G9** — Agreement contributor-tier grid + duration control render as inputs
  but are silently dropped before `agreement_propose` (`flow-tab.js:716-731`).
- **G10** — Policy UI never sets `perClaimantCap`/`perEpochCap`/`armed_engines[]`/
  `channels` (design §5 fields); engine honors them only if present.

### P2 — honestly-deferred (named in artifacts; leave or defer explicitly)

- Story→trust-signal fold (`M-1644-STORY-WEIGHT-FOLD`), ZK proof-of-need
  (`M-1644-ZK-NEED`) — named post-MVP deferrals. Story-gated transparency radio
  is inert. NOT in this completion scope unless owner elevates.

## Completion principle

No new backend. This is **make the real backend loop driveable and visible, and
kill every inert/fabricated control** — either wire it to a real op or remove it
(no control that lies). Every P0/P1 item gets a RED test first.
