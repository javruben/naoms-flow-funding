# frozen-plan (COMPLETION) — 1644-flow-funding @ e7d20737015

Brand-new frozen seam for the **completion** effort, authored 2026-07-24 after
an owner demo rejection exposed that the flow-funding *loop* is real in the
backend but **not driveable or visible in the UI**, and that the Policy contexts
are fabricated. Supersedes nothing in the original `frozen-plan.md` (that seam's
M1–M7 backend remains landed + valid); this seam completes the UNDELIVERED
user-visible half (original M6 partial + M7 missing) plus kills inert controls.

Build crew may not deviate from this file — plan-amendment protocol at bottom.

## Pointers

- star_ref:   S-1644 ("What if money knew when to keep moving … so no node
  hoards while a dependent goes without?")
- gap_analysis: `06-implement/completion-gap-analysis-2026-07-24.md` (this seam's basis; 4-auditor, file:line-cited)
- design_sha:  `1e4b844bfe4` (03-design/design.md — unchanged; §5 contexts, §9 four surfaces, star)
- original_frozen_plan: `05-align/frozen-plan.md` (M1–M7 seam; M6 partial / M7 missing)
- approved_at_tip: `e7d20737015` (origin/main)

## Hard constraints (inherited + completion-specific)

Inherit HC-01..HC-10 from the original frozen-plan verbatim (conservation
refuse-loud, ocap-gated pay, no `Date.now()` in fold, caps, demurrage=reuse-1645,
transparency local-first, HC-09 real-pointer e2e, HC-10 assert-the-mechanism).
Plus, for this seam:

- **HC-C1 — No fabricated data in any surface.** Every list/label/value a user
  sees is either read from the daemon via the real op/query, or is an explicit
  honest empty-state. No hardcoded example contexts, peers, or amounts presented
  as real. (Directly closes the owner's rejection.)
- **HC-C2 — No inert control.** Every rendered input either persists to a real
  op OR is removed from the DOM. A control that collects input and silently
  drops it is banned.
- **HC-C3 — No new backend.** The loop already works (proven). This seam wires
  UI to existing ops (`epoch_settle`, `agreement_accept`, `get_settlement`,
  `flow_outcome`) + reads real hives. If a milestone *seems* to need new backend,
  STOP and file a plan-amendment — do not invent a handler.
- **HC-C4 — RED-first, real-pointer.** Every C-row lands its RED test BEFORE
  implementation (test fails on current main), driven by a real pointer on a
  real daemon (HC-09). Cross-identity rows use ≥2 daemons. Pair every
  `*-failure-mode` with a `*-success`.
- **HC-C5 — Cross-identity value tests run in CI.** The completion narrative
  (C6) and C4 wallet-visibility e2e must NOT be env-gated off — a default run
  must prove the visible loop. (Closes the "all cross-identity tests OFF by
  default" gap.)

## Reuse ledger (what this seam does NOT build)

- No new chain events, handlers, engines, materializers — all exist and are real.
- `flow.epoch_settle`, `flow.agreement_accept`, `flow.get_settlement` ops + CLI
  verbs already exist (`manifest-operations.ts`) — C2/C3/C4 CALL them from UI.
- `flow_outcome` (received, cross-boundary) already materialized by the sharing
  domain — C4 READS it, does not create it.
- Real hives via existing `ctx.graphQuery({type:"hive"})` (proven in wallet-tab/hives UI).

## C-rows (build-crew work — one sub-agent each; C1–C5 parallel, C6 integrates)

### C1 — Policy contexts come from the user's REAL hives/relationships (closes G1)
- deliverable_class: e2e · agent_role: ui-implementer · depends_on: []
- files_in_scope: `flow-funding/ui/flow-tab.js` (CONTEXTS), `flow-funding/ui/flow-surfaces.js` (POLICY_CONTEXTS/policyNav/policyPills)
- contract: the Policy context list + pills are enumerated from the daemon
  (`ctx.graphQuery({type:"hive"})` + holon-local relationship contexts), NOT the
  hardcoded five. Honest empty-state when the user has no hives. Selecting a real
  hive keys the real `policy_set`/`get_policy` by that hive's id.
- RED test: `e2e-flow-funding-context-provenance.test.ts` — on a daemon seeded
  with hives {A,B} via the real create path, the Policy list renders A,B (and NOT
  "AWIP core team"/"Watershed hive"). Fails on current main (hardcoded).
- gate (e2e, real-pointer): above GREEN + `uc` guard that no hardcoded context
  literal remains in either file.

### C2 — A user SETTLES a flow epoch from the UI (closes G3)
- deliverable_class: e2e · agent_role: ui-implementer · depends_on: []
- files_in_scope: `flow-funding/ui/flow-tab.js` + `flow-surfaces.js` (velocity/policy surface action), NO backend.
- contract: a real control triggers `ctx.api.epoch_settle({context, ...})` for a
  context whose holdings exceed ceiling; surplus routes to below-floor claimants;
  the committed `flow_settlement` is read back and shown (paid/indeterminate via
  `get_settlement`). Refuse-loud surfaced on conservation error (HC-01).
- RED test: `e2e-flow-funding-settle-from-ui.test.ts` — real pointer clicks
  Settle → a `flow_settlement` node exists on the daemon + the row renders.
  Fails on main (no UI trigger).
- gate (e2e ≥1 daemon; integ for the settlement read).

### C3 — A user ACCEPTS an incoming agreement from the UI (closes G4)
- deliverable_class: e2e · agent_role: ui-implementer · depends_on: []
- files_in_scope: `flow-funding/ui/*` (incoming-proposals list + accept action), NO backend.
- contract: incoming `flow_agreement` proposals (proposed, self==counterparty)
  render; an Accept control calls `ctx.api.agreement_accept({agreementId})`; the
  bilateral fold flips to `active` and the UI reflects it.
- RED test: `e2e-flow-funding-agreement-accept-ui.test.ts` (2-daemon) — A
  proposes (UI), B sees + accepts (UI), both render `active`. Fails on main
  (accept is CLI-only). Pair with the existing refusal success/failure.
- gate (e2e, 2-daemon, real-pointer).

### C4 — The wallet SHOWS value arriving, attributed to its source (closes G2)
- deliverable_class: e2e · agent_role: ui-implementer · depends_on: []
- files_in_scope: `token/ui/wallet-activity.js` (buildRow from/to + `flow-settle:`
  memo), `token/ui/wallet-tab.js` or a flow-settlement reader (calls
  `flow.get_settlement`), `flow-funding/ui/flow-tab.js` velocity "Received" →
  read `flow_outcome` (received) not self-settlements. Requires the `token_event`
  projection to carry from/to+memo — if that projection lacks the fields, STOP +
  amend (do not fake). 
- contract: after a real settlement, the PAYEE's wallet activity shows "received
  N **from** <payer short-DID/name>" (not a bare "Transfer"); the PAYER's wallet
  shows "sent N to <payee> · flow settlement · paid ✓"; velocity "Received" reads
  the cross-boundary `flow_outcome`.
- RED test: `e2e-flow-funding-wallet-receipt.test.ts` (2-daemon, NOT env-gated) —
  payer settles 200 to payee → payee wallet UI shows a row attributing +200 to
  the payer's identity. Fails on main (unattributed).
- gate (e2e, 2-daemon, real-pointer, HC-C5 runs in CI).

### C5 — Kill every lying control (closes G6–G10)
- deliverable_class: e2e · agent_role: ui-implementer · depends_on: []
- files_in_scope: `flow-funding/ui/flow-surfaces.js` + `flow-tab.js` (felt toggle,
  commons-tithe, transparency radios, agreement tier/duration, policy caps).
- contract: for EACH inert control — either wire it to the real op param (tithe→
  policy param, transparency→policy `transparency_level`, tier/duration→agreement
  `terms`, caps→policy `perClaimantCap`/`perEpochCap`) and prove it persists, OR
  remove it from the DOM. No control that collects and drops. (HC-C2.)
- RED test: `uc-flow-controls-no-drop.test.ts` — for each control present in the
  DOM, its value round-trips to the op payload / node; asserts none are silently
  dropped. Fails on main (tier/duration/tithe/transparency dropped).
- gate (uc + e2e where user-visible).

### C6 — The STAR, demonstrated end-to-end and VISIBLE (closes G5, original M7)
- deliverable_class: e2e · agent_role: e2e-author · depends_on: [C1,C2,C3,C4]
- files_in_scope: `flow-funding/tests/e2e-flow-funding-narrative.test.ts` (new).
- contract (frozen-plan M7 verbatim, now driven from UI): arm policy on a REAL
  context → propose+accept agreement (UI, 2-daemon) → cross ceiling → settle
  epoch (UI) → below-floor dependent receives → **payee wallet shows the receipt
  attributed to the payer** → carrier trust-weight rises. NO skip/TODO (Honor:
  E2E skip = critical). NOT env-gated (HC-C5).
- gate (e2e, ≥2 daemon, real-pointer + real CLI): GREEN driving 100% of the loop.
  This is the capstone; celebrate-blocking.

## Test plan

Each C-row = one RED test named above, authored + failing on `e7d20737015`
BEFORE any impl, then GREEN after. C6 is the integrating narrative. All
real-pointer (HC-09), mechanism-asserting (HC-10), cross-identity rows ≥2 daemons
and NOT env-gated (HC-C5).

## Plan-amendment protocol

If a C-row appears to require new backend, new chain events, or a projection
field that does not exist (e.g. C4 needs from/to on `token_event` and it is
absent): STOP, write `06-implement/plan-amendment-C<N>-<date>.md` naming the
missing seam, and surface to owner. Do NOT invent a handler or fake the data —
that is the exact failure this seam exists to correct.
