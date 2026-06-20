// src/packages/flow-funding/tests/uc-flow-ocap.test.ts
//
// 1644 M4 — the bounded, revocable flow ocap (security-critical, §8 / risk #4).
//
// Real-crypto unit over `domain/flow-ocap.ts`: mint an Ed25519-signed token.pay-
// scoped capability carrying the owner's approval receipt + flow bounds, then
// assert `verifyFlowOcapForAllocation` ALLOWs an in-bounds allocation and REFUSES
// LOUD on every out-of-bounds / tampered / revoked / vault-locked arm. This is the
// fc-INDEPENDENT ocap mechanism — it never calls token.pay (that integration rides
// E1/1596, post-fc). The gate-satisfaction at action-gate.ts (approval_receipt) is
// exercised end-to-end in the integ; this proves the deterministic bound logic the
// authorization rests on.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/domain/flow-ocap.ts:1
// @mechanism-asserted Ed25519 cap-token signature is the tamper-evidence bound (a
//   forged/edited token fails verifyToken — NOT a JS-field check); over-cap /
//   stale-policy-version / wrong-context / vault-locked / missing-receipt all
//   REFUSE LOUD (T-12/T-13/T-14)
// @canonical-flow flow-funding/domain/flow-ocap.ts verifyFlowOcapForAllocation
// === END HEADER ===
//
// Requires the naoms_core dylib (verifyToken uses FFI ed25519/blake3). Run:
//   NAOMS_FFI_LIB_PATH=.../release deno test --allow-all --unstable-ffi <this>
//
// RED (pre-flow-ocap.ts):
//   error: Module not found ".../flow-funding/domain/flow-ocap.ts"
//   FAILED | 0 passed | 0 failed
// GREEN (this file, post-implementation): ok | N passed | 0 failed (banked in M4 note)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as ed from "jsr:@noble/ed25519@2";
import { sha512 } from "jsr:@noble/hashes@1/sha512";
import {
  type FlowOcapBounds,
  mintFlowActionLeaf,
  mintFlowDelegationRoot,
  mintFlowOcap,
  type SettlementCheck,
  verifyFlowOcapForAllocation,
} from "../domain/flow-ocap.ts";
import type {
  ActionBinding,
  MintSignFn,
} from "@naoms/core/ucan/capability-token.ts";
import {
  canonicalizePayArgs,
  verifyDelegationChain,
} from "@naoms/core/ucan/delegation-chain.ts";

// noble ed25519 v2 needs a sync sha512 registered (mirror biscuit-contract.ts).
(ed.etc as unknown as {
  sha512Sync: (...m: Uint8Array[]) => Uint8Array;
}).sha512Sync = (...m: Uint8Array[]) => {
  if (m.length === 1) return sha512(m[0]);
  let total = 0;
  for (const part of m) total += part.length;
  const joined = new Uint8Array(total);
  let cursor = 0;
  for (const part of m) {
    joined.set(part, cursor);
    cursor += part.length;
  }
  return sha512(joined);
};

const SR = { sanitizeResources: false, sanitizeOps: false };

const HOLON = "did:key:zHolonSelf";
const CONTEXT = "nao";
const RECEIPT = "deadbeefcafef00d"; // stand-in for the owner's policy-arm receipt

function ownerKeypair() {
  const seed = ed.utils.randomPrivateKey();
  const pubkey = ed.getPublicKey(seed);
  const signFn: MintSignFn = (data: Uint8Array) => ed.sign(data, seed);
  return { seed, pubkey, signFn };
}

const BOUNDS: FlowOcapBounds = {
  holon: HOLON,
  context: CONTEXT,
  policyVersion: 1,
  perClaimantCap: 150,
  perEpochCap: 300,
};

function check(pubkey: Uint8Array, over: Partial<SettlementCheck> = {}): SettlementCheck {
  return {
    ownerPubkey: pubkey,
    holon: HOLON,
    context: CONTEXT,
    currentPolicyVersion: 1,
    allocationAmount: 150,
    epochTotal: 300,
    vaultUnlocked: true,
    ...over,
  };
}

async function mint(signFn: MintSignFn, pubkey: Uint8Array, opts: {
  bounds?: FlowOcapBounds;
  receipt?: string;
  expiryMs?: number;
} = {}) {
  return await mintFlowOcap({
    signFn,
    bounds: opts.bounds ?? BOUNDS,
    approvalReceipt: opts.receipt ?? RECEIPT,
    expiryMs: opts.expiryMs ?? 3_600_000,
    pubkeyOverride: pubkey,
  });
}

Deno.test("flow-ocap: in-bounds allocation is ALLOWed; returns the cap token to present to token.pay", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey));
  assert(v.ok, `expected ALLOW, got ${JSON.stringify(v)}`);
  assertEquals(v.token.scope.tools, ["token.pay"], "scope authorizes token.pay");
  assertEquals(v.token.approval_receipt, RECEIPT, "carries the approval receipt");
});

Deno.test("flow-ocap: over per-claimant cap REFUSES (T-12)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey, { allocationAmount: 151 }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "over-per-claimant-cap");
});

Deno.test("flow-ocap: over per-epoch cap REFUSES (T-12)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey, { epochTotal: 300.5 }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "over-per-epoch-cap");
});

