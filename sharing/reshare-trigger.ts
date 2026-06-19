// src/packages/flow-funding/sharing/reshare-trigger.ts — 1644 M-TRANSPARENCY.
//
// Deterministic post-settle reshare trigger — closes a Honesty-axiom silent-drop
// in the reactive sharing path.
//
// The sharing-656 reactive reshare (`evaluateReshare`) DROPS a `graph.changed`
// that arrives while another reshare is inside its `_sharingSuppress` window:
// `sharing-engine.ts:166` early-returns under suppress WITHOUT buffering the
// kind, and `_flushReshare` does not re-scan for changes that landed during the
// window (no re-queue). So a `flow_settlement` that lands during a concurrent
// reshare flush — e.g. a settlement shortly after an opt-in `apply_decisions`,
// the realistic production sequence — would silently fail to reshare. The data
// is recovered on the NEXT reshare (build() aggregates all settlements), but a
// settlement that is the last trigger would never share — a silent drop.
//
// This guarantees a settlement reshares by deferring `evaluateReshare` until the
// suppress window clears (bounded retry), then firing it. It is idempotent with
// the reactive path: in the unraced case `evaluateReshare` already fired from the
// same `graph.changed`; re-buffering the same kind coalesces in the engine's
// debounce (a Set + 200ms window), so this never double-shares. Firing only the
// `flow_settlement` kind cannot self-loop: no sharing domain triggers on the
// reshare's own output kinds (share events / `sharing_domain` / `flow_outcome`).
//
// NOTE (root cause, flagged for sharing-656): the drop-under-suppress is a
// general reactive-path characteristic affecting every domain, not flow-specific.
// This trigger is the localized flow-funding guarantee; a root fix (buffer
// external triggers during suppress + re-flush) belongs in the sharing engine.

import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:reshare-trigger");

const RETRY_MS = 50;
const MAX_ATTEMPTS = 60; // ~3s cap — comfortably exceeds a normal flush window

/**
 * Fire-and-forget: ensure the just-committed settlement reshares the
 * `sharing.flow-funding` domain to direct peers, surviving the reactive path's
 * suppress window. Never throws into the caller; non-fatal if the sharing engine
 * is not initialized (boot race / non-sharing harness).
 */
export function triggerFlowReshareAfterSettle(
  db: bigint,
  settlementId: string,
): void {
  let attempts = 0;
  const fire = (): void => {
    void (async () => {
      try {
        const { evaluateReshare, isSuppressed } = await import(
          "@naoms/packages/sharing/engine/sharing-engine.ts"
        );
        if (isSuppressed() && attempts < MAX_ATTEMPTS) {
          attempts++;
          setTimeout(fire, RETRY_MS);
          return;
        }
        evaluateReshare(
          db,
          new Set(["flow_settlement"]),
          new Set([settlementId]),
        );
      } catch (e) {
        L.debug("flow reshare trigger skipped (engine unavailable)", {
          error: (e as Error).message,
        });
      }
    })();
  };
  setTimeout(fire, 0);
}
