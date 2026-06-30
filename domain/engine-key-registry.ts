// src/packages/flow-funding/domain/engine-key-registry.ts — 1644 M4 B-0.
//
// The in-process lifecycle for the delegated engine key `K` (design B4,
// build-step-2 plan §"DECISION — the delegated engine key K"). `K` is a FRESH
// per-policy-arm Ed25519 keypair that is NOT the owner key: a stolen delegation
// root plus a random key must not be able to mint valid leaves, so the root pins
// `fingerprint(K.pub)` and only leaves signed by `K` verify.
//
// LIFECYCLE (ephemeral, in-process — the ratified K-lifecycle):
//   - `flow.policy_set` (owner-approved arm) calls `armEngineKey(policyEntityId)`
//     → a fresh `K` is generated and held for the policy-version's life. The
//     handler mints the owner-signed delegation ROOT pinning `fingerprint(K.pub)`.
//   - `flow.epoch_settle` calls `getEngineKeyByPolicy(policyEntityId)` to sign
//     per-action leaves with `K`.
//   - the WS-dispatch gate closure (B-4) calls `getEngineKeyByFingerprint(fp)` to
//     resolve `K.pub` BYTES from the root's `delegation_bounds.delegated_key`
//     (the root carries only the one-way fingerprint; single-daemon, minter ==
//     verifier, so the bytes are recovered from in-process state, NOT on-graph).
//   - revoke (new `policy_version`) OR process restart discards `K` → no new
//     leaves until re-arm. Per the Mystery axiom this is acceptable, not a fault:
//     the conserved allocator re-derives the allocation next epoch — no payment
//     is lost. `getEngineKeyBy*` returning `undefined` is the "K-absent → records-
//     but-moves-no-value, surfaced LOUD" signal the consumer handles.
//
// SCOPE: single-daemon (the minting engine and the verifying gate share this
// process). The cross-identity 2-daemon arm (K.pub replicated on-graph as the
// delegate registration) rides E1/1596 and is deliberately NOT built here.
//
// `K` is held only in memory; it is never persisted (no new protected-key
// lifecycle surface) and never leaves this process. `signFn` closes over the
// private half so callers mint leaves without the raw key escaping the module.

import { ed25519 } from "https://esm.sh/@noble/curves@1.4.0/ed25519";
import {
  keyFingerprint,
  type MintSignFn,
} from "@naoms/core/ucan/capability-token.ts";

/** The in-process delegate engine key for one armed flow policy. The private
 *  half is NOT a field — it is captured by `signFn` so it cannot be read back
 *  off the entry the gate closure holds (the gate only needs `publicKey`). */
export interface FlowEngineKey {
  policyEntityId: string;
  /** `K.pub` BYTES — what the gate passes to `verifyToken(leaf, K.pub)`. */
  publicKey: Uint8Array;
  /** `keyFingerprint(K.pub)` — matches the root's `delegation_bounds.delegated_key`. */
  fingerprint: string;
  /** Sign with `K` (the per-action leaf signer). Standard Ed25519 over the
   *  token `content_hash` bytes, interop-verifiable by core `verifyToken`. */
  signFn: MintSignFn;
}

// Process-singleton state. Keyed by policy entity for the settle-side lookup; a
// fingerprint→policy index backs the gate-side lookup (the root carries the
// fingerprint, not the policy id).
const _byPolicy = new Map<
  string,
  { entry: FlowEngineKey; privateKey: Uint8Array }
>();
const _fingerprintToPolicy = new Map<string, string>();

/** Arm (or re-arm) the engine key for a policy entity. A re-arm DISCARDS the
 *  prior `K` first (revoke-by-policy-version semantics) so a superseded policy
 *  version can never mint new leaves. Returns the public-facing `K` handle. */
export async function armEngineKey(
  policyEntityId: string,
): Promise<FlowEngineKey> {
  // Re-arm: a new policy version supersedes the old; the old K must die so no
  // stale leaves verify against a revoked version.
  revokeEngineKey(policyEntityId);

  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  const fingerprint = await keyFingerprint(publicKey);
  const signFn: MintSignFn = (data: Uint8Array) =>
    ed25519.sign(data, privateKey);

  const entry: FlowEngineKey = {
    policyEntityId,
    publicKey,
    fingerprint,
    signFn,
  };
  _byPolicy.set(policyEntityId, { entry, privateKey });
  _fingerprintToPolicy.set(fingerprint, policyEntityId);
  return entry;
}

/** Resolve `K` for the SETTLE side (mint leaves). `undefined` ⇒ no armed key
 *  (never armed, or discarded on restart/revoke) → records-but-moves-no-value. */
export function getEngineKeyByPolicy(
  policyEntityId: string,
): FlowEngineKey | undefined {
  return _byPolicy.get(policyEntityId)?.entry;
}

/** Resolve `K` for the GATE side (verify a leaf) by the root's pinned
 *  `delegation_bounds.delegated_key` fingerprint. `undefined` ⇒ the gate falls
 *  through to the interactive path (fail-closed), never a silent allow. */
export function getEngineKeyByFingerprint(
  fingerprint: string,
): FlowEngineKey | undefined {
  const policyEntityId = _fingerprintToPolicy.get(fingerprint);
  return policyEntityId ? _byPolicy.get(policyEntityId)?.entry : undefined;
}

/** Discard the engine key for a policy entity (revoke / supersede). Idempotent.
 *  Best-effort zeroes the private bytes so a heap snapshot after revoke does not
 *  trivially recover `K`. */
export function revokeEngineKey(policyEntityId: string): void {
  const prior = _byPolicy.get(policyEntityId);
  if (!prior) return;
  _fingerprintToPolicy.delete(prior.entry.fingerprint);
  _byPolicy.delete(policyEntityId);
  prior.privateKey.fill(0);
}
