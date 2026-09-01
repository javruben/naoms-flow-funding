// src/packages/flow-funding/handlers/agreement.ts — 1644 M2 flow-agreement.
//
// Bilateral two-lane agreement over the formality dial. The agreement lives on
// the BILATERAL FRIENDSHIP CHAIN between the two parties (deriveFriendshipChainId),
// NOT each holon's owner-local flow chain: the friendship chain is provisioned at
// pair-time so it replicates between the peers (a post-pair owner-local chain's
// chain-identity key is not in the pairing blob → would not replicate). This
// mirrors chat-send.ts, which writes `message.sent` to the same chain.
//
//   - flow.agreement_propose : proposer's lane → flow.agreement_proposed on fcAB.
//   - flow.agreement_accept  : counterparty's lane → flow.agreement_accepted.
//   - flow.agreement_revoke  : either party → flow.agreement_revoked.
//   - flow.get_agreement     : fold the flow_agreement node (status proposed/
//                              active/revoked + parties + terms).
//
// Each party signs ITS OWN commit (its lane); the chain is bilateral (exactly two
// known writers), NOT open-multi-writer (D-WRITER-MODEL). Both commits carry one
// agreementId; the supersede/fold materializer marks the node `active` only when
// both lanes are present (assert-the-mechanism, HC-10).

import { securedAppend } from "@naoms/core/chain";
import { deriveFriendshipChainId } from "@naoms/packages/contacts/friendship-chain-id.ts";
import { canonicalPeerDid } from "@naoms/packages/contacts/peer-did.ts";
import { createLogger } from "@naoms/logging";

import {
  type FlowAgreementTerms,
  flowAgreementId,
  validateFlowAgreementTerms,
} from "../domain/agreement.ts";

const L = createLogger("flow-funding:agreement");

/** Slice of RouterContext the agreement handlers read. */
export interface AgreementHandlerContext {
  dbHandle: bigint;
  ownerDid: string;
  callerDid?: string;
  chain: { get(chainId: string): unknown };
  graph: {
    queryAsync(
      pattern: Record<string, unknown>,
    ): Promise<
      {
        nodes?: Array<
          { id: string; kind?: string; properties?: Record<string, unknown> }
        >;
        error?: string;
      }
    >;
  };
}

export type RespondFn = (payload: Record<string, unknown>) => void;

function actorDid(ctx: AgreementHandlerContext): string {
  return ctx.callerDid || ctx.ownerDid;
}

/**
 * 1785 — is this "agreement" between one party and itself?
 *
 * Compared on the CANONICAL (fragmentless) DID form, the same normalisation
 * `deriveFriendshipChainId` applies, so a `did:key:z6…#key-0` on one side and
 * the bare `did:key:z6…` on the other cannot slip past. The pre-1785 guard in
 * `handleAgreementPropose` compared the raw strings and a fragment defeated it.
 *
 * Empty on either side is NOT a self-pair — that shape has its own honest
 * refusal upstream ("counterparty (peer DID) required").
 */
function isSelfParty(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return canonicalPeerDid(a) === canonicalPeerDid(b);
}

/**
 * 1785 — refuse a self-party agreement honestly, naming the REAL reason.
 *
 * Before this, only `propose` guarded (and only on raw strings). Everywhere
 * else the self-pair throw from `deriveFriendshipChainId` was swallowed by
 * `probeFriendshipChain`, which returned null, and the caller reported
 * "no friendship chain with <you> — pair with this peer first". That refusal
 * is loud but DISHONEST: it names a cause that is not the cause, and asks the
 * user to pair with themselves, which can never succeed. Honesty axiom.
 */
function refuseSelfPartyAgreement(
  respond: RespondFn,
  resultType: string,
  selfDid: string,
): void {
  const canon = canonicalPeerDid(selfDid);
  L.warn("flow agreement refused: self-party", { resultType, selfDid: canon });
  respond({
    type: resultType,
    ok: false,
    reason: "SELF_TARGETED_AGREEMENT",
    error:
      `a flow-agreement is between two distinct parties — both sides resolve ` +
      `to your own DID (${canon}). The agreement rides the bilateral ` +
      `friendship chain, which requires a counterparty other than yourself.`,
  });
}

/** Resolve the bilateral friendship chain between self and peer; null when the
 *  peer is not yet paired locally (caller refuses loud — no silent drop).
 *
 *  1785: a SELF-pair no longer reaches here — every call site refuses it by
 *  name first (`refuseSelfPartyAgreement`). Reaching this with self DIDs would
 *  produce the honest-looking but WRONG "pair with this peer first" reason. */
