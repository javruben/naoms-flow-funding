# Flow Funding UI Surfaces + Mock-First Plan (02-research → feeds 03-design)

**Item:** 1644 · **Date:** 2026-06-11 · Adopts the spirit of **1668**
(*"PROC-NEW-FEATURE knows how to build on mocks without shipping false green"*).

> Owner directive (2026-06-11): create a **mock-first approach** to the flow-
> funding UIs (token/flow-agreement creation, configuration in the wallet,
> others), in the spirit of 1668's mock discipline. This file enumerates the
> surfaces and binds them to that discipline, so DESIGN authors mocks **first**
> and BUILD verifies fidelity against the **real backend at every milestone**.

## Why mock-first here (the failure 1668 catalogues)

1668 found five UI items (1260, 1607, 1630, 1647, 1650) each hit the **same
false-green class**: a substrate cheaper than the real backend (jsdom, `file://`,
static seed, fetch-stubs, pre-seeded state, stale screenshots) passed "green"
while the real bug only appeared on the real daemon — **caught by the owner, not
the tests** (1260 verbatim: *"what the fuck? you must create a real application
that works"* — already in our MEMORY as `feedback_1260_build_real_app_not_diff_harness`).
Flow funding is UI-heavy *and* moves value, so it is exactly the profile that
burns owner round-trips. Mock-first, real-backend-verified, is mandatory.

## The mock discipline we adopt (from 1668, with cited precedents)

1. **Mock = binding ground truth, carried losslessly.** Each UI surface gets a
   binding HTML/CSS mock authored in `03-design/` (format precedent: the
   `1259-plugin-config-ui-heal/02-design/mockups-*/` HTML set). BUILD
   re-implements **from the mock**, not row-by-row gap-fixing (1260 ran 108
   cycles and never converged doing the latter).
2. **In-app mock behind a flag** — render the mock screens *inside the real
   wallet app* with the real served CSS/HTML/bundle, flag-gated and
   **prod-boot-refused**, so markup/styling is reusable and source-vs-served gaps
   collapse. Mechanism: **`NAOMS_UI_MOCK`** (1668 M1 — 🟡 pending land), which
   generalises the **existing `NAOMS_E2E_MOCK_BLOBS` / PC-414** test-only-mock
   pattern (`src/packages/sdk/checking/rules/pc-414-mock-blobs-test-only.ts` —
   verified present 2026-06-11).
3. **Mock Verification Ladder (1607).** A mock is allowed only when paired with a
   **non-mock check at the layer it could be wrong**: logic → real-path coverage
   → wire-contract → render/`getComputedStyle` → real input → served-artifact
   freshness. No mock without its paired real check.
4. **Per-M-row mock-fidelity gate on the REAL backend (1650
   `D-PER-M-ROW-MOCK-FIDELITY`).** A product-designer compares each surface to
   its mock **on a real daemon at the close of EVERY UI milestone** — not once at
   the end, and **never against stale screenshots** (the 1258 failure). Composes
   with our `screenshot-verify` + `verify-before-handoff` skills.
5. **Data through the real write path.** Seed flow/policy/pool data via the real
   handlers (`flow.define`, `token.pay`, pool seed, importer) — **never
   `_graphPut`/static seed** — so re-render races and cache-key bugs surface.
6. **`naoms check` enforcement.** UI tests carry a mock-ladder header
   (`@mock-ladder <successor-mechanism>` / 1668's `@mock-fidelity` — 🟡 pending);
   UI-visible intents declare **`tier=e2e` with a real-pointer driver**, which is
   already enforced at PROC-NEW-FEATURE **PRE-ALIGN-GATE check 5** (no synthetic
   seam / `window.__` / DOM-click-via-evaluate).

**Reuse-before-build (Rule 8):** flow-funding does NOT build a parallel UI app —
it **extends the 1627 wallet microapp** (owner feedback 1260/1627: build the real
app; mocks are the wire-frame contract you build *to*, screenshots are evidence
the real app matches — not the artifact you ship).

## The flow-funding UI surfaces (each gets a binding mock in 03-design)

Extensions of the **1627 wallet** (`src/packages/token/ui/wallet-*.js`). MVP
priority tagged ◆ (first) / ○ (later).

- **◆ Flow-agreement creation** — create a *flow agreement* (the formality-dial
  primitive): a light relational **trust-weight/channel** at one end → a codified
  **revenue-share contract** (parties, %, duration/expiry-math, tier, IOU) at the
  other. (The owner's "token/value creation", in flow-funding terms. Token
  *define* itself stays 1596's `wallet-create`.)
- **◆ FlowPolicy configuration (in the wallet)** — the **per-(holon, context)**
  settings surface: floor / ceiling / **gradient curve** / which modalities are
  armed / decay rates / tithe % / transparency level. This is the owner's
  "configuration in the token wallet" + the per-person/hive per-context +
  experimentation requirement. Context switcher (NAO vs Care Circles vs household
  vs a stewardship hive).
- **◆ Flow / velocity view** — see flows in/out, gradient state ("in deficit" /
  "my cup is full"), cascade preview; the felt "river."
- **◆ Simulation / experimentation surface** — run a FlowPolicy variant over
  synthetic/historical events and **watch a flow epoch before committing real
  value** (owner experimentation requirement; de-risks the demurrage tension).
- **○ Channel / trust-topology editor** — who you flow to/from + channel widths
  (Simon's topology; rides the 030–031 trust graph).
- **○ Pool surface** — buffer / purpose pools (a **stewardship/treasury hive**):
  create, seed, tithe config, **release rules**, member drawing-rights.
- **○ Commitment-pool surface** — issue commitment → seed → swap → redeem →
  Trade Balance (the Grassroots Economics modality; distinct from Tree's
  revenue-split — see merge synthesis).
- **○ Story-upstream / reflection capture** — narrative accountability (the four
  questions) + outcome-transparency view (reconciles Tree's "everyone sees
  everything" with the encrypted default).
- **○ Stewardship-hive flow ("flow to the earth")** — flow to a stewardship hive
  (`linked_entity_did` = river/mountain/tree), collectively governed.
- **○ Transparency / rent-leakage view** — outcome transparency + extraction-
  visibility (Compost Capital).

## How this binds into the PROC path

- **03-DESIGN** authors the **binding mocks first** (the consolidated design.md +
  the mock set), per surface above. The product-designer crew role owns the felt
  experience; mocks are the spec BUILD reads.
- **Test plan** (drafted in DESIGN, finalised at ALIGN): every UI-visible intent
  → ≥1 contract row at **`tier=e2e` with a real-pointer driver** (PRE-ALIGN-GATE
  checks 3 + 5), plus the mock-ladder pairing per surface.
- **Frozen plan / M-rows:** each UI-bearing M-row carries the **per-M-row
  mock-fidelity gate on a real daemon** as its acceptance (close-of-milestone,
  real backend, fresh shots), and seeds data via the real write path.
- **MVP** (per spore's "don't over-formalise" caution + owner priority): the four
  ◆ surfaces — flow-agreement creation, FlowPolicy configuration, flow/velocity,
  and the simulation surface — mocked first, then built against the real daemon.

## Dependency on 1668 (honest status)

🟡 **1668 is at 05-align, NOT landed on `origin/main`** (verified 2026-06-11).
Its canonical mechanisms (`NAOMS_UI_MOCK` flag + prod boot-refuse, Critic Cat-14
Mock-Fidelity, `@mock-fidelity` `naoms check` field, Layer 12 of
`no-test-theatre.md`, `D-PER-M-ROW-MOCK-FIDELITY` promoted to main) do not exist
yet. Plan:
- If 1668 **lands** before 1644 BUILD: adopt its canonical mechanisms directly.
- If not: 1644 adopts the **per-item precedents 1668 promotes** — 1650
  `D-PER-M-ROW-MOCK-FIDELITY`, 1630 real-app Chrome-MCP acceptance, 1607 Mock
  Verification Ladder — plus the existing PC-414 mock pattern. Either way,
  **mock-first + real-backend-per-milestone is in 1644's process now**, not
  deferred. (See open-questions L1.)
