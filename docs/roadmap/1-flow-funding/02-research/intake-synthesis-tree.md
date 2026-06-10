# Intake Synthesis — Tree → Design Influence (02-research)

**Item:** 1644 · **Date:** 2026-06-10 · **Source:**
`intake-responses/tree-2026-06-10.md` (Tree Willard, facilitated by Claude/Meri)

> Pre-design input, not design. DESIGN (`03-design`) stays gated on Simon's
> architecture intake + owner alignment. This records how Tree's responses move
> the design so the influence isn't lost between phases.

## The headline: Tree reframed the unit of design

Tree did not answer the questionnaire we wrote — she **corrected its premise**,
in her own words:

> "I'm not actually certain that this approach is what the questionnaire is
> wanting from me. I actually want every company that I'm a part of creating to
> operate with flow funding to people I don't even know."

Our intake (and the research draft) framed flow funding as a **personal,
node-centric threshold tool**: a person sets a floor/ceiling, surplus overflows
to dependents, support pulls in below floor, demurrage forces circulation. Tree's
lived need is **organization-centric revenue architecture**: every company she
builds (NAO, Care Circles, ReWoven) distributes its revenue, automatically, to
everyone who contributed to creating it — including people she's never met. Her
personal income is an **output** of those systems, not the root of them.

This is the single most important finding. It moves the design's center of
gravity from "the wallet" to "the organization's revenue stream and its
contributor tree."

## What changes in the design (load-bearing shifts)

1. **Unit: organization/project revenue stream, not personal node.** The primary
   object is a project that earns revenue and splits it down a **"resource flow
   tree"** of contributors. Personal wallet (1627) is a *leaf*, not the root.
   Design the org surface first; personal income falls out of it.

2. **The contract IS the flow spec.** Tree's most elegant, load-bearing insight:

   > "Perhaps the math on the contracts actually defines the expiration dates and
   > the amounts should be negotiated first."

   The core primitive is therefore a **negotiated revenue-share agreement**, not
   an abstract floor/ceiling policy. A contract carries: parties, share % (or
   amount), duration / expiry-math, tier, and any repayment (IOU) terms. The
   system **reads the contract and executes it**. This maps cleanly onto NAOMS's
   agreement-centric worldview (Honor Rule; 1633's "explicit, auditable
   agreement"; the token package's `MintingAgreement`; the 040–042 consent/VC/
   ocap stack). **→ Build a contract-to-flow pipeline, not a generic threshold
   engine.**

3. **Cascade / splits is confirmed central (Drips model wins).** "Resource flow
   tree" = revenue cascading down contribution lineage to everyone who touched
   creation, arbitrarily deep, including communities filmed and practitioners who
   attended circles years ago. This is exactly the Drips splits+cascade primitive
   from the research — now **confirmed by a real user**, not just inferred.