function probeFriendshipChain(
  ctx: AgreementHandlerContext,
  selfDid: string,
  peerDid: string,
): string | null {
  let fcId: string | undefined;
  try {
    fcId = deriveFriendshipChainId(selfDid, peerDid);
  } catch (e) {
    L.warn("friendship-chain id derivation failed", {
      error: (e as Error).message,
      peerDid,
    });
    return null;
  }
  if (!fcId) return null;
  try {
    if (!ctx.chain.get(fcId)) return null;
  } catch (e) {
    L.warn("chain.get probe failed; treating as no friendship chain", {
      error: (e as Error).message,
      fcId,
    });
    return null;
  }
  return fcId;
}

/** Append a flow.agreement_* event to the friendship chain (cross-chain — the
 *  flow-funding package does not own fcAB, so securedAppend directly, exactly as
 *  chat-send.ts does for message.sent). */
async function appendAgreementEvent(
  ctx: AgreementHandlerContext,
  fcId: string,
  signerDid: string,
  type: string,
  payload: Record<string, unknown>,
  entityId: string,
): Promise<string> {
  // NO `domain` field: a `domain` triggers the sharing-domain-key gate, and the
  // peer rejects the replicated commit ("sender lacks domain key for <domain>")
  // unless <domain> is a registered sharing domain with exchanged keys. A
  // bilateral agreement is already scoped by friendship-chain membership (both
  // parties are members), so it replicates plainly like message.sent / task.* —
  // which also omit `domain`. tripleFormat still drives the graph projection.
  const commit = await securedAppend(ctx.dbHandle, {
    chainId: fcId,
    branch: "content",
    type,
    payload: JSON.stringify(payload),
    signerDid,
    signerKeyId: `${signerDid}#key-0`,
    tripleFormat: { featureId: "flow-funding", entityId },
  } as Parameters<typeof securedAppend>[1]);
  return (commit as { id: string }).id;
}

