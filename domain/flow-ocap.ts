// src/packages/flow-funding/domain/flow-ocap.ts — 1644 M4 (security-critical).
//
// The bounded, revocable object-capability that lets automated flow settlement
// ride `token.pay` WITHOUT an interactive unlock and WITHOUT bypassing the
// CORE_APPROVAL_REQUIRED gate (design §8; §10 risk #4 — a capability that
// out-scopes its cap is an EoP).
//
// COMPOSITION (not bypass): the token ledger gates every `token.pay` with
// CORE_APPROVAL_REQUIRED; `action-gate.ts:68-72` SATISFIES that gate when the
// caller's capability token carries a per-action `approval_receipt` — the receipt
// IS the approval evidence. So a holon approves the flow authorization ONCE at
// `flow.policy_set` (the real owner-authority approval path), and that grant mints
// a `token.pay`-scoped capability token carrying the receipt. Each settled
// allocation presents that token; the gate is satisfied non-interactively.
//
// BOUNDING: the capability is a single Ed25519-signed `CapabilityToken`
// (core/ucan/capability-token.ts) whose scope authorizes `token.pay` and whose
// flow bounds (holon, context, policy-version, per-claimant cap, per-epoch cap)
// are encoded in `scope.domains[0]`. The token signature makes the bounds
// TAMPER-EVIDENT — no separate caveat layer is needed; the cap token IS the signed
// authorization. `verifyFlowOcapForAllocation` REFUSES LOUD (Honesty axiom, never
// a silent clamp) on bad-sig / expired / wrong-holon / wrong-context /
// stale-policy-version (revoke, T-13) / over per-claimant or per-epoch cap
// (over-scope, T-12) / missing receipt / vault-locked (T-14).
//
// fc-INDEPENDENT: this primitive MINTS and VERIFIES the capability; it never calls
// `token.pay`. The settlement→token.pay integration (presenting the returned token
// on the real co-signed transfer) rides E1/1596's `handleTokenPay` wiring, which is
// owner-/fc-gated (currently `TokenOpNotYetWiredError`). That integration + the
// "tokens actually circulate" e2e are scoped post-E1; the ocap mechanism here is
// provable in isolation against the gate layer.

import {
  type ActionBinding,
  type CapabilityToken,
  isExpired,
  keyFingerprint,
  mintActionLeaf,
  mintDelegationRoot,
  type MintSignFn,
  mintToken,
  type TokenScope,
  verifyToken,
} from "@naoms/core/ucan/capability-token.ts";

const EPS = 1e-6;
const DOMAIN_PREFIX = "flow-ocap:v1:";

/** The owner-authorized scope of an automated-flow capability. */
export interface FlowOcapBounds {
  /** The holon whose surplus may flow (self). */
  holon: string;
  /** The flow context (e.g. "nao") this authorization is scoped to. */
  context: string;
  /** The FlowPolicy version this ocap is bound to. A new version REVOKES it (T-13). */
  policyVersion: number;
  /** Max a single claimant may receive per settlement; undefined = unbounded. */
  perClaimantCap?: number;
  /** Max total outflow per epoch; undefined = unbounded. */
  perEpochCap?: number;
}

function encodeBounds(b: FlowOcapBounds): string {
  const e = encodeURIComponent;
  return DOMAIN_PREFIX +
    `holon=${e(b.holon)};ctx=${e(b.context)};pver=${b.policyVersion};` +
    `pcc=${b.perClaimantCap ?? ""};pec=${b.perEpochCap ?? ""}`;
}

/** Parse the bounds back from a cap token's domain string; null if malformed. */
export function decodeBounds(domain: string): FlowOcapBounds | null {
  if (!domain.startsWith(DOMAIN_PREFIX)) return null;
  const rest = domain.slice(DOMAIN_PREFIX.length);
  const parts: Record<string, string> = {};
  for (const seg of rest.split(";")) {
    const eq = seg.indexOf("=");
    if (eq < 0) continue;
    parts[seg.slice(0, eq)] = seg.slice(eq + 1);
  }
  const d = decodeURIComponent;
  const holon = parts.holon ? d(parts.holon) : "";
  const context = parts.ctx ? d(parts.ctx) : "";
  const pver = Number(parts.pver);
  if (!holon || !context || !Number.isFinite(pver)) return null;
  const num = (s: string | undefined): number | undefined =>
    s === undefined || s === "" ? undefined : Number(s);
  const perClaimantCap = num(parts.pcc);
  const perEpochCap = num(parts.pec);
  if (perClaimantCap !== undefined && !Number.isFinite(perClaimantCap)) {
    return null;
  }
  if (perEpochCap !== undefined && !Number.isFinite(perEpochCap)) return null;
  return { holon, context, policyVersion: pver, perClaimantCap, perEpochCap };
}

