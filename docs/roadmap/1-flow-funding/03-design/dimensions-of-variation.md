---
item: 1644-flow-funding
phase: 03-design
title: "Dimensions of variation — flow funding"
authored: 2026-06-12
catalog_source: docs/build/standards/dimensions-catalog.md
---

# 1644 Flow Funding — Dimensions of Variation

Per PROC-NEW-FEATURE-DESIGN: §1 names project-specific dimensions; §2 addresses
**every** catalog entry (apply-with-evidence OR n/a-with-one-line-justification —
silent omission REFUSES the design); §3 gives the specific cross-product analyses
worth a matrix.

## §1 — Project-specific dimensions this change varies along

- **D-FF-FORMALITY** — where a flow-agreement sits on the formality dial:
  `relational-trust-weight` ↔ `codified-revenue-share-contract`. The same
  primitive must behave coherently across the whole dial (design.md §6.1). The
  creation UI and the agreement schema both vary along this axis.
- **D-FF-ENGINE-POSTURE** — `live` vs `simulation-only` per anti-hoarding engine.
  Gradient + activity-decay are `live`; demurrage is `simulation-only` first
  (design.md §6.2). A test asserting demurrage MUST assert it ran in the
  simulation path, never the live ledger (Honor Rule mechanism-assertion).