/** flow.agreement_propose — proposer arms an agreement on the bilateral lane. */
export async function handleAgreementPropose(
  ctx: AgreementHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const proposer = actorDid(ctx);
  const counterparty = typeof msg.counterparty === "string"
    ? msg.counterparty
    : "";
  const terms = msg.terms as FlowAgreementTerms | undefined;

  if (!counterparty) {
    return respond({
      type: "flow.agreement_propose.result",
      ok: false,
      error: "counterparty (peer DID) required",
    });
  }
  if (isSelfParty(counterparty, proposer)) {
    return refuseSelfPartyAgreement(
      respond,
      "flow.agreement_propose.result",
      proposer,
    );
  }
  const termsErr = validateFlowAgreementTerms(terms);
  if (termsErr) {
    return respond({
      type: "flow.agreement_propose.result",
      ok: false,
      error: termsErr,
    });
  }

  const fcId = probeFriendshipChain(ctx, proposer, counterparty);
  if (!fcId) {
    return respond({
      type: "flow.agreement_propose.result",
      ok: false,
      error:
        `no friendship chain with ${counterparty} — pair with this peer first ` +
        `(a bilateral flow-agreement rides the established friendship lane)`,
    });
  }

  const agreementId = flowAgreementId(
    proposer,
    counterparty,
    crypto.randomUUID().slice(0, 8),
  );
  try {
    const commit = await appendAgreementEvent(
      ctx,
      fcId,
      proposer,
      "flow.agreement_proposed",
      {
        id: agreementId,
        agreementId,
        proposer,
        counterparty,
        // Scalars + JSON blob so the fold can read terms without nested-node fanout.
        tier: terms!.tier,
        formality: terms!.formality,
        termsJson: JSON.stringify(terms),
        status: "proposed",
      },
      agreementId,
    );
    L.info("flow agreement proposed", { agreementId, counterparty });
    return respond({
      type: "flow.agreement_propose.result",
      ok: true,
      agreementId,
      counterparty,
      commit,
    });
  } catch (e) {
    return respond({
      type: "flow.agreement_propose.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}

/** flow.agreement_accept — counterparty accepts on its own lane. */
export async function handleAgreementAccept(
  ctx: AgreementHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const accepter = actorDid(ctx);
  const agreementId = typeof msg.agreementId === "string"
    ? msg.agreementId
    : "";
  if (!agreementId) {
    return respond({
      type: "flow.agreement_accept.result",
      ok: false,
      error: "agreementId required",
    });
  }

  // Fold the proposed node to learn the proposer (the friendship counterparty).
  const res = await ctx.graph.queryAsync({
    type: "flow_agreement",
    where: { agreementId },
    limit: 1,
  });
  const node = res.nodes?.[0];
  const proposer = node?.properties?.proposer as string | undefined;
  const counterparty = node?.properties?.counterparty as string | undefined;
  if (!node || !proposer) {
    return respond({
      type: "flow.agreement_accept.result",
      ok: false,
      error:
        `no proposed agreement ${agreementId} visible locally yet ` +
        `(has the proposer's lane replicated?)`,
    });
  }
  if (counterparty && counterparty !== accepter) {
    return respond({
      type: "flow.agreement_accept.result",
      ok: false,
      error:
        `only the named counterparty (${counterparty}) may accept agreement ` +
        `${agreementId} — caller is ${accepter}`,
    });
  }

  if (isSelfParty(accepter, proposer)) {
    return refuseSelfPartyAgreement(
      respond,
      "flow.agreement_accept.result",
      accepter,
    );
  }
  const fcId = probeFriendshipChain(ctx, accepter, proposer);
  if (!fcId) {
    return respond({
      type: "flow.agreement_accept.result",
      ok: false,
      error: `no friendship chain with proposer ${proposer}`,
    });
  }
  try {
    const commit = await appendAgreementEvent(
      ctx,
      fcId,
      accepter,
      "flow.agreement_accepted",
      { id: agreementId, agreementId, accepter },
      agreementId,
    );
    L.info("flow agreement accepted", { agreementId, accepter });
    return respond({
      type: "flow.agreement_accept.result",
      ok: true,
      agreementId,
      commit,
    });
  } catch (e) {
    return respond({
      type: "flow.agreement_accept.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}

/** flow.agreement_revoke — either party revokes; revoke is immediate. */
export async function handleAgreementRevoke(
  ctx: AgreementHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const revoker = actorDid(ctx);
  const agreementId = typeof msg.agreementId === "string"
    ? msg.agreementId
    : "";
  if (!agreementId) {
    return respond({
      type: "flow.agreement_revoke.result",
      ok: false,
      error: "agreementId required",
    });
  }
  const res = await ctx.graph.queryAsync({
    type: "flow_agreement",
    where: { agreementId },
    limit: 1,
  });
  const node = res.nodes?.[0];
  const proposer = node?.properties?.proposer as string | undefined;
  const counterparty = node?.properties?.counterparty as string | undefined;
  if (!node || !proposer) {
    return respond({
      type: "flow.agreement_revoke.result",
      ok: false,
      error: `no agreement ${agreementId} visible locally`,
    });
  }
  if (revoker !== proposer && revoker !== counterparty) {
    return respond({
      type: "flow.agreement_revoke.result",
      ok: false,
      error: `only a party to agreement ${agreementId} may revoke it`,
    });
  }
  const peer = revoker === proposer ? counterparty! : proposer;
  if (isSelfParty(revoker, peer)) {
    return refuseSelfPartyAgreement(
      respond,
      "flow.agreement_revoke.result",
      revoker,
    );
  }
  const fcId = probeFriendshipChain(ctx, revoker, peer);
  if (!fcId) {
    return respond({
      type: "flow.agreement_revoke.result",
      ok: false,
      error: `no friendship chain with ${peer}`,
    });
  }
  try {
    const commit = await appendAgreementEvent(
      ctx,
      fcId,
      revoker,
      "flow.agreement_revoked",
      { id: agreementId, agreementId, revoker },
      agreementId,
    );
    return respond({
      type: "flow.agreement_revoke.result",
      ok: true,
      agreementId,
      commit,
    });
  } catch (e) {
    return respond({
      type: "flow.agreement_revoke.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}

/** flow.get_agreement — fold the bilateral agreement state. */
export async function handleGetAgreement(
  ctx: AgreementHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const agreementId = typeof msg.agreementId === "string"
    ? msg.agreementId
    : "";
  if (!agreementId) {
    return respond({
      type: "flow.get_agreement.result",
      ok: false,
      error: "agreementId required",
    });
  }
  try {
    const res = await ctx.graph.queryAsync({
      type: "flow_agreement",
      where: { agreementId },
      limit: 1,
    });
    if (res.error) {
      return respond({
        type: "flow.get_agreement.result",
        ok: false,
        error: res.error,
      });
    }
    const node = res.nodes?.[0];
    if (!node) {
      return respond({
        type: "flow.get_agreement.result",
        ok: true,
        found: false,
        agreementId,
      });
    }
    const p = node.properties ?? {};
    return respond({
      type: "flow.get_agreement.result",
      ok: true,
      found: true,
      agreementId,
      status: p.status ?? "proposed",
      proposer: p.proposer ?? null,
      counterparty: p.counterparty ?? null,
      accepter: p.accepter ?? null,
      terms: p.termsJson ? JSON.parse(String(p.termsJson)) : null,
    });
  } catch (e) {
    return respond({
      type: "flow.get_agreement.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}