/**
 * Mint a flow ocap: a `token.pay`-scoped capability token carrying the owner's
 * approval receipt + the flow bounds (tamper-evident via the token signature).
 * `signFn` signs with the owner's key (prod: bridgeSign; tests: a local keypair
 * with `pubkeyOverride`). `expiryMs` bounds the validity window.
 */
export async function mintFlowOcap(opts: {
  signFn: MintSignFn;
  bounds: FlowOcapBounds;
  approvalReceipt: string;
  expiryMs: number;
  pubkeyOverride?: Uint8Array;
}): Promise<CapabilityToken> {
  const scope: TokenScope = {
    tools: ["token.pay"],
    operations: ["write"],
    domains: [encodeBounds(opts.bounds)],
    can_delegate: false,
    max_delegation_depth: 0,
  };
  return await mintToken(
    opts.signFn,
    scope,
    opts.expiryMs,
    opts.approvalReceipt,
    opts.pubkeyOverride,
  );
}

// ── 1644 M4 build-step 2 (B-1): the delegation model ───────────────────────────
//
// The gate-seam (delegation-chain.ts, build-step 1) replaced the old "present the
// standing owner-signed ocap directly + rely on action-gate receipt-allow" model
// (that receipt path is NOT wired into enforceApprovalGate) with: an owner-signed
// DELEGATION ROOT that authorizes a per-policy engine key `K` to mint single-use
// per-action `token.pay` LEAVES. `mintFlowOcap` above is retained as the standing
// ROOT shape (flow bounds in `scope.domains[0]` for the mint-time `verifyFlowOcap…`
// gate); `mintFlowDelegationRoot` adds the core delegation_bounds; `mintFlowActionLeaf`
// is the per-allocation child. (The old header's "rides E1/1596 handleTokenPay /
// TokenOpNotYetWiredError" is STALE — `handlePay` (tools-pay.ts, tools.ts:636) is the
// LIVE token.pay path; single-daemon epoch-settle presents the leaf on it.)

/** Mint the owner-signed DELEGATION ROOT for a flow policy arm (B-1). The owner
 *  signs ONCE at `flow.policy_set`; the root authorizes the per-policy engine key
 *  `K` to mint per-action leaves within the owner-signed core ceiling. Carries BOTH
 *  the flow bounds (in `scope.domains[0]`, for the finer mint-time
 *  `verifyFlowOcapForAllocation` per-claimant/per-epoch gate) AND the core
 *  `delegation_bounds` (delegated_key + aggregate_cap + context + policy_version,
 *  for core's `verifyDelegationChain`).
 *
 * `aggregateCap` is the OWNER-SIGNED coarse ceiling over the root's WHOLE life
 * (distinct from the flow `perEpochCap`, a per-epoch finer bound) — core's
 * independent defense that never reduces to "trust the flow engine" (design B3).
 */
export async function mintFlowDelegationRoot(opts: {
  ownerSignFn: MintSignFn;
  bounds: FlowOcapBounds;
  /** Owner-signed total value authorized over the root's life (B3). */
  aggregateCap: number;
  /** The per-policy engine key `K`'s pubkey — the root pins its fingerprint (B4). */
  enginePubkey: Uint8Array;
  approvalReceipt: string;
  expiryMs: number;
  ownerPubkeyOverride?: Uint8Array;
}): Promise<CapabilityToken> {
  const scope: TokenScope = {
    tools: ["token.pay"],
    operations: ["write"],
    domains: [encodeBounds(opts.bounds)],
    can_delegate: true,
    max_delegation_depth: 1,
  };
  return await mintDelegationRoot({
    signFn: opts.ownerSignFn,
    scope,
    expiryMs: opts.expiryMs,
    approvalReceipt: opts.approvalReceipt,
    delegationBounds: {
      delegated_key: await keyFingerprint(opts.enginePubkey),
      aggregate_cap: opts.aggregateCap,
      context: opts.bounds.context,
      policy_version: opts.bounds.policyVersion,
    },
    pubkeyOverride: opts.ownerPubkeyOverride,
  });
}

/** Mint a per-action `token.pay` LEAF under a flow delegation root (B-1). Signed by
 *  the per-policy engine key `K` (so its `issuer_key_id` === the root's pinned
 *  `delegated_key`), parented to the root, `can_delegate:false`, `tools` EXACTLY
 *  `["token.pay"]`, bound to THIS settlement's canonicalized args. Single-use via the
 *  nonce. Mint ONLY after `verifyFlowOcapForAllocation` PASSes for the allocation. */