Deno.test("flow-ocap: stale policy-version REFUSES — revocation by re-arm (T-13)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey, { currentPolicyVersion: 2 }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "revoked-stale-policy-version");
});

Deno.test("flow-ocap: wrong context REFUSES (over-scope)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey, { context: "care" }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "over-scope-context");
});

Deno.test("flow-ocap: vault-locked REFUSES (T-14)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  const v = verifyFlowOcapForAllocation(token, check(pubkey, { vaultUnlocked: false }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "vault-locked");
});

Deno.test("flow-ocap: missing approval receipt REFUSES (no gate evidence)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey, { receipt: "" });
  const v = verifyFlowOcapForAllocation(token, check(pubkey));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "no-approval-receipt");
});

Deno.test("flow-ocap: a TAMPERED token fails the Ed25519 signature (mechanism, not a JS field check)", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey);
  // Forge a wider per-claimant cap into the signed bounds WITHOUT re-signing.
  const forged = {
    ...token,
    scope: {
      ...token.scope,
      domains: [token.scope.domains[0].replace("pcc=150", "pcc=999999")],
    },
  };
  const v = verifyFlowOcapForAllocation(forged, check(pubkey, { allocationAmount: 500 }));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "bad-signature", "tamper caught by signature, not bounds");
});

Deno.test("flow-ocap: a foreign signer's token fails verification", SR, async () => {
  const owner = ownerKeypair();
  const attacker = ownerKeypair();
  const token = await mint(attacker.signFn, attacker.pubkey); // minted by attacker
  const v = verifyFlowOcapForAllocation(token, check(owner.pubkey)); // verified vs owner
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "bad-signature");
});

Deno.test("flow-ocap: expired token REFUSES", SR, async () => {
  const { pubkey, signFn } = ownerKeypair();
  const token = await mint(signFn, pubkey, { expiryMs: -1000 }); // already expired
  const v = verifyFlowOcapForAllocation(token, check(pubkey));
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "expired");
});

// ── B-1: the flow minters COMPOSE with the core gate (delegation-chain) ─────────

Deno.test("flow delegation: mintFlowDelegationRoot + mintFlowActionLeaf produce a chain the CORE gate ALLOWs", SR, async () => {
  const owner = ownerKeypair();
  const engine = ownerKeypair(); // the per-policy engine key K (distinct from owner, B4)
  const root = await mintFlowDelegationRoot({
    ownerSignFn: owner.signFn,
    bounds: BOUNDS,
    aggregateCap: 1000,
    enginePubkey: engine.pubkey,
    approvalReceipt: RECEIPT,
    expiryMs: 3_600_000,
    ownerPubkeyOverride: owner.pubkey,
  });
  const args = { token: "tok-A", toDid: "did:key:zClaimant", amount: 120 };
  const canonical = canonicalizePayArgs(args);
  const binding: ActionBinding = {
    token: canonical.token,
    toDid: canonical.toDid,
    amount: canonical.amount,
    loss_bearer: canonical.loss_bearer,
    invoice: canonical.invoice,
    nonce: crypto.randomUUID(),
  };
  const leaf = await mintFlowActionLeaf({
    engineSignFn: engine.signFn,
    root,
    binding,
    expiryMs: 3_600_000,
    enginePubkeyOverride: engine.pubkey,
  });
  // The CORE gate (owner pubkey on-graph, K pubkey resolved) verifies the chain.
  const v = await verifyDelegationChain(
    leaf,
    root,
    owner.pubkey,
    engine.pubkey,
    canonical,
    args,
  );
  assert(v.ok, `expected the core gate to ALLOW the flow-minted chain, got ${JSON.stringify(v)}`);
  if (v.ok) {
    assertEquals(v.amount, 120);
    assertEquals(v.aggregateCap, 1000);
    assertEquals(v.nonce, binding.nonce);
  }
});

Deno.test("flow delegation: a leaf signed by a key the root did NOT delegate is REFUSED by core (B4)", SR, async () => {
  const owner = ownerKeypair();
  const engine = ownerKeypair();
  const rogue = ownerKeypair(); // not the delegated key
  const root = await mintFlowDelegationRoot({
    ownerSignFn: owner.signFn,
    bounds: BOUNDS,
    aggregateCap: 1000,
    enginePubkey: engine.pubkey, // root delegates `engine`
    approvalReceipt: RECEIPT,
    expiryMs: 3_600_000,
    ownerPubkeyOverride: owner.pubkey,
  });
  const args = { token: "tok-A", toDid: "did:key:zClaimant", amount: 120 };
  const canonical = canonicalizePayArgs(args);
  const binding: ActionBinding = {
    token: canonical.token,
    toDid: canonical.toDid,
    amount: canonical.amount,
    loss_bearer: canonical.loss_bearer,
    invoice: canonical.invoice,
    nonce: crypto.randomUUID(),
  };
  const leaf = await mintFlowActionLeaf({
    engineSignFn: rogue.signFn, // signed by rogue, not engine
    root,
    binding,
    expiryMs: 3_600_000,
    enginePubkeyOverride: rogue.pubkey,
  });
  const v = await verifyDelegationChain(leaf, root, owner.pubkey, rogue.pubkey, canonical, args);
  assertEquals(v.ok, false);
  if (!v.ok) assertEquals(v.reason, "leaf-not-signed-by-delegated-key");
});
