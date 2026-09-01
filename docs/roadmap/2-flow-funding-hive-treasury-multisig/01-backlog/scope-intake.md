---
title: "1696 scope intake — hive-treasury flow funding + multi-signer treasuries"
type: roadmap
audience: builder
last-verified: 2026-06-16
---

# 1696 — Hive-treasury flow funding + multi-signer treasuries

Follow-on split out of **1644 flow-funding** (owner directive 2026-06-16: "add
(3) in scope and (1) and (2) as follow on a separate roadmap item"). 1644 ships
individual + **bilateral** flow funding; 1696 extends it to **shared treasuries**
governed by **many signers**.

## Two deferred surfaces (the scope)

### (1) Hive-treasury flow governance
A hive/pool treasury holds a FlowPolicy and circulates surplus like any holon —
but with a **collective-governance view** for the treasury (the hive's members
see/steer the band, gradient, tithe, and outflows together).

- In-model already on 1644: **`pool = hive + treasury`** (no new identity type —
  `1644/03-design/DEPENDENCIES.md`), and a **stewardship hive is already a flow
  participant** — "Watershed hive" appears as a Policy *context* and as a flow
  *recipient* in the Velocity + Simulation surfaces.
- **Not** built on 1644: the dedicated treasury-management / collective-governance
  UI. Named post-MVP in `1644/03-design/mockup/README.md` ("Stewardship-hive flow
  view … collective governance view for the hive's treasury. Not mocked").
- Related deferred ○ surface: the **Pool surface** (create / seed / govern a
  buffer or purpose pool) and the **commitment-pool** modality.

### (2) Multi-signer treasuries
1644's flow **agreement** is strictly **two-party co-sign** (the bilateral
friendship chain `fcAB`, `content` branch — `1644 handlers/agreement.ts`). A
shared treasury needs **n-of-m** signing.

- Substrate that exists (reuse, do not rebuild): hives carry **FROST shares**
  (`stewardship.frost_share_stored`); token uses **co-present dual-sign + t=2
  cross-daemon quorum** (`token/domain/ceremony.ts`, `chain-quorum-wire.ts`).
- **Not** designed on 1644: the threshold/approval **UX** (who must sign, the
  pending-approval surface, quorum config) and the treasury chain + quorum signer
  wiring for flow events. A treasury FlowPolicy/outflow would live on the
  **hive/pool chain** with a FROST quorum signer rather than the 2-party lane.

## Entry conditions / dependencies
- 1644 celebrated (individual + bilateral flow funding, the four MVP surfaces).
- Reuses: hives, stewardship-hive substrate, token quorum ceremony, FROST share
  store, ocap/consent. Lifecycle: PROC-NEW-FEATURE (own RESEARCH → DESIGN → …).

## Out of scope (stays on 1644)
- Individual FlowPolicy, bilateral flow agreements, the engines, simulation,
  transparency, the four MVP wallet surfaces, and the **(3) currency/token-kind
  selector on the Policy surface** (folded into 1644 MVP per the same directive).
