---
title: "1644 flow-funding COMPLETION — independent plan-review critic verdict"
item: 1644-flow-funding
phase: 05-align
kind: plan-review-verdict
reviewer: independent adversarial critic (opus-4-8), NOT the plan author
reviewed-artifacts:
  - 05-align/frozen-plan-completion-2026-07-24.md
  - 06-implement/completion-gap-analysis-2026-07-24.md
  - src/packages/flow-funding/tests/{context-provenance,narrative,settle-from-ui,wallet-receipt,agreement-accept-ui}.test.ts
  - src/packages/flow-funding/tests/uc-flow-controls-no-drop.test.ts
verified-against-source:
  - src/packages/flow-funding/ui/flow-tab.js
  - src/packages/flow-funding/ui/flow-surfaces.js
  - src/packages/token/ui/wallet-activity.js
  - src/packages/token/domain/push.ts (token_event projection)
  - src/packages/flow-funding/sharing/flow-domain.ts (boundary-crossing node)
  - src/packages/flow-funding/manifest-operations.ts + manifest.ts
  - src/packages/flow-funding/handlers/epoch-settle.ts
date: 2026-07-24
---

# VERDICT: REVISE

The plan is **substantially sound** — the gap analysis is unusually rigorous and
almost every claimed gap is confirmed at its cited file:line, and four of the six
RED tests are genuine real-pointer, mechanism-asserting, RED-for-the-right-reason
tests. But two of the six tests carry defects that make the celebrate-blocking
capstone (C6) **un-GREEN-able as written**, and the C4 backend precondition the
plan flagged as "check and amend if absent" has been **verified absent now** — so
the amendment condition is already true and must be resolved before build, not
discovered mid-build. There are also two HC-C4 "gap-with-no-RED-test" holes.

This is a procedural gate, not a quality assertion. The findings below are
specific and blocking; fix them and this becomes an approve.

---

## Change summary

This completion seam does not touch backend: it wires the already-real
flow-funding loop into driveable + visible UI, and kills fabricated/inert
controls. Six C-rows: C1 real-hive context provenance (kills hardcoded
CONTEXTS), C2 settle-from-UI, C3 accept-agreement-from-UI, C4 attributed wallet
receipt, C5 remove/wire every inert control, C6 the star capstone narrative.
Verified: the backend ops the plan leans on all exist
(`flow.epoch_settle`/`agreement_accept`/`get_settlement`/`agreement_propose`/
`simulate` — `manifest-operations.ts`), so HC-C3 ("no new backend") is credible
for the op surface. The plan matches design intent (star S-1644; kill the owner's
"theatre and cheating" rejection). It **DEVIATES from reality in two places** the
plan did not catch (C6 witness node, C4 projection fields) — documented below.

---

## 1. Gap accuracy — CONFIRMED (strong)

Every P0/P1 gap is real at its cited location:

- **G1 fabricated contexts — CONFIRMED, incl. the duplication.**
  `flow-tab.js:41-47` (`CONTEXTS`) and `flow-surfaces.js:39-45`
  (`POLICY_CONTEXTS`) are two copies of the same five invented labels
  ("AWIP core team", "Watershed hive", …). Neither reads the user's hives.
  `state.context` defaults to `"awip"` (`flow-tab.js:71`).
- **G2 unattributed wallet — CONFIRMED.** `wallet-activity.js buildRow`
  (230-259) captures `signerDid` into the row (`foldActivityEvents`, :63) but
  **never renders it**; it renders `entryKindLabel(...)` → "Transfer" (:80-95,
  :249-257). No from/to line, no amount, no memo.
- **G3 no settle UI — CONFIRMED.** `epoch_settle` is op+CLI only
  (`manifest-operations.ts:193`); no caller in `ui/`.
- **G4 no accept UI — CONFIRMED.** `agreement_accept` op+CLI only
  (`manifest-operations.ts:129`); `handleCreate` (flow-tab.js:807-816) only
  proposes and tells the user the counterparty will "co-sign" — no accept path.
- **G6 felt toggle inert — CONFIRMED.** `toggleFelt` (flow-tab.js:265-270) is a
  `showStatus` stub.
- **G7 tithe slider inert — CONFIRMED.** `flow-surfaces.js:177-181` oninput
  writes a label; `savePolicy` params (flow-tab.js:331-336) never carry it.
- **G8 policy transparency inert — CONFIRMED (correctly scoped).** Policy radios
  `name="transp"` (flow-surfaces.js:188-191) are never read. NOTE: the *agreement*
  radios `name="agreementTransp"` ARE read (`handleCreate`, flow-tab.js:803-804),
  so the plan/test correctly scope G8 to the POLICY radios only. Good.
