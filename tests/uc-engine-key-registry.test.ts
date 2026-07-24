// src/packages/flow-funding/tests/uc-engine-key-registry.test.ts
//
// 1644 M4 B-0 — the in-process delegated engine key `K` lifecycle.
//
// Real-crypto unit over `domain/engine-key-registry.ts`: prove the registry arms
// a FRESH per-policy Ed25519 `K`, resolves it by policy-id (settle side) AND by
// fingerprint (gate side), and that a re-arm / revoke DISCARDS the prior key so a
// superseded policy version can never mint verifiable leaves. The interop bar:
// `K.signFn` produces a standard Ed25519 signature that core `verifyToken` accepts
// over the token `content_hash` — i.e. an in-process leaf signed by `K` verifies
// against `K.pub` exactly as the WS-dispatch gate will check it (B-4).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/domain/engine-key-registry.ts:1
// @mechanism-asserted the registry-held `K.signFn` signs interop-verifiably under
//   core `verifyToken(token, K.pub)` (real Ed25519, NOT a JS-field check);
//   fingerprint === keyFingerprint(K.pub); revoke + re-arm DISCARD the prior key so
//   its fingerprint no longer resolves (revoke-by-policy-version)
// @canonical-flow N/A (flow-funding/domain/engine-key-registry.ts armEngineKey)
// === END HEADER ===
//
// Requires the naoms_core dylib (keyFingerprint/verifyToken use FFI blake3/ed25519).
// Run:
//   NAOMS_FFI_LIB_PATH=.../release deno test --allow-all --unstable-ffi <this>

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  keyFingerprint,
  mintDelegationRoot,
  verifyToken,
} from "@naoms/core/ucan/capability-token.ts";
import {
  armEngineKey,
  getEngineKeyByFingerprint,
  getEngineKeyByPolicy,
  revokeEngineKey,
} from "../domain/engine-key-registry.ts";

const SR = { sanitizeResources: false, sanitizeOps: false };

const POLICY_A = "flow-policy:did:key:zHolonA:nao:v1";
const POLICY_B = "flow-policy:did:key:zHolonB:nao:v1";

Deno.test("arm produces a 32-byte K.pub whose fingerprint matches keyFingerprint", SR, async () => {
  revokeEngineKey(POLICY_A);
  const k = await armEngineKey(POLICY_A);
  assertEquals(k.policyEntityId, POLICY_A);
  assertEquals(k.publicKey.length, 32);
  assertEquals(k.fingerprint, await keyFingerprint(k.publicKey));
  revokeEngineKey(POLICY_A);
});

Deno.test("K resolves by policy (settle side) AND by fingerprint (gate side) to the same key", SR, async () => {
  revokeEngineKey(POLICY_A);
  const k = await armEngineKey(POLICY_A);
  const byPolicy = getEngineKeyByPolicy(POLICY_A);
  const byFp = getEngineKeyByFingerprint(k.fingerprint);
  assertExists(byPolicy);
  assertExists(byFp);
  assertEquals(byPolicy!.fingerprint, k.fingerprint);
  assertEquals(byFp!.fingerprint, k.fingerprint);
  // Same underlying public key bytes from both lookup paths.
  assertEquals([...byPolicy!.publicKey], [...byFp!.publicKey]);
  revokeEngineKey(POLICY_A);
});

Deno.test("K.signFn signs interop-verifiably under core verifyToken (the gate-side check)", SR, async () => {
  revokeEngineKey(POLICY_A);
  const k = await armEngineKey(POLICY_A);
  // Mint a delegation root signed by K and overriding the issuer pubkey to K.pub
  // (this mirrors how the gate verifies a leaf: verifyToken(token, K.pub)). A real
  // signature over the content_hash — a forged token would fail this.
  const root = await mintDelegationRoot({
    signFn: k.signFn,
    scope: {
      tools: ["token.pay"],
      operations: ["write"],
      domains: [],
      can_delegate: true,
      max_delegation_depth: 1,
    },
    expiryMs: 60_000,
    approvalReceipt: "deadbeefcafef00d",
    delegationBounds: {
      delegated_key: "fp-of-some-other-key",
      aggregate_cap: 100,
      context: "nao",
      policy_version: 1,
    },
    pubkeyOverride: k.publicKey,
  });
  assert(verifyToken(root, k.publicKey), "K-signed token must verify under K.pub");
  // issuer_key_id is the fingerprint of the signing key.
  assertEquals(root.issuer_key_id, k.fingerprint);
  // A different key must NOT verify it (the signature is bound to K).
  const other = await armEngineKey(POLICY_B);
  assert(!verifyToken(root, other.publicKey), "root must NOT verify under a foreign key");
  revokeEngineKey(POLICY_A);
  revokeEngineKey(POLICY_B);
});

Deno.test("revoke discards K — both lookups go cold (records-but-no-value signal)", SR, async () => {
  revokeEngineKey(POLICY_A);
  const k = await armEngineKey(POLICY_A);
  revokeEngineKey(POLICY_A);
  assertEquals(getEngineKeyByPolicy(POLICY_A), undefined);
  assertEquals(getEngineKeyByFingerprint(k.fingerprint), undefined);
});

Deno.test("re-arm supersedes — new fingerprint resolves, the prior fingerprint no longer does", SR, async () => {
  revokeEngineKey(POLICY_A);
  const k1 = await armEngineKey(POLICY_A);
  const k2 = await armEngineKey(POLICY_A); // re-arm (new policy version)
  assertNotEquals(k1.fingerprint, k2.fingerprint);
  // The superseded key's fingerprint must no longer resolve — a leaf signed by
  // the old K (revoked version) can never reach a live K.pub through the gate.
  assertEquals(getEngineKeyByFingerprint(k1.fingerprint), undefined);
  // The policy resolves to the NEW key.
  assertEquals(getEngineKeyByPolicy(POLICY_A)!.fingerprint, k2.fingerprint);
  assertEquals(getEngineKeyByFingerprint(k2.fingerprint)!.fingerprint, k2.fingerprint);
  revokeEngineKey(POLICY_A);
});

Deno.test("two policies hold independent keys", SR, async () => {
  revokeEngineKey(POLICY_A);
  revokeEngineKey(POLICY_B);
  const a = await armEngineKey(POLICY_A);
  const b = await armEngineKey(POLICY_B);
  assertNotEquals(a.fingerprint, b.fingerprint);
  assertEquals(getEngineKeyByPolicy(POLICY_A)!.fingerprint, a.fingerprint);
  assertEquals(getEngineKeyByPolicy(POLICY_B)!.fingerprint, b.fingerprint);
  // Revoking one leaves the other intact.
  revokeEngineKey(POLICY_A);
  assertEquals(getEngineKeyByPolicy(POLICY_A), undefined);
  assertExists(getEngineKeyByPolicy(POLICY_B));
  revokeEngineKey(POLICY_B);
});
