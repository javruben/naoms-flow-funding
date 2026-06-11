---
item: 1644-flow-funding
phase: 03-design
persona: tree-willard
source: intake-responses/tree-2026-06-10.md (real user)
authored: 2026-06-12
---

# Persona: Tree Willard

## Who she is

Tree is a founder and ecosystem architect building three interlocking organizations: NAO (the memory and coordination protocol), Care Circles (a therapeutic community franchise model), and ReWoven (a documentary series). She is not building products for herself — she is building infrastructure for the ecosystems she stewards. Her personal income is an output of those systems, not the starting point.

She thinks in terms of "the resource flow tree" — a phrase she used unprompted. She wants every company she builds to operate with flow funding at the governance layer, distributing value to contributors she may never meet.

She is enthusiastic about automation and deeply committed to relational clarity before automation runs. The negotiation IS the control mechanism. "All agreements need to be explicit and clear from the start. No work without clearly negotiated terms."

## Context

- Multi-organization founder; five income streams (salary from active work, revenue-share residuals from projects she built, book sales, speaking, card deck)
- Career trajectory: salary-heavy now → residual-heavy over time; the system must honor this arc without reconfiguration
- Contributor taxonomy: (1) Founding contributors — permanent revenue share, no expiration; (2) Active contributors — flow while active, diminishes on departure; (3) Time-limited contributors — contract governs exactly
- Full transparency is non-negotiable: all flows visible to all participants
- Does not frame herself as a top-down distributor — she is a node in the ecosystem; she expects flow back when she needs it

## Emotional starting state

Relief when she encounters flow funding. She has been trying to hold this architecture in her head, in spreadsheets, in informal understandings. The idea of a system that executes what was agreed without her managing it manually is exactly what she has been looking for. Her anxiety is not "will this take from me" — it is "will this be ambiguous." If the system can represent a negotiated agreement faithfully and execute it automatically, she will trust it deeply.

## Job to be done

**When** she finishes negotiating a contribution agreement (e.g., a founding-team revenue-share, a consultant IOU, a season-1 salaried contributor with negotiated residuals), **she wants** to encode exactly those terms in one flow agreement — the formality dial at the codified end — so that the system executes what was agreed across the lifetime of the organization, without her tracking it manually or managing individual payments.

Secondary: **When** a contributor drifts away from the ecosystem, **she wants** the flow to diminish naturally (activity-based decay) without requiring an explicit termination — so that the system mirrors what the relationship actually became, not what was formalized.

## 07-verification goal

**Tree sets up a codified revenue-share flow agreement with a named founding contributor (encoded as: 2% of NAO revenue, founding tier, no expiration, full transparency), watches a simulated 6-month epoch showing how the agreement would have executed against a synthetic revenue stream, then inspects the resulting flow ledger to confirm the agreement's terms — not just that value moved — are represented faithfully.**

This is testable: the verification passes when (a) the flow-agreement creation form accepts the exact terms Tree negotiated (tier = founding, % = 2, expiry = none, transparency = full), (b) the simulation surface shows a plausible 6-month epoch with per-period disbursements, and (c) the flow ledger entry carries the agreement reference, not just an amount.
