# Foundations — what 1596 (token ledger) + 1627 (wallet UI) + trust graph provide

**Item:** 1644 · **Date:** 2026-06-09 · **Phase:** RESEARCH

Sourced from a thorough code/branch exploration on 2026-06-09. **🟡 UNVERIFIED
caveat:** the token branch (`1596-token-branches` family) was not confirmed fully
landed on `origin/main` at research time; treat package-internal specifics here
as a map to re-confirm against the live branch when DESIGN opens, not as
settled fact.

## 1596 — Token ledger (the value substrate flow funding routes)

**What it is.** An entry-based, fold-projected token ledger. Token state is a
**deterministic projection of a DAG of entries**, never stored canonical
balances.

- **Entries** (`src/packages/token/domain/types.ts`): `TokenEntry` union —
  `mint`, `transfer`, `compensation`, `violation-evidence`, `trust-severance`.
  Each has `kind`, `tokenId`, `spendNonce`, `assertedAt`.
- **Balances are folded, not stored** (`FoldResult`): per-DID `settled` (below a
  finality `watermark`) + `provisional` balances; folds are clock-free
  (HC-21/HC-22).
- **Token branches** named `token-<id>`, single-writer per issuer, created via
  `token.define`; admission limits writes to `token.*` + `chain.*`.
- **Chain events:** `token.genesis`, `token.mint`, `token.pay` (co-signed
  transfer), `token.attest` (quorum-t2), `trust-severance`.
- **Primitives:** **Invoice** (signed, content-addressed payment request;
  mints no value, authorises amount/payee; replay-deduped), **Ceremony**
  (payer+payee co-present dual-sign; refuses self-cosign), **Attestation**
  (quorum-t2 witness for provisional→settled), **Watermark** (finality
  boundary).
- **Materialized node:** `token_balance` (per-DID, keyed `token:tokenId`,
  updated by a post-commit hook) — the read model the wallet renders.
- **Operations** marked `CORE_APPROVAL_REQUIRED` (governance tier, high risk).

**Why it matters for 1644.** Flow funding does **not** invent value — it
**schedules and routes existing `token.pay` transfers** according to thresholds +
splits, and reads folded balances to decide when a node is above ceiling / below
floor. The per-transfer `CORE_APPROVAL_REQUIRED` gate is the key tension:
automated flow needs a **pre-authorised, revocable capability** that composes
with (does not bypass) that gate. See open question #3 in ROADMAP.md.

## 1627 — Wallet UI (where thresholds get configured + flow gets seen)

**What it is.** A browser microapp (rendered under the token feature) reading the
canonical `token_balance` node — no business logic in the UI.

- Surfaces: `wallet-home` (banknote-card grid per held token), `wallet-create`,
  `wallet-send` (co-present transfer), `wallet-request` (invoice), `wallet-detail`
  (balance/history/participants), `wallet-activity` (state-change feed),
  `wallet-treasury`, `wallet-audit`, `wallet-recover`.
- E2E contract: `[data-feature="wallet"]` → `.wallet-card[data-token-id]` →
  `.wallet-card__amount[data-amount]` + exactly one of final-check /
  pending-count marker.

**Why it matters for 1644.** Flow funding adds **threshold configuration**
(floor/ceiling per node + per edge), a **flow/velocity view**, and **pending-flow
indicators** onto this existing wallet — it is a new surface on a built app, not
a new app. (Cf. owner feedback on 1260: extend the real working app; don't build
a parallel harness.)

## 030–034 — Trust graph (the channels for flow)

- **030 trust-graph-model** (celebrated 2026-03-24): asymmetric, quantitative,
  typed trust edges (vouch/attest/delegate/endorse): source DID, target DID,
  level, timestamp.
- **031 trust-propagation-engine** (celebrated 2026-03-25): transitive decay over
  the graph; tools `trust_propagate`, `trust_horizon`, `trust_explain`.
- **032 trust-decay-demurrage** (CANCELLED, design notes only): relationship
  decay (~7%/yr Circles-style) designed, **never implemented**. 1644 is the first
  concrete consumer of demurrage — revisit 032's open questions (decay model,
  rate, maintenance reset).
- **033 reputation-system** + **034 trust-registries** (celebrated): merit +
  accountability trail from verifiable actions, no self-reports.

**Why it matters for 1644.** Trust edges are the **flow channels + caps** ("each
node sets thresholds"), and trust propagation can **weight cascade depth** and
provide **sybil-resistance** for fairness weighting. No `demurrage` implementation
exists in code today (grep-negative on 2026-06-09) — 1644 must build it.

## Package skeleton a `flow-funding` package would follow

Per `src/packages/AGENTS.md`, a package directory typically contains:
`mod.ts` (exports PACKAGE_ID/MANIFEST/handlers), `manifest.ts` (operations,
chainTypes, graphTypes, wsMessageTypes), `namespace.ts` (WS dispatch),
`register.ts` (boot registration via the wire registry —
`src/core/boot/wire-registry-gate.ts`), `tools.ts`/`ops.ts` (daemon handlers),
`domain/` (pure validators/types — loud, no silent drops), optional
`enrichers/` / `materializers/` / `reducers/`, `ui/` (browser microapp),
`tests/` (uc-*, integ-*, e2e-*), `docs/design/`, `README.md`, `AGENTS.md`.

**🟠 GUESS (to settle at DESIGN):** flow funding likely **reuses the `token`
chainType** and adds flow-specific entry kinds / a scheduler rather than a whole
new chainType — because its job is routing existing transfers, not issuing a new
asset. To be decided against the live token manifest at DESIGN time (open
question #1).
