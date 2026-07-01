// src/packages/flow-funding/domain/settlement-confirm-hook.ts — 1644 M-CONFIRM-ON-PUSH.
//
// Confirm-on-push reconciliation. When a flow-tagged `token.transfer` commits on the
// holon's token branch, record a `flow_settlement_confirm` node marking that
// settlement leg PAID. This resolves the cross-device settlement leg whose FROST
// 2-of-2 quorum ceremony legitimately exceeds epoch-settle's 15s gated-pay deadline
// (the settle response buckets it `indeterminate`, "MAY have committed; reconcile").
// The late transfer lands on the holon's OWN daemon (it is the ceremony initiator),
// firing this post-commit hook LOCALLY — so the operator's settlement record resolves
// to `paid` instead of a permanent `indeterminate`.
//
// Design (see 06-implement/D-M-CONFIRM-ON-PUSH-shape1-2026-07-01.md):
//   - Correlation rides `memo` (`flow-settle:<settlementId>`), a NON-MATERIAL pay arg
//     (core/ucan/delegation-chain.ts NON_MATERIAL_PAY_ARG_KEYS) — it reaches the
//     committed entry WITHOUT altering the leaf action_binding or tripping the B1
//     fail-closed gate. The claimant is the entry's `toDid`.
//   - GRAPH-ONLY, no chain emit: a post-commit hook MUST NOT `securedAppend`
//     (_writeLock deadlock, PC-788/PC-551).
//   - Confirm state lives on a DEDICATED `flow_settlement_confirm` node (id keyed by
//     settlementId+claimant), NOT as a property of `flow_settlement` — the generic
//     triple materializer full-puts `flow_settlement` on every replay and would
//     clobber a property there. The dedicated node is hook-owned, so it survives
//     backfill/replay regardless of cross-chain re-materialize order.
//   - Idempotent: deterministic node id + full-state upsert; re-firing on
//     push/backfill/replay re-writes the same node.

import type { PostCommitHookFn } from "@naoms/core/chain/post-commit-hooks.ts";
import { _graphPutAsync, graphQueryAsync } from "@naoms/core/graph";
import { enqueueGraphChanged } from "@naoms/core/transport/handlers/broadcast.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:settlement-confirm");

const TOKEN_BRANCH_PREFIX = "token-";
const MEMO_TAG = "flow-settle:";

/** Deterministic id for the per-leg confirm node — idempotent across re-fires. */
export function settlementConfirmNodeId(settlementId: string, claimant: string): string {
  return `flow-settle-confirm:${settlementId}:${claimant}`;
}

/** Unwrap a committed token entry payload. Tolerates the JSON-LD `@graph` wrap the
 *  generic triple materializer applies (mirrors token/domain/materialize.ts's
 *  module-private `_unwrapPayload`). Returns the inner entry object, or null. */
function unwrapTokenEntry(payload: string | null): Record<string, unknown> | null {
  if (!payload) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  // JSON-LD wrapped: { "@graph": [ { "naoms:token/entry": { "@value": "<json>" } } ] }
  const graph = o["@graph"];
  if (Array.isArray(graph)) {
    for (const g of graph) {
      const v = (g as Record<string, unknown> | null)?.["naoms:token/entry"];
      const val = (v as Record<string, unknown> | null)?.["@value"];
      if (typeof val === "string") {
        try {
          const e = JSON.parse(val);
          return e && typeof e === "object" ? e as Record<string, unknown> : null;
        } catch {
          return null;
        }
      }
    }
  }
  // bare: { entry: {...} }
  const entry = o.entry;
  return entry && typeof entry === "object" ? entry as Record<string, unknown> : null;
}

/**
 * Post-commit hook: on a flow-tagged `token.transfer` commit, record the settlement
 * leg PAID. Gate: `token-<id>` branch + `token.transfer` + a `flow-settle:` memo.
 * Best-effort + non-fatal (a confirm-cache miss must never wedge replication).
 */
export const _hook_flow_settlement_confirm: PostCommitHookFn = async (
  db,
  _chainId,
  branch,
  commit,
) => {
  try {
    if (!branch.startsWith(TOKEN_BRANCH_PREFIX)) return; // token branches only
    if (commit.type !== "token.transfer") return; // transfer commits only
    const entry = unwrapTokenEntry(commit.payload);
    if (!entry) return;
    const memo = typeof entry.memo === "string" ? entry.memo : "";
    if (!memo.startsWith(MEMO_TAG)) return; // flow-tagged pays only
    const settlementId = memo.slice(MEMO_TAG.length);
    const claimant = typeof entry.toDid === "string" ? entry.toDid : "";
    if (!settlementId || !claimant) return;

    const id = settlementConfirmNodeId(settlementId, claimant);

    // Idempotent no-op if already confirmed (re-fire on push/backfill/replay).
    const existing = await graphQueryAsync(db, { id });
    if (existing.error) {
      L.warn("settlement-confirm: read failed", { id, error: existing.error });
      return;
    }
    if (existing.nodes?.[0]?.properties?.status === "paid") return;

    await _graphPutAsync(db, {
      type: "flow_settlement_confirm",
      id,
      properties: {
        settlementId,
        claimant,
        status: "paid",
        // The on-chain witness that the gated pay rode REAL token.pay: the committed
        // token.transfer entry id + the amount moved (Honesty axiom — never a stub).
        transferEntryId: commit.id,
        amount: Number(entry.amount),
      },
    });
    enqueueGraphChanged(db, {
      affectedKinds: ["flow_settlement_confirm"],
      affectedIds: [id],
    });
    L.info("flow settlement leg confirmed paid (confirm-on-push)", {
      settlementId,
      claimant,
      transferEntry: commit.id,
    });
  } catch (e) {
    // Non-fatal: a confirm-cache miss must never wedge replication or the settle.
    L.warn("flow settlement confirm failed (non-fatal)", {
      branch,
      error: (e as Error).message,
    });
  }
};