- **G9 tier/duration dropped — CONFIRMED.** `selectTier` (716-722) and
  `selectDur` (723-731) toggle CSS only; `handleCreate` derives `tier` from the
  formality dial (:768), never from the grid, and never reads duration.
- **G10 caps never set — CONFIRMED.** `savePolicy` sends only
  floor/ceiling/gradient/humanLabel (flow-tab.js:331-336); no
  `perClaimantCap`/`perEpochCap`/`armed_engines`/`channels`.

---

## 2. BLOCKING findings

### B-1 (MOUNTAIN) — C6 narrative capstone witnesses the WRONG node on the WRONG daemon; it cannot go GREEN.

`e2e-flow-funding-narrative.test.ts:342-386` polls the **payee** daemon with
`graph query --type flow_settlement` and asserts a `flow_settlement` node there
names the payer and credits the payee.

But `flow_settlement` is **single-writer / holon-local and does NOT cross the
boundary** — verified in `sharing/flow-domain.ts:62-64`
(`triggerKinds:["flow_settlement"], readTypes:["flow_settlement"],
writesNodeTypes:["flow_outcome"]`) and in the receive-side projection
(flow-domain.ts:199-262 projects a peer's shared outcome into a local
**`flow_outcome`**). The gap analysis itself states this (G2:
"`flow_settlement` … does NOT replicate to the payee … `flow_outcome` … the node
that DOES cross the boundary"). So the payee query returns nothing and
`attributed` stays false **forever, even after all six C-rows land**.

Compounding: the narrative **never performs the C3 accept gesture** its own C6
contract requires ("propose+accept agreement (UI, 2-daemon)" — frozen plan C6).
It proposes (step 6) then jumps to settle (step 7). With no active channel to the
payee and no claimant source, the UI settle will not credit the payee even on the
payer side.

Since C6 is the celebrate-blocking capstone, the whole completion effort cannot
close as authored.

**Required change:** (a) witness the payee's **`flow_outcome`** (and/or the
payee's real wallet Activity / `token balance`, exactly as
`e2e-flow-funding-wallet-receipt.test.ts` does) — not `flow_settlement` on the
payee; (b) drive the real C3 **accept** gesture between propose and settle;
(c) establish the claimant/balance source (see B-4) so the settle actually
allocates to the payee.

### B-2 (MOUNTAIN) — C4's amendment condition is ALREADY TRUE: the `token_event` projection carries NO memo and NO amount (and no explicit to/from beyond signer_did).

The plan (C4 + plan-amendment protocol) says: "Requires the `token_event`
projection to carry from/to+memo — if that projection lacks the fields, STOP +
amend." I verified the projection writer `_hook_token_event_projection`
(`token/domain/push.ts:133-150`): it writes
`commit_id, chain_id, branch, event_type, token_id, entry_kind, signer_did`
(+ `notice/noticeKind` only for reversals). There is **NO `memo`, NO `amount`,
NO counterparty/to/from field**. (The `flow-settle:` memo lives only on the token
entry payload, `tools-pay.ts:185`, inside the possibly-encrypted commit body —
not projected.)

Consequence, split honestly:
- The **payer-identity "from"** IS derivable from `signer_did` (a pure buildRow
  change, no backend) — and `e2e-flow-funding-wallet-receipt.test.ts` accepts
  attribution via the payer DID appearing in the feed, so the payee-side test is
  satisfiable without a projection change. (Note: "received entry's signer_did ==
  payer" is an inference the test itself validates — acceptable.)
- The **"· flow settlement · paid ✓" memo label** and the **per-row amount N**
  in the plan's C4 contract are **NOT** available from the projection. Delivering
  them as written = a `token_event` projection field addition = **new backend**,
  which per the plan's own protocol requires STOP + owner-signed amendment.

**Required change (decide NOW, before build — the condition is already met):**
either (a) descope C4's contract to `signer_did`-only attribution and strike the
"flow settlement · paid ✓" memo copy + per-row amount from the promised artifact,
OR (b) file `06-implement/plan-amendment-C4-2026-07-24.md` adding `memo`
(and amount surfacing) to the `token_event` projection, with owner sign-off and
its own RED test. Do NOT let the crew "discover" this at build time — that path
ends in either an unplanned backend change or a silent drop of the memo half
(an HC-C1/HC-C2 violation in spirit).

### B-3 (MOUNTAIN) — HC-C4 hole: C5 claims G10 policy caps but ships no RED test for them.

C5's contract lists "caps→policy `perClaimantCap`/`perEpochCap`" (and the plan's
G10 also names `armed_engines[]`/`channels`). But `uc-flow-controls-no-drop.test.ts`
asserts round-trips only for felt (G6), tithe (G7), transparency (G8), tier +
duration (G9). **There is no assertion that a cap value round-trips into
`policy_set` params.** HC-C4 requires every C-row's gap to land a RED test.

