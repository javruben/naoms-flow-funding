# C3 accept-from-UI — REAL BUG (found on build1 multi-device runner, 2026-07-25)

## Milestone alongside this: C4 GREEN on build1 (real multi-device proof)
`e2e-flow-funding-wallet-receipt` PASSED on build1 (dedicated Linux runner):
`payee Activity feed rows: ["received 200 from z6Mki4X2y24A… · flow settlement"]`,
flow-settle leg confirmed paid on BOTH daemons, `ok | 1 passed`. The owner's core
requirement is proven on Mac AND build1.

## The bug (deterministic, host-independent — NOT env, NOT Mac co-tenancy)
`e2e-flow-funding-agreement-accept-ui` (C3) + `e2e-flow-funding-narrative` (C6) RED on
build1 across 3 runs incl. idle load 0.23:
- The puppeteer click on `[data-testid="flow-agreement-accept"]` emits **0**
  `flow.agreement_accept` WS requests to the daemon (0 `flow.agreement_accepted` events),
  vs 16 `flow.agreement_proposed`. Agreement stays `status:"proposed"`; never folds `active`.
- Verified NOT env: daemon-side fully wired (op manifest-operations.ts:129, handler
  agreement.ts:205, manifest.ts:122, namespace.ts:48); sibling `agreement_propose` (identical
  op shape) works; proposal replicates cross-peer fine; CSP allows inline handlers.

## Wiring traced (all looks correct — bug is subtle)
- Button: flow-tab.js:921-930 renders `data-testid="flow-agreement-accept"` +
  `onclick="agreementAccept('<agreementId>')"` from `incoming` proposals (filtered
  status==="proposed" && counterparty===self && a.agreementId truthy, loadVelocity:788).
- `agreementAccept(id)` flow-tab.js:621 → early-returns if `!id || typeof
  ctx.api.agreement_accept !== "function"` → else `ctx.api.agreement_accept({agreementId})`.
- `window.agreementAccept` bound in bindVelocityGlobals (615), called BEFORE loadVelocity
  in the velocity mount (599-600) — so it IS bound when the button renders.
- Test path: `_naoms.activateApp("flow-funding")` → `__flowShowSurface("velocity")` →
  waitForSelector(accept) [FOUND — so incoming had a valid agreementId] → page.click(accept)
  [click happened — test reaches pollAgreement, which then fails to converge].
- op `agreement_accept` (manifest-operations.ts:129) is structurally IDENTICAL to the
  working `agreement_propose` (method ws_message, pattern send, trustLevel owner, inputSchema).

## Where to look next (impl / instrumentation)
The click reaches a rendered button with a valid id + window.agreementAccept bound, yet no WS
send. Instrument in the LIVE browser (build1 2-daemon): log inside agreementAccept whether it
runs, whether `ctx.api.agreement_accept` is a function, and whether the WS send fires. Candidates:
(a) `ctx.api.agreement_accept` undefined in the browser feature ctx (ctx.api built from a
    filtered op set that excludes it despite the manifest) — compare how ctx.api enumerates ops;
(b) `page.click()` not firing the inline onclick (738: page.click skips pointer events — try
    page.$eval click() or mouse.move+down+up);
(c) agreementAccept runs but ctx.api.agreement_accept({agreementId}) sends a message the daemon
    doesn't count as a request (message-type/routing mismatch for pattern:"send").
Fix PROD (not the test). Re-verify C3 + C6 GREEN on build1 with the env recipe below.

## build1 CI env recipe (verified — for any manual multi-device run)
- `NAOMS_FFI_LIB_PATH=/root/dev/naoms/rust/target/release`
- `NAOMS_BROWSER_PATH=/root/.cache/puppeteer/chrome/linux-151.0.7922.34/chrome-linux64/chrome`
- `NAOMS_SKIP_DEFAULT_BROWSER_CHECK=1` (sanctioned headless-CI bypass; xdg-mime absent)
- `NAOMS_WITHDEVICES_BOOT_TIMEOUT_MS=240000` (4-core host, contended boot)
- symlink `<worktree>/tests/fixtures/state-seeds` → `/root/dev/naoms/tests/fixtures/state-seeds`
- copy from main into worktree (gitignored wasm): `clients/browser/public/wasm/naoms_wasm_bg.wasm`
  + `clients/browser/public/wasm/mls/naoms_mls_wasm_bg.wasm`
- watch RAM: build1 has 7.8GB / 4 cores; concurrent 3rd-party cargo builds OOM chrome (code 137) —
  wait for headroom, NEVER kill others' builds.
