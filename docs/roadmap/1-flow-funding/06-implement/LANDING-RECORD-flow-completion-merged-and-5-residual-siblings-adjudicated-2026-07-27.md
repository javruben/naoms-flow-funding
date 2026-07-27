# 1644 — landing record: `flow-completion` merged + 5 residual siblings adjudicated

**Date:** 2026-07-27 (record written 2026-07-27T2154Z, `date -u` read as its own step)
**Author:** 1644 member, Desk 6 (sdk-packages-boundaries)
**Trigger:** owner DIRECT ORDER 2026-07-27T2028Z — "everything unmerged dies at cutover; merge it
for real." Residual assessment requested by the sdk-packages-boundaries QM at 2026-07-27T2151Z.

This record is scoped to the cutover landing only. **It changes no milestone status.** M6/M7/M8
remain `⏳` in `ROADMAP.md` — this work landed one branch, it did not complete the epic.

## 1. `1644-flow-completion` is MERGED on `origin/main`

- **Merge commit `85ecf624906`** — "Merge branch '1644-flow-completion'".
- **Fix commit `8fad9c542bc`**; branch tip merged `21085a6d0cf` (+28 commits).
- Gate: `owner-approval` (the owner's merge-everything directive as class authority).
  No bypass, no `--strategy` override; pre-push gates ran and passed.
- Real-merge proof: `8fad9c542bc` and `21085a6d0cf` both `--is-ancestor` of `origin/main`;
  merge commit has two parents (`8f64472818a 8fad9c542bc`); **merge tree ≠ first-parent tree**
  (the decisive check — a content-discarding merge would have produced a tree identical to the
  first parent).

### The fix — C7 tokenId guard reconciled with its sibling harness

**No production file was changed. No assertion was loosened.**

The branch's C7 commit (`344bfa87779`) added a guard in `savePolicy`
(`src/packages/flow-funding/ui/flow-tab.js`) refusing to dispatch without a real `state.tokenId`,
so the UI can never leak the `"custom"` kind label into `policy_set` (a policy armed on `"custom"`
moves no value — `token.pay` refuses `paid:0`). **That guard is correct and untouched.**

What was never reconciled was the sibling test harness. `uc-flow-controls-no-drop.test.ts`'s
`mount()` built a feature ctx of `{container, api}` — **a shape production cannot produce**:
`clients/browser/public/feature-context-factory.js:84-85` *throws* when `sendReq` is absent.
Without `sendReq`, `loadTokens()` cannot reuse the `token.list` op, `state.tokenId` stays `null`,
and `savePolicy` short-circuits before dispatching, making every downstream no-drop assertion
unreachable.

The fix supplies the `ctx.sendReq` production always wires, serving `token.list` from one held
token — mirroring exactly what the C7 author had already done to the other harness
(`uc-flow-policy-surface-wired.test.ts:137-146`). That file was simply missed.

**Guard protection preserved:** `savePolicy` still refuses on an empty holding, and that refusal
stays asserted green by `C7 empty-state` in `uc-flow-policy-surface-wired.test.ts`
(`policy_set` count `0`, no `"custom"` leaked).

**Correction to the intake framing:** it was **5 RED, not 2** — all in one file, all the same root
cause (`policy_set dispatched (band valid)` → `0 != 1`): C5/G6 felt-threshold, C5/G7 commons-tithe,
C5/G8 transparency, C5/G10 fairness caps, and the CRITICAL automated-settlement cap.

### Floor evidence (measured on the MERGE RESULT, narrowed per-file)

Branch `8fad9c542bc` ⊕ `origin/main` `9bbc31e4f89`; `git merge-tree --write-tree` bare rc=0.

**28 passed / 0 failed** across `uc-flow-controls-no-drop`, `uc-flow-policy-surface-wired`,
`uc-flow-agreement-accept-wiring`, `uc-1644-subscribe-relays-flow-fields`,
`uc-1644-flow-sent-receipt`, `uc-1644-token-event-flow-fields`,
`uc-1644-wallet-receipt-attribution`, `integ-wallet-receipt-jsonld-projection-subscribe`.
`deno check` bare rc=0.

**Pre-existing RED, NOT introduced and NOT fixed here:** `e2e-flow-funding-*` remain red pending
the multi-device Kronos runner (per the branch's own head-state, `61fd5d80ea3` / `371c844af90`).

## 2. Five residual 1644-era sibling branches — ALL SUPERSEDED

Content-assessed against `origin/main` @ `85ecf624906`. **Zero cascade-merges were needed.**
Nothing retired, nothing deleted — disposal is the convergence-owner's call.

| Branch | Unique | Verdict |
| --- | --- | --- |
| `1644-matrix-package-2026-06-09` | +15 | SUPERSEDED |
| `1644-real-matrix-e2e-v2-2026-06-13` | +15 | SUPERSEDED (identical 15 SHAs) |
| `1644-w3-bridged-inbound-2026-07-03` | +5 | SUPERSEDED |
| `1567-canary-fix-plugins-lifecycle-fm-2026-05-24` | +1 | SUPERSEDED |
| `1644-w1-login-failmode-mechassert-2-2026-06-16` | +1 | SUPERSEDED (verbatim on main) |

`git cherry` overstated this because the work landed under **three renames**: package
`adapter-messaging/` → `messaging-adapters/`; rules `PC-1622/1623/1624/1625` →
`PC-843/860/846/847`; test tier `integ-matrix-login-…` → `uc-matrix-login-…`. Commit identity was
the wrong instrument; file/symbol content is the right one.

Evidence per branch:

- **matrix-package / real-matrix-e2e-v2** — 11/11 implementation files present under the renamed
  package; main carries **201** files under `messaging-adapters/tests/` vs the branch's 20; all 8
  sampled `uc-matrix-*` tests present. The renumber is documented *by main itself* in
  `rules-registry-ext4-1660-w2-virtual-channels.ts`. Main additionally has `*-failure-mode` pairs
  for PC-846/847 that the branch never had.
- **w3-bridged-inbound** — main's `handlers/subscribe.ts` is a superset: 366 lines vs 181, denser
  on every load-bearing symbol (`bridge_channel_mapping` 10 vs 3, `consent` 22 vs 8,
  `ConsentRequired` 7 vs 4).
- **1567-canary** — main carries the same 1482 contract and the same `PLUGIN_NOT_FOUND` code,
  **plus** an `isAdapterPlugin()` check the branch version lacks.
- **w1-login-failmode** — the 1594 mechanism assertion (`onSpawn` → `pid > 0`) is on main
  character-identical, `@mechanism-asserted` header included.

**Merging the matrix branches would REGRESS main, not merely add nothing.** They register
`PC-1622..1625` with `"status": "live"` in `rule-id-registry.json`; main runs **PC-819**
(`no-roadmap-shaped-rule-id`), which fires on any live rule id ≥ 1000 — re-introducing exactly the
pollution class item 1658 renumbered away. The branches' own
`tests/evidence/real-matrix-e2e-RED-2026-06-13.txt` also records that e2e as RED
(`rc=3`, `NetworkNotRegistered`).

## 3. OPEN — two-daemon integ coverage gap (flagged for convergence, not closed)

Six two-daemon integ tests exist on the matrix branches with no same-named counterpart on main:
`integ-virtual-channel-two-daemon{,-failure-mode}`,
`integ-1659-epic-virtual-channel-inbox-roundtrip-two-daemon{,-failure}`,
`integ-matrix-virtual-channel-roundtrip-two-daemon{,-failure-mode}`.

🟡 **UNVERIFIED:** whether they would pass against today's main. **I did not run them.**

Context that argues this is a coverage question rather than lost value: main already has 13
virtual-channel tests plus `tests/integ-matrix-inbox-chain-rate.test.ts` and
`tests/uc-matrix-soft-cap-refusal.test.ts` — it is the *two-daemon dimension specifically* that has
no counterpart; the branches' own commit log says "W1..W3 DEFERRED with handoff state"; and item
1394 tracks `REGISTER-BUG-peerpair-fixture-namepublish-ws-timeout-blocks-two-daemon-tests`, a known
fixture blocker for two-daemon runs. QM accepted this framing and filed it upward.

## 4. Fleet-useful trap found on the way

A merge-result run read **9 failed** that was **not** a branch defect — a **dylib / TS symbol-table
mismatch**. Merged-main's FFI TS demanded `naoms_db_execute_params_blob` (main's `737fef0819e`, not
on the branch); the branch-tip warm dylib lacked it. Repointing `NAOMS_FFI_LIB_PATH` at a second
warm worktree surfaced a *different* missing symbol (`naoms_bbs_proof_gen`). Only a dylib carrying
**both** gave the true reading (28/28).

**A warm worktree is necessary but NOT sufficient — the dylib must match the MERGED tree's symbol
table.** This failure presents as a convincing code regression. What proved it environmental: the
branch touches **zero** files under `rust/` and `src/core/ffi/`.