**Required change:** either add a cap round-trip assertion to
`uc-flow-controls-no-drop.test.ts` (present-in-DOM ⇒ value reaches `policy_set`
params), or explicitly drop caps/armed_engines/channels from C5 scope in the
frozen plan.

### B-4 (BOULDER→blocking) — HC-C4 hole: C4's PAYER-side receipt has no RED test.

C4's contract promises the PAYER's wallet shows "sent N to <payee> · flow
settlement · paid ✓" by calling `flow.get_settlement` (G2: "No wallet UI calls
`flow.get_settlement` — zero callers"). `e2e-flow-funding-wallet-receipt.test.ts`
covers only the **payee** side; `e2e-flow-funding-settle-from-ui.test.ts` calls
`flow.get_settlement` as a *backend* witness but never asserts the payer WALLET
renders the sent-receipt. So half of C4's user-visible contract is untested.

**Required change:** add a payer-side RED assertion (a wallet row reading
`flow.get_settlement` and naming the payee + paid state), or descope the
payer-side claim from C4.

---

## 3. Non-blocking findings (address, not gate)

### N-1 — C2 (and the narrative) under-specify claimant + balance sourcing.
`epoch_settle` requires `context` + `balance` and takes
`claimants:[{id,need,trustWeight}]` (`manifest-operations.ts` inputSchema;
`handlers/epoch-settle.ts:7-13`). Surplus with no claimant to absorb it
refuses-loud (HC-01), so a settle click that supplies neither balance nor
claimants may produce **no `flow_settlement` at all** → `settle-from-ui`'s
`settlements.length > 0` assert fails. The plan's `epoch_settle({context, ...})`
elides exactly the hard part. Name the client-side source: balance from the
real `token balance` read for the context's tokenKind; claimants from the
active flow agreements / trust channels. If claimants cannot be sourced
client-side, C2 hits the amendment protocol — decide before build.

### N-2 — C2 test hardcodes `CONTEXT="awip"`, which C1 removes.
`e2e-flow-funding-settle-from-ui.test.ts:70` pins `CONTEXT="awip"` and witnesses
`flow.get_settlement({context:"awip"})`, relying on the Policy surface defaulting
to "awip". C1 replaces the hardcoded list with real hives, so the armed context
will no longer be "awip". Coordinate: C2 should settle against whatever context
C1's UI actually arms (read it back), not a hardcoded literal — otherwise C2 and
C1 desync once both land on the feature branch.

### N-3 — C1 "no hardcoded literal remains" guard is functional-only.
The C1 gate mentions a `uc` guard that no hardcoded context literal remains, but
no such static test ships; `e2e-flow-funding-context-provenance.test.ts` covers
it functionally (asserts FABRICATED labels absent, real hives present). Acceptable
as-is, but a cheap `uc` grep-guard would harden against regression.

---

## 4. What is genuinely good (praise, so the crew keeps it)

- **Gap analysis fidelity is excellent** — every cited file:line checks out.
- **C1 context-provenance test** is a model real-pointer e2e: creates two real
  hives via the real `naoms hive create` CLI, verifies they materialize, mounts
  the surface by a real browser gesture, and asserts the rendered DOM — no
  `window.__` shortcut, no pre-seeded DOM. RED-for-the-right-reason (hardcoded).
- **C3 accept test** is a proper 2-daemon peer-pair, drives the accept via a real
  `[data-testid]` pointer click, and reads the bilateral `active` fold from BOTH
  daemons — a one-sided flip cannot pass.
- **C5 control tests** are honestly written to be satisfiable by EITHER wiring OR
  removing a control (the antecedent guard), forbidding only the silent-drop
  middle ground — exactly HC-C2.
- **HC-C1..C5** are well-formed and aimed precisely at the owner's rejection;
  HC-C5 (not env-gated) correctly closes the "all cross-identity tests OFF"
  gap. The wallet-receipt test's attribution-via-`signer_did` path is sound and
  needs no backend.

---

## What to do next

This pass means: the plan does not yet honor its own contract cleanly enough to
build. The remediation is not to argue the rubric — it is:

  1. Fix B-1: re-point the C6 capstone witness to the payee's `flow_outcome`
     and/or payee wallet, add the C3 accept step, and resolve claimant sourcing.
  2. Fix B-2 now (the condition is already true): descope C4 to signer_did
     attribution OR file the C4 `token_event` projection amendment with owner
     sign-off + a RED test.
  3. Fix B-3 and B-4: land the missing RED tests (policy caps round-trip;
     payer-side receipt) or descope those claims from C5/C4.
  4. Address N-1/N-2 (claimant+balance source; drop the "awip" hardcode).
  5. Re-submit the revised bundle.

A green build is not success. Code the next reader can change without fear is —
and a capstone that can never go green is the loudest theatre of all.
