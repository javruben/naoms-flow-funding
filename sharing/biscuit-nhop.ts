// src/packages/flow-funding/sharing/biscuit-nhop.ts — 1644 M-TRANSPARENCY.
//
// The N-hop capability for flow-outcome transparency (T-25/T-27). REUSE of the
// packs Biscuit data-contract (1101): a flow outcome shared to a direct peer
// carries a Biscuit token whose `max_hops` caveat bounds onward redistribution.
//
// `attenuate` (hop decrement) was ALREADY wired in sharing for forwarded
// peer_rcards (sharer-friends.ts:265). The GAP this file closes is the
// `verify()` GATE on the reshare path: before a node forwards a received flow
// outcome one further hop, it MUST verify the caveat still permits redistribution
// at the current hop count — and REFUSE (fail-closed) when the budget is spent or
// the token denies. Without this, attenuation alone is advisory: a misbehaving
// peer could forward past the authorized scope (T-25). The gate makes the bound
// enforced, not merely declared.
//
// Pure capability lifecycle — no graph/daemon deps. The flow sharer (flow-domain.ts)
// mints on the direct share and calls `authorizeReshare` before forwarding.

import {
  attenuate,
  buildDefaultContract,
  verify,
} from "@naoms/packages/packs/biscuit-contract.ts";

/** The redistribution budget minted onto a direct flow-outcome share. */
export const FLOW_SHARE_MAX_HOPS = 2;

/** A minted flow-share capability: the token + the root pubkey to verify it. */
export interface FlowShareCapability {
  /** Hex-encoded Biscuit token carrying the `max_hops` caveat. */
  tokenHex: string;
  /** Hex-encoded ed25519 root public key the verifier checks the token against. */
  rootPubHex: string;
  /** Hops still permitted by this token (mirrors the live caveat for the node). */
  hopsRemaining: number;
}

/**
 * Mint a fresh flow-share capability bounding onward redistribution to `maxHops`.
 * A new ed25519 root keypair is generated per share — the private key never
 * leaves this call (the token + public key travel with the data; the private
 * key is zeroized). Returns null fail-closed if the Biscuit FFI is unavailable
 * or the build fails — the caller then shares WITHOUT a reshare capability, i.e.
 * direct-only (the privacy-preserving baseline).
 */
export function mintFlowShareCapability(
  maxHops: number = FLOW_SHARE_MAX_HOPS,
): FlowShareCapability | null {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  let privHex = "";
  for (let i = 0; i < seed.length; i++) {
    privHex += seed[i].toString(16).padStart(2, "0");
  }
  try {
    const built = buildDefaultContract(
      {
        max_hops: maxHops,
        allow_redistribution: true,
        require_attribution: true,
        llm_policy: "local_only",
      },
      privHex,
    );
    if (built.status !== "OK" || typeof built.root_public_key_hex !== "string") {
      return null;
    }
    return {
      tokenHex: built.token_hex,
      rootPubHex: built.root_public_key_hex,
      hopsRemaining: maxHops,
    };
  } finally {
    seed.fill(0);
  }
}

/** Outcome of an N-hop reshare authorization check. */
export type ReshareDecision =
  | { ok: true; next: FlowShareCapability }
  | { ok: false; reason: string };

/**
 * GATE a one-hop reshare of a received flow outcome (T-25/T-27).
 *
 * The Biscuit caveat is the SOLE authority — there is no JS shadow-counter that
 * could mask it. The token's `max_hops` is its remaining redistribution budget;
 * the Rust caveat is `check if current_hops($h), $h < max_hops`
 * (biscuit_ffi.rs). Passing `current_hops: 0` asks "does this token still
 * authorize one more hop?": ALLOW iff `0 < max_hops` (budget remains) AND
 * redistribution is permitted. Fail-closed (DC-02): a spent budget
 * (`max_hops == 0`), a redistribution-forbidding token, or a malformed/tampered
 * token all DENY — the outcome is NOT disclosed past its authorized scope.
 *
 * On ALLOW, attenuate the token (`max_hops` − 1, monotonic tightening) so the
 * forwarded copy carries a strictly smaller budget for the next hop.
 */
export function authorizeReshare(
  cap: FlowShareCapability,
): ReshareDecision {
  if (!cap.tokenHex || !cap.rootPubHex) {
    return { ok: false, reason: "NO_CAPABILITY" };
  }

  const v = verify(cap.tokenHex, cap.rootPubHex, {
    redistribute_requested: true,
    current_hops: 0,
  });
  if (v.status !== "ALLOW") {
    return { ok: false, reason: `VERIFY_DENY:${v.reason ?? "DENY"}` };
  }

  const nextHops = Math.max(0, cap.hopsRemaining - 1);
  const att = attenuate(cap.tokenHex, { max_hops: nextHops }, cap.rootPubHex);
  if (att.status !== "OK" || typeof att.token_hex !== "string") {
    return {
      ok: false,
      reason: `ATTENUATE_FAIL:${att.status === "ERROR" ? att.reason : "no_token"}`,
    };
  }

  return {
    ok: true,
    next: {
      tokenHex: att.token_hex,
      rootPubHex: cap.rootPubHex,
      hopsRemaining: nextHops,
    },
  };
}