- **D-FF-POLICY-VERSION** — a holon's FlowPolicy is versioned per `(holon,
  context, version)`; settlement reads the latest active version. Behavior varies
  across a policy-version change mid-epoch (must not silently re-price a
  half-settled epoch).
- **D-FF-ALLOCATION-FAIRNESS** — `equal` / `need-weighted` / `proximity` /
  `quadratic` / `holon-defined` (design.md §6.4, fork D2). MVP lean =
  need-weighted + per-claimant cap.

## §2 — Catalog dimensions (all 10 addressed)

### D-CHAIN-TYPE — apply
Flow funding introduces a **new `flow` chainType** (State C) carrying FlowPolicy /
flow-agreement / story state, and **reads/triggers** the **`token`** chainType
(State B) for value movement. It does NOT touch `personal`, `agent`, `messaging`,
`channel`. The `hive` chainType is touched only indirectly: a holon may BE a hive
(incl. `stewardship` hive) and a pool is a hive+treasury, but flow funding writes
no `hive.*` events — it references hive DIDs as holon identifiers. Per the catalog
caution, behavior is NOT pattern-matched on the chainType string — see
D-WRITER-MODEL.

### D-WRITER-MODEL — apply
The `flow` chain is **`single-permanent`** per holon: a holon's FlowPolicy and its
side of an agreement are written by that holon's lane only (mirrors the `token`
chain's single-writer-per-lane model the CIKU ceiling depends on). A
flow-agreement is **bilateral**: each party writes its own acceptance on its own
lane (two single-permanent lanes referencing one agreement id), NOT an
open-multi-writer chain — so the 1593 M7 mis-fit (rotation-on-member-add applied
to open chains) cannot recur here. No open-multi-writer or open-solo flow chains
in MVP. Settlement (`flow.epoch_settled`) is written by the surplus-holon's lane.

### D-TRANSPORT — n/a (no new transport behavior)
Flow events ride the existing chain-replication transports unchanged
(`iroh-p2p` / `mDNS-LAN` / `relay-fallback` / `loopback`); flow funding adds no
transport-layer code and assumes nothing beyond eventual chain delivery already
guaranteed by the substrate.

### D-NETWORK-CONDITION — apply
**Offline-first is the design point, not an afterthought.** Accrual is
heartbeat-attested-elapsed, computed lazily at fold (design.md §6.3), so a holon
offline during an epoch still settles correctly on reconnect from the signed
chain — mirroring the CIKU "OTR-2 posture" (over-mint detected on reconnect, not
prevented in real time). Under **partition**, a flow stays PROVISIONAL until the
elapsed hours are heartbeat-attested by admitted peers; an offline over-flow
racing the attestation is **detected on reconnect, not prevented** — and is
provable from the signed chain. No flow asserts settled value before attestation.

### D-TRUST-RELATIONSHIP — apply
Flow channels are **`peer-identities`** (peer-pair) edges from the 030–031 trust
graph — a holon flows only to/from neighbours it has a typed, quantitative trust
edge with, up to caps it sets. `same-identity-devices` is irrelevant (flow is
inter-identity value movement, not intra-identity device sync).
`untrusted-rendezvous` is **explicitly excluded**: a holon cannot be pulled into a
flow by a pre-trust stranger (anti-drain; design.md §8). Trust-edge presence is
the admission predicate for an allocation target (open-Q D1).

### D-CARDINALITY-REGIME — apply
- A single holon's policy/agreement ops: `1`.
- A surplus cascade across a holon's direct channels: `1..N small (≤10)` typical
  (a holon's trusted dependents), but the cascade is **arbitrarily deep**
  (transitive), so the settlement algorithm must be specified at `arbitrary`
  depth with a **convergence + termination guarantee** (open-Q B4 — carried to
  test plan as a conservation/termination invariant; TBFF's 20-iteration
  demo-grade bound is insufficient). Allocation complexity is bounded per-epoch by
  the active channel count, not the global graph.

### D-CONCURRENCY-MODEL — apply
**`multi-session-concurrent` + `async-event-loop`.** Two concurrent settlements
racing the same holon's headroom is the central race (cf. the CIKU "two concurrent
issuer-lane mints racing the same headroom → the second is illegitimate"). The
design inherits the token ledger's single-lane-write discipline: a holon's
outflow is serialized on its own lane, so two epochs cannot double-spend the same
surplus — the second is refused as over-flow (provable from the one signed chain).
Hot-path graph queries in enrichers/materializers MUST use the `*Async` sibling
(PC-700/701) — flow's FlowPolicy/agreement materializers `await
scope.graphQueryAsync`.

### D-CRYPTO-CONTEXT — n/a (inherits substrate posture)
Flow funding adds no new crypto primitive; it signs events and rides `token.pay`
through the existing identity/vault crypto (whatever PQ-hybrid posture the token +
identity layers carry). Capability tokens (§8 ocap) use the existing
consent/VC/ocap primitives (040–042). No key sizes or migration paths are chosen
here — inherited.

### D-STORAGE-DURABILITY — apply
FlowPolicy, agreements, streams, settlements, story-attestations are all
**`chain-committed`** (signed `flow.*` events) — the auditable home is the whole
point of the new chainType (design.md §4). The **simulation harness** runs over
**`in-process`** synthetic/historical state (no chain commit until the holon
commits real value) — this is the intentional durability boundary that makes
experimentation safe (cf. the side-queue `in-process` precedent). No `wal-fsync`
or `replicated`-specific behavior is introduced beyond what chain-commit already
provides.

### D-AUTHORIZATION-CONTEXT — apply
Arming a FlowPolicy and issuing the flow-ocap require **`vault-unlocked`** (the
holon signs the policy + capability). Automated settlement that rides `token.pay`
must NOT require an interactive unlock per flow — the **pre-authorized scoped
ocap** (design.md §8) is what lets settlement proceed while the vault is locked,
bounded by its cap, revocable by a new policy version. A flow firing in
`vault-locked` with no valid pre-issued capability **refuses loudly** (never
silent-drops — Honesty axiom; this is a named 04-risk case). `app-registered` /
`bridge-rewired` are n/a (no app-bridge surface).

## §3 — Cross-product analyses (small + discrete → matrix)

### Engine × Posture (the demurrage de-risking is the whole point)

| Engine | live MVP | simulation-only MVP |
| --- | --- | --- |
| Gradient outflow | ✔ | (also runnable in sim) |
| Activity-decay | ✔ | (also runnable in sim) |
| Demurrage | ✘ (deferred) | ✔ |

A test claiming demurrage coverage MUST assert the **simulation** path fired
(D-FF-ENGINE-POSTURE mechanism-assertion), not that a balance decreased.

### Network-condition × Settlement-state

| | online | partition | offline-first |
| --- | --- | --- | --- |
| accrual | attested-elapsed | provisional until attested | provisional until attested |
| over-flow | refused at lane | detected on reconnect | detected on reconnect |
| value asserted | only post-attestation | never pre-attestation | never pre-attestation |

This matrix is the offline-first correctness contract; each cell maps to a test
plan DE row.