export async function mintFlowActionLeaf(opts: {
  engineSignFn: MintSignFn;
  root: CapabilityToken;
  binding: ActionBinding;
  expiryMs: number;
  enginePubkeyOverride: Uint8Array;
}): Promise<CapabilityToken> {
  const scope: TokenScope = {
    tools: ["token.pay"],
    operations: ["write"],
    domains: [],
    can_delegate: false,
    max_delegation_depth: 0,
  };
  return await mintActionLeaf({
    signFn: opts.engineSignFn,
    scope,
    expiryMs: opts.expiryMs,
    parentHash: opts.root.content_hash,
    actionBinding: opts.binding,
    pubkeyOverride: opts.enginePubkeyOverride,
  });
}

/** The settlement-time facts an allocation is checked against. */
export interface SettlementCheck {
  /** Owner's Ed25519 public key — verifies the cap token signature. */
  ownerPubkey: Uint8Array;
  holon: string;
  context: string;
  /** The CURRENT armed FlowPolicy version. A mismatch = revoked (T-13). */
  currentPolicyVersion: number;
  /** This claimant's allocation for the epoch. */
  allocationAmount: number;
  /** Total settled outflow this epoch (for the per-epoch cap). */
  epochTotal: number;
  /** Whether the signer vault is unlocked (T-14). */
  vaultUnlocked: boolean;
}

export type OcapVerdict =
  | { ok: true; token: CapabilityToken }
  | { ok: false; reason: string };

/**
 * Authorize ONE settlement allocation against a flow ocap. Fail-closed: REFUSES
 * LOUD (returns `{ok:false, reason}`) unless every bound holds. On ALLOW, returns
 * the cap token for the settlement to present to `token.pay` (whose gate the
 * token's `approval_receipt` then satisfies). The order checks cheap/security-
 * critical conditions first (vault, receipt, signature) before the bounds.
 */
export function verifyFlowOcapForAllocation(
  token: CapabilityToken,
  c: SettlementCheck,
): OcapVerdict {
  // T-14: a locked vault cannot authorize automated value movement.
  if (!c.vaultUnlocked) return { ok: false, reason: "vault-locked" };

  // Gate evidence: without an approval receipt the token.pay gate would reject
  // this anyway — refuse here so the failure is named, not deferred.
  if (!token.approval_receipt) {
    return { ok: false, reason: "no-approval-receipt" };
  }

  // Scope: the capability must actually authorize token.pay.
  if (!token.scope.tools.includes("token.pay")) {
    return { ok: false, reason: "scope-not-token-pay" };
  }

  // Tamper-evidence: the signature covers scope (incl. the bounds) + receipt +
  // expiry. A forged/edited token fails here.
  if (!verifyToken(token, c.ownerPubkey)) {
    return { ok: false, reason: "bad-signature" };
  }
  if (isExpired(token)) return { ok: false, reason: "expired" };

  const b = decodeBounds(token.scope.domains[0] ?? "");
  if (!b) return { ok: false, reason: "bounds-unparseable" };

  if (b.holon !== c.holon) return { ok: false, reason: "over-scope-holon" };
  if (b.context !== c.context) {
    return { ok: false, reason: "over-scope-context" };
  }

  // T-13: revocation = a new FlowPolicy version. The ocap is bound to the version
  // it was minted under; any disarm/re-arm bumps the version and strands it.
  //
  // NOTE (1644 Phase-2 critic finding #2): in the LIVE single-daemon epoch-settle
  // path this check is redundant-with-K-discard, not the load-bearing revocation.
  // epoch-settle reads BOTH the root and `currentPolicyVersion` off the SAME latest
  // policy node, so they always agree here. The REAL revocation is the in-process K
  // discard: a re-arm (new version) calls `armEngineKey` which overwrites K, so the
  // superseded K's fingerprint no longer resolves at the gate (K-absent ⇒ interactive
  // fall-through) AND the root lives only on the latest node. This check still fires
  // for an INDEPENDENTLY-sourced stale root (e.g. a future caller presenting an old
  // persisted root against a freshly-probed current version) — defense-in-depth, kept.
  if (b.policyVersion !== c.currentPolicyVersion) {
    return { ok: false, reason: "revoked-stale-policy-version" };
  }

  // T-12: over-scope caps. A capability that out-scopes its cap is an EoP —
  // refuse the allocation rather than clamp it (Honesty axiom).
  if (
    b.perClaimantCap !== undefined &&
    c.allocationAmount > b.perClaimantCap + EPS
  ) {
    return { ok: false, reason: "over-per-claimant-cap" };
  }
  if (b.perEpochCap !== undefined && c.epochTotal > b.perEpochCap + EPS) {
    return { ok: false, reason: "over-per-epoch-cap" };
  }

  return { ok: true, token };
}
