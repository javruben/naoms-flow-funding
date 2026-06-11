# 1644 Flow Funding — Mockup Index

**Item:** 1644 · **Phase:** 03-design · **Date:** 2026-06-12

These mocks are **binding ground truth for BUILD**. Each one is a self-contained HTML/CSS file using the 1627 wallet design tokens verbatim (dark theme, color variables, component patterns). BUILD re-implements from these mocks — not by gap-fixing a generic page. Per-M-row mock-fidelity gate applies: each surface is verified against the real daemon at the close of its implementation milestone.

---

## The four MVP surfaces (◆ — binding)

| File | Surface | Persona driver | Key affordance |
|---|---|---|---|
| `flow-agreement-creation.html` | Create a flow agreement | Tree (codified end) + Yara (relational end) | **Formality dial** — slider from relational trust-weight to codified revenue-share contract; reveals different field sets at each end |
| `flow-policy-config.html` | FlowPolicy per-(holon, context) | Simon | **Context switcher** + viability band + gradient curve picker + mechanism toggles (gradient/decay/demurrage) + commons tithe |
| `flow-velocity-view.html` | Flow river — the felt "river" view | Simon + Yara | **Gradient state hero** ("My cup is full" / "In deficit" / "Gradient band") + flows in/out + cascade preview |
| `flow-simulation.html` | Simulate a flow epoch before committing | Simon (demurrage experiment) | **Run simulation** → period table + balance trajectory comparison chart + demurrage labeled "Simulation only" throughout |

---

## Later surfaces (○ — not mocked; BUILD must acknowledge their existence)

- **Channel / trust-topology editor** — visual graph of trust channels, channel widths, who you're connected to and at what capacity. Rides the 030–031 trust graph. Not mocked; defer to a named M-row after MVP.
- **Pool surface** — create, seed, and govern a buffer pool or purpose pool (fills in good times, releases on conditions; one-time discharge for land purchase). Not mocked; requires pool primitive to land first.
- **Commitment-pool surface** — issue commitment → seed → swap → redeem → Trade Balance. The Grassroots Economics modality. Not mocked; post-MVP M-row, after MVP surfaces are verified.
- **Story-upstream / reflection capture** — the four questions + outcome transparency view; narrative accountability that sustains trust without revealing transaction detail. Not mocked; requires story chainType primitive.
- **Stewardship-hive flow view** — flow to a non-human entity (river, watershed, forest) governed as a stewardship hive; collective governance view for the hive's treasury. Not mocked; stewardship hive exists as State A substrate but the flow-to-earth UI is post-MVP.
- **Transparency / rent-leakage view** — outcome transparency + extraction-visibility (Compost Capital: see where value is leaking to extractive landlords/platforms so the network can collectively reduce it). Not mocked; post-MVP.

---

## Design-token source

All four mocks inline the 1627 wallet token set exactly:
- Colors: `--bg:#0d1117`, `--bg2:#161b22`, `--bg3:#21262d`, `--accent:#58a6ff`, `--green:#3fb950`, `--yellow:#d29922`, `--red:#f85149`, `--purple:#d2a8ff`
- Spacing: `--s1` through `--s6` (`.25rem` → `2rem`)
- Radii: `--r-sm` through `--r-full`
- Typography: `system-ui,-apple-system,sans-serif`

Flow-funding extension token: `--flow:#a5d6a7` (the "circulating" green, distinct from the wallet's `--green` which is used for confirmed/final states).

## Binding claim

These mocks are the specification. If a BUILD milestone produces output that does not match the mock's layout, copy, and component shapes, the mock-fidelity gate fails and the milestone does not close.
