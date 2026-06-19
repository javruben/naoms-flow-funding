# M-TRANSPARENCY build plan + reuse-surface map (2026-06-19)

Frozen-plan spec: `05-align/frozen-plan.md:186-208`. Local-first flow outcome
transparency. **REUSE sharing-656 + Biscuit; build NO new auto-sharer; NO central
transparency service (HC-07).** Gate: `integ-flow-transparency-local-first`
(T-25/26/27) + `e2e-flow-transparency-cli` (T-26e).

## Files in scope (frozen-plan)
- `src/packages/flow-funding/sharing/flow-domain.ts` — register the flow domain.
- `src/packages/flow-funding/sharing/biscuit-nhop.ts` — N-hop Biscuit caveat enforce.
- `src/packages/flow-funding/tests/integ-flow-transparency-local-first.test.ts`
- `src/packages/flow-funding/tests/e2e-flow-transparency-cli.test.ts`

## Reuse API surface (verified by Explore 2026-06-19, exact cites)
1. **Register a sharing domain** = `domainRegistry.register(domain: RegisteredDomain)`
   at `src/packages/sharing/engine/domain-registry.ts:51`. (NOT literally
   "registerDomain".) Mirror the built-in `src/packages/sharing/sharers/sharer-location.ts:14`
   `SHARER_LOCATION_MANIFEST` (SharerPluginSection) + `sharer-registration.ts:238`
   `registerBuiltinDomain({manifest, pluginId, mod})` → `manifestToRegisteredDomain`
   → `domainRegistry.register`.
   - `RegisteredDomain` fields: `key` ("sharing.flow-funding"), `label`, `levels[]`
     ({key,label,ordinal}), `defaultLevel`, `defaultTerms` (per-level ContractTerms
     incl. `maxHops`, `allowRedistribution`, `requireAttribution`, `onRevoke`,
     `llmPolicy`), `triggerKinds` (["flow_settlement"]), `readTypes`,
     `writesNodeTypes` (["flow_outcome"]), `perConnection`, `pluginDid`
     ("did:builtin:flow-funding"), `pluginId`, `suspended`.
2. **Auto-share to a direct peer** = `triggerAutoShare(args)` at
   `src/packages/sharing/engine/auto-share.ts:36` → `Promise<number>`. args:
   `{dbHandle, connectionId, chainId, peerDid, rcardId, domainOverrides?, deps?,
   options?}`. Creates `sharing_domain` graph nodes, appends `friendship.share.config`
   consent receipt, delegates to engine `initialShare`. Fires per-peer at handshake
   (`connect/handlers/auth.ts respondHandshakeInternal`) + hive join
   (`triggerHiveAutoShare` auto-share.ts:289). "Direct relationships" = the existing
   `sharing_domain` outbound nodes per peer.
3. **N-hop forward (sharer-friends)** = `buildForwardedPeerRCard(ctx, friendDid)` at
   `src/packages/sharing/sharers/sharer-friends.ts:217` — reads friend's `peer_rcard`
   `max_hops_remaining` (l.241), returns null if `<=0` (l.259, silent skip),
   else `attenuate(contractHex,{max_hops: nextHops}, rootPubHex)` (l.265).
4. **evaluateReshare** = `src/packages/sharing/engine/sharing-engine.ts:161`
   `evaluateReshare(db, affectedKinds:Set, _affectedIds:Set):void` — matches affected
   kinds vs domains' triggerKinds, 200ms debounced reshare (l.197); called from
   `flushGraphChanged()` in ws-sync.
5. **Biscuit** = `src/packages/packs/biscuit-contract.ts`:
   - `buildDefaultContract(terms:DefaultTerms, rootPrivHex):BuildResult` (l.373) —
     mint root w/ `max_hops` caveat. DefaultTerms (l.133): `max_hops?` (0=unbounded),
     `allow_redistribution?`, `require_attribution?`, `llm_policy?`, `on_revoke?`,
     `required_attestations?`.
   - `attenuate(tokenHex, newTerms, rootPubHex):BuildResult` (l.436) — decrement hops.
   - `verify(tokenHex, rootPubHex, verifyContext):VerifyResult` (l.486) — fail-closed.
   - **GAP = my add:** `attenuate` IS wired (sharer-friends), but `verify()` is NOT
     yet called on the reshare path. M-TRANSPARENCY adds the verify/refuse check
     (biscuit-nhop.ts) so out-of-scope N-hop reshare is REFUSED (T-25/T-27).
6. **flow-funding emit point** = `handlers/epoch-settle.ts:160` (after the
   `flow.epoch_settled` securedAppend, ~l.170 post-log). Trigger auto-share of the
   settlement outcome to the holon's direct relationships (read its outbound
   `sharing_domain` nodes for domain "sharing.flow-funding").
7. **Test model** = `src/packages/sharing/tests/integ-sharing-auto-share-fresh-handshake.test.ts`
   (2-daemon spawnPair + pairPeers; assert `sharing_domain` rows > 0 = mechanism
   fired; theatre-check: short-circuit → 0 rows → fail). Model integ on this; assert
   forwarded `peer_rcard.max_hops_remaining` decremented = attenuate ran (T-27), and
   verify-refusal when hops exhausted (T-25).

## Build order (RED-first, mechanism-asserted per Honor + frozen-plan)
1. `sharing/flow-domain.ts`: define FLOW_FUNDING domain manifest (levels off/summary/
   detailed; defaultTerms maxHops:2; triggerKinds ["flow_settlement"]) + register via
   the sharing-656 registration path. Wire into flow-funding `register.ts` boot.
2. Emit hook in `epoch-settle.ts`: after flow.epoch_settled, triggerAutoShare to each
   outbound direct relationship for the flow domain (reuse — NO new auto-sharer).
3. `sharing/biscuit-nhop.ts`: on reshare, `verify()` the Biscuit caveat (hop-count +
   scope); REFUSE out-of-scope reshare (T-25/T-27). Wire the check into the reshare
   path (evaluateReshare/_flushReshare or the sharer-friends forward).
4. `integ-flow-transparency-local-first.test.ts` (2-daemon, RED→GREEN): T-26 direct
   auto-share GREEN; T-27 reshare attenuated (max_hops decremented); T-25 out-of-scope
   reshare REFUSED. Mechanism-assert sharing_domain rows + Biscuit verify counter.
   Run on build-host (MBP flow-integ-forbidden).
5. `e2e-flow-transparency-cli.test.ts` (T-26e).

## Constraints
- Reuse, do NOT rebuild (HC-07 / non_goals). Local-first, no central service. ZK post-MVP.
- M6 land HELD for owner's explicit authorize (standing instruction); M-TRANSPARENCY
  builds in parallel meanwhile (economics-confirmed). Branch 1644-flow-funding tip
  3b91a4853a4. Sibling worktree 1644-redesign-correct must be cascade/retired before
  any MQ submit.