4. **Decay is activity-based entitlement decay, not balance demurrage.** Tree's
   river metaphor — *"who stays in the river over time are the ones who stay in
   the river"* — describes a **claim that fades as participation fades**, not a
   parking-fee on idle money. This is a *different mechanism* from Gesell/Circles
   demurrage (which decays a held balance). Founders are **exempt** (permanent
   share). **→ Two distinct decay concepts may both exist:** (a) activity-decay
   on contributor *entitlements* (fairness/"stay in the river"), (b) Gesell-style
   demurrage on idle *balances* (anti-hoarding, owner's brief). Do not conflate
   them.

5. **Contributor tiers are first-class.** Three roles, each with a different flow
   rule: **Founders** → permanent revenue share, no expiration; **Active
   contributors** → flow while active, diminishes on departure (activity-gated);
   **Time-limited** (consultants/seasonal) → contract-expiry governs. The tier
   determines the decay/expiry behaviour.

6. **IOU / repayment is a required primitive, with a real first case.** ReWoven
   pilot consultants: ~$20k repaid via 1–2% revenue share until cleared. The
   token package already has an **`iou` kind** (foundations note: "expiry posture,
   not yet fully wired") — 1644 is its first concrete consumer. A repayment is a
   negative-until-cleared claim serviced by a revenue-share stream.

7. **Transparency by default — a hard departure to reconcile.** "All flows should
   be transparent. Everyone can see everything." This pulls **against** NAOMS's
   encrypted-by-default posture and against the privacy concern in our research.
   It is also internally tense with anonymous/unknown recipients (a practitioner
   from a circle two years ago). **→ Design question, not a settled answer:**
   transparency of the *flow graph and terms* vs. privacy of *identities and
   amounts*; ecosystem-wide vs. relationship-scoped visibility.

8. **Temporal arc: salary → residual.** Five income streams (salary, revenue
   share, book, speaking, cards) shifting from salary-heavy now to residual-heavy
   later — "work less and less for salary, more and more from residual." The
   system should **model flows that evolve over time**, not just static splits.

## Reconciliation with the owner's original brief

The owner's brief: *"income to flow to dependents **and from other dependents**…
thresholds… building strong relationships, fairness, prevent hoarding."* Against
Tree's intake:

- **Confirmed by Tree:** outflow to dependents (✓ strongly — the whole frame),
  fairness (✓ via tiers + contracts), prevent hoarding (✓ "de facto
  redistribution," her phrase, unprompted), building relationships (✓ negotiation
  in relationship is her trust mechanism).
- **Reframed by Tree:** "thresholds" → **contract terms** (negotiated %, duration)
  rather than floor/ceiling set points; "demurrage" → **activity-decay** of
  entitlements rather than (or in addition to) balance-demurrage.
- **NOT surfaced by Tree:** the **"and from other dependents" / pull-in-below-
  floor** reciprocal direction. Tree named no floor and expressed no drain/
  scarcity fear; her frame is abundance and outflow. ⟨The owner's brief wants the
  reciprocal direction; the first real user did not ask for it. Keep it as an
  owner-driven requirement, but its priority and concrete shape are now an open
  question — possibly a later tier of the design, or a different user's need.⟩

The philosophy still holds: Tree's "river" and "de facto redistribution" are the
**holomovement / Flow-Funding ethic** (flow is primary; the carrier is nourished
by staying in the flow). What changed is the *mechanism*: contract-driven revenue
splits + activity decay, not homeostatic floor/ceiling control.

## Updated reuse map (Rule 8)

| Tree's need | Existing substrate to lean on |
| --- | --- |
| Revenue-share cascade ("resource flow tree") | Drips-style splits (design primitive) over token `token.pay` transfers (1596) |
| Contract-as-spec | token `MintingAgreement` + 040–042 consent/VC/ocap; new "revenue-share agreement" type |
| IOU repayment (ReWoven $20k) | token **`iou` kind** (1596) — first real consumer; wire expiry/repayment |
| Activity-decay of entitlements | trust-propagation decay (031) as a model; new entitlement-decay rule |
| Tiers (founder/active/time-limited) | trust-graph roles/edges (030) + contract tier field |
| Transparency | departs from encrypted default — **new** disclosure policy needed |
| Per-person income view + arc | wallet UI (1627) extended with multi-stream + over-time view |

## Open questions this intake raises (for owner / Tree / Simon)

Carried from Tree's facilitator + my analysis. Simon's architecture intake should
be read directly against these.

1. ReWoven pilot IOU (~$20k, 1–2%): per-consultant or collective founding amount?
2. **Floor / pull-in:** does Tree want it at all? Owner's brief does. Resolve
   priority. (Possibly a different user surfaces this need.)
3. Protected money / savings (the land, emergency) vs. the keep-moving principle.
4. Delegation: who acts for Tree when ill/travelling?
5. **Transparency semantics:** ecosystem-wide vs. relationship-scoped; identities
   vs. terms vs. amounts. How does it work for anonymous recipients?
6. Scarcity allocation: when surplus can't reach everyone at once, what rule?
   (This is where research's **quadratic/fairness weighting** may apply.)
7. Protection for quieter/overlooked contributors.
8. **For Simon specifically:** is "contract-as-executable-flow-spec" the right
   core primitive? How do org-level revenue cascade + activity-decay + the two
   decay mechanisms (entitlement vs balance) compose cleanly? Does the org-centric
   reframe change the chainType decision (a `flow`/`org-revenue` chain vs reusing
   `token`)?

## Status

- Tree intake: **received + synthesised.**
- Simon intake (`intake-prompt-simon.md`): **pending** — his architecture is
  meant to resolve several questions above (core primitive, decay composition,
  transparency model, chainType).
- DESIGN gate: **still closed.** Opens after Simon + owner alignment. This synthesis
  is the brief DESIGN will build from.
