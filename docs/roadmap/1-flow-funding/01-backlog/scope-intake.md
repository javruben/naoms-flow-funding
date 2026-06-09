# 1644 Flow Funding — Scope Intake (01-backlog)

**Opened:** 2026-06-09 · owner-initiated · PROC-NEW-FEATURE · phase 02-research

## One-line

A new `flow-funding` package that lets each node in the network set thresholds
so income automatically flows out to its dependents when it has surplus, and is
drawn back in when it falls into need — keeping value circulating, building
relationships, and preventing hoarding.

## In scope

- **Threshold model** per node: a floor and a ceiling (viability band), set
  globally and/or per relationship edge.
- **Automated outflow** of surplus above the ceiling to dependent/relationship
  edges (splits + streams, cascading).
- **Automated inflow** of support below the floor from nodes the node has
  previously supported (reciprocal direction).
- **Demurrage**: idle holdings decay so value cannot be hoarded.
- **Trust-edge channels**: flow only along declared relationships, capped by
  limits the node sets.
- **Configuration + visibility** surfaced on the existing wallet UI (1627).
- **Requirements intake** from a real user (Tree) before design is finalised.

## Explicitly out of scope (this item)

- A new value substrate / currency — flow funding routes the **existing** token
  ledger (1596); it does not mint a parallel money.
- Fiat on/off ramps, exchange, or price discovery.
- Tax / legal / regulatory compliance tooling (flag for a future item if a real
  deployment needs it).
- Cross-chain bridging of value beyond what 1596 already provides.

## Prior work to REUSE (Rule 8 — reuse before building)

- **1596 token ledger** — entry-based fold-projected token chains; transfer,
  invoice, ceremony, attestation, `token_balance` node. Flow funding schedules
  and routes these transfers; it does not replace them.
- **1627 wallet UI** — wallet microapp surfaces (home/send/request/detail/
  activity/treasury). Flow funding adds threshold config + a flow view.
- **030–031 trust graph + propagation** (celebrated) — relationship edges become
  flow channels; propagation can weight cascade.
- **032 trust-decay/demurrage** (cancelled, design notes only) — first concrete
  consumer of demurrage lives here.

Details: `02-research/foundations-1596-1627.md`.

## Primary user + stakeholders

- **Tree** — first real-world user; her concrete household / community / mutual-
  aid needs are the design's anchor. Captured via `intake-prompt.md`.
- **Later users** — households with dependents, mutual-aid circles, open-source
  ecosystems funding their dependencies, care networks.
- **Owner** — alignment gate before design + before implement.

## Why a new roadmap item

See ROADMAP.md §"Why a new item" — all three creation-gate conditions
(full lifecycle, distinct star/users, blocks a user-visible outcome) hold.

## Definition of "research complete" (exit criteria for 02-research)

1. Prior-art corpus documented with sources. ✅
2. Foundations (1596/1627/trust) documented from code/branch reality. ✅
3. Design primitives distilled. ✅
4. `intake-prompt.md` ready for Tree. ✅
5. **GATE**: Tree's intake responses collected (or owner waiver) before
   `03-design/` opens.
