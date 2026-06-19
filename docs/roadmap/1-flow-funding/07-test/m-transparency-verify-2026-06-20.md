# M-TRANSPARENCY — verification state (2026-06-20)

Branch `1644-flow-funding` tip `fa3bd8807ff` (pushed). Mechanism PROVEN; T-26e CLI
leg blocked on a foreign-surface namespace collision (see below).

## Production (committed)
- `sharing/flow-domain.ts` — `sharing.flow-funding` sharer plugin: manifest
  (levels off/summary/detailed, defaultLevel off, maxHops 2, triggerKinds
  `["flow_settlement"]`) + build (reads own flow_settlement → level-scoped outcome
  + mints Biscuit cap + relays in-scope received outcomes) + materialize (writes
  per-peer flow_outcome incl. cap fields + relayed outcomes) + revoke. Commit
  `79f91586b61` (domain) + `da731f3b792` (biscuit wiring).
- `sharing/biscuit-nhop.ts` — Biscuit capability lifecycle: mintFlowShareCapability
  (fresh ed25519 root, max_hops budget) + authorizeReshare (verify()+REFUSE /
  attenuate; Biscuit caveat is sole authority, fail-closed). Commit `da731f3b792`.
- `register.ts` — registers domain + `friendship.share.flow-funding` dispatch
  enricher at boot via sharing-656 registerBuiltinDomain +
  registerDomainDispatchEnrichers (cross-package per contacts precedent).
- `sharing/reshare-trigger.ts` + `handlers/epoch-settle.ts` — deterministic
  post-settle reshare (triggerFlowReshareAfterSettle), fixes a real Honesty-axiom
  silent-drop: reactive evaluateReshare DROPS a flow_settlement landing in another
  reshare's _sharingSuppress window (sharing-engine.ts:166, no re-queue). Commit
  `fa3bd8807ff`. NOTE: root suppress-drop is a general sharing-656 issue (all
  domains) — economics tracking for a 656 M-row; my localized fix covers flow.

## Tests GREEN
- unit `uc-flow-domain-build-materialize` (6) + `uc-flow-biscuit-nhop` (4) = 10/10
  REAL Biscuit FFI on MBP. Covers T-25 refusal + T-27 relay attenuation (2→1) +
  capability mechanism + level-gating + relay drop-of-spent.
- integ `integ-flow-transparency-local-first` 7/7 on build-host (HEAD fa3bd8807ff):
  fresh spawnPair+pairPeers (live signer-key install — dissolves stale-fixture
  cross-peer block), T-26 direct (bob receives flow_outcome, total_flowed 600 =
  2-epoch aggregate, contract non-empty, max_hops_remaining 2, source received),
  + RACE step (opt-in→settle no-spacing still delivers via deterministic trigger —
  does NOT mask the suppress race).

## T-26e (CLI e2e) — BLOCKED (foreign surface), routed to economics
`e2e-flow-transparency-cli.test.ts` authored + deno-check clean, RED + UNCOMMITTED.
Blocker is NOT pairing (pairing succeeds). `naoms flow` is owned by kronos
`flowCommand` (sdk/cli/commands/flow.ts:244, sole handler at cli.ts:578), allowlist
`trigger|list|create|update|delete|runs|plugins`; flow-funding operation-derived
verbs (policy-set etc) fall to usage-print+exit0 — unreachable since kronos 1557.
Also blocks M2 T-03e. Options A (sdk/cli op-fallthrough, preferred) / B (flow-funding
renames CLI ns) / C (scope to WS integ). Awaiting economics ruling. Do NOT commit a
red/ignore-gated e2e (theatre). Green it once the namespace is resolved.

## Cross-peer note
The "1593 block" was a stale-pre-paired-fixture artifact, NOT a current platform
gap — fresh pairPeers converges signer peer-keys live on this base. No main-absorb
needed (branch is 2777 behind; fine to leave for now).
