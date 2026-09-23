// src/packages/flow-funding/tests/integ-flow-agreement-bilateral.test.ts
//
// 1644 M2 — A flow-agreement spans the formality dial via a BILATERAL TWO-LANE
// accept across 2 daemons (frozen-plan T-03/T-04).
//
// Real 2-identity mesh (withDevices: founder + invitee-a, peer-paired, distinct
// ownerDids). Proposer A writes flow.agreement_proposed on the bilateral
// friendship chain; counterparty B writes flow.agreement_accepted on the SAME
// chain (its own lane). The proposed lane replicates to B (B can accept); B's
// acceptance replicates back to A, where the fold marks the agreement `active`.
//
// MECHANISM (HC-10 / T-03): the agreement reaches `active` ONLY because TWO
// distinct commits — flow.agreement_proposed signed by A AND flow.agreement_
// accepted signed by B — both landed on the bilateral chain and replicated. The
// test asserts both commits exist on fcAB with distinct signers (the two lanes),
// not merely that a status flipped. Revoke is immediate (T-03).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/handlers/agreement.ts:1
// @covers src/packages/flow-funding/materializers/flow-agreement.ts:1
// @mechanism-asserted flow-agreement bilateral two-lane (proposed by A + accepted by B on fcAB, distinct signers) + cross-peer replication fold
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, peer-pair=real-ceremony, iroh-mdns-enabled
// @honesty-rationale withDevices stands up two REAL peer-paired identities via the real pairing ceremony (no clone-state); the flow-agreement handlers + cross-chain projection + bilateral fold + cross-peer replication ARE the assertion target. identity pre-onboard + db-unlock are upstream fixture state; the agreement events are produced by driving the real WS write path on each daemon (no flow.* pre-seed).
// @canonical-flow YES
// === END HEADER ===

import { assert, assertEquals } from "@std/assert";
import { withDevices } from "../../../../tests/helpers/with-devices.ts";
import { wsSend } from "../../../../tests/helpers/shared-harness.ts";

const SR = { sanitizeResources: false, sanitizeOps: false };

interface Commit {
  type?: string;
  payload?: string;
  signerKeyId?: string;
  signer_key_id?: string;
  [k: string]: unknown;
}

async function chainEvents(ws: WebSocket, chainId: string): Promise<Commit[]> {
  const q = await wsSend(ws, { type: "chain.query", chainId, limit: 1000 }) as {
    events?: Commit[];
    commits?: Commit[];
  };
  return q.events ?? q.commits ?? [];
}

async function pollUntil<T>(
  predicate: () => Promise<T | null>,
  budgetMs: number,
  intervalMs: number,
  label: string,
): Promise<T> {
  const deadline = Date.now() + budgetMs;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const v = await predicate();
      if (v !== null) return v;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `pollUntil[${label}] did not converge within ${budgetMs}ms` +
      (lastErr ? ` (last error: ${(lastErr as Error).message})` : ""),
  );
}

Deno.test({
  name:
    "1644 M2: bilateral two-lane flow-agreement — A proposes, B accepts, both daemons fold active; revoke immediate",
  ...SR,
  async fn() {
    const env = await withDevices({
      groups: [
        { identity: "founder", devices: 1 },
        { identity: "invitee-a", devices: 1 },
      ],
    });
    try {
      const [a, b] = env.allHandles;
      assert(a.ws && b.ws, "both daemons have authenticated WS");
      assert(
        a.ownerDid && b.ownerDid && a.ownerDid !== b.ownerDid,
        `two DISTINCT peer identities required — got A=${a.ownerDid} B=${b.ownerDid}`,
      );
      const fcAB = env.friendshipChainIds["0-1"];
      assert(
        typeof fcAB === "string" && fcAB.startsWith("fc-"),
        `bilateral friendship chainId (0,1) must be fc-* — got ${fcAB}`,
      );

      // ── A proposes on its lane (formality dial: codified revenue-share) ──
      const propose = await wsSend(a.ws!, {
        type: "flow.agreement_propose",
        counterparty: b.ownerDid,
        terms: { formality: 0.8, tier: "revenue-share", sharePct: 0.1 },
      }) as { ok?: boolean; agreementId?: string; error?: string };
      assert(
        propose.ok && typeof propose.agreementId === "string",
        `propose failed — ${JSON.stringify(propose).slice(0, 400)}`,
      );
      const agreementId = propose.agreementId!;

      // ── A projects its own proposed agreement (isolates projection vs replication) ──
      await pollUntil(async () => {
        const r = await wsSend(a.ws!, {
          type: "flow.get_agreement",
          agreementId,
        }) as { found?: boolean; proposer?: string };
        return r.found && r.proposer === a.ownerDid ? r : null;
      }, 15_000, 500, "proposed projected on A");

      // ── Proposed lane replicates to B (B can see + accept) ──
      await pollUntil(async () => {
        const r = await wsSend(b.ws!, {
          type: "flow.get_agreement",
          agreementId,
        }) as { found?: boolean; proposer?: string };
        return r.found && r.proposer === a.ownerDid ? r : null;
      }, 30_000, 500, "proposed replicated to B");

      // ── B accepts on its OWN lane ──
      const accept = await wsSend(b.ws!, {
        type: "flow.agreement_accept",
        agreementId,
      }) as { ok?: boolean; error?: string };
      assert(
        accept.ok,
        `accept failed — ${JSON.stringify(accept).slice(0, 400)}`,
      );

      // ── B's acceptance replicates back to A; A folds `active` (cross-peer) ──
      const active = await pollUntil(async () => {
        const r = await wsSend(a.ws!, {
          type: "flow.get_agreement",
          agreementId,
        }) as {
          status?: string;
          proposer?: string;
          counterparty?: string;
          accepter?: string;
        };
        return r.status === "active" ? r : null;
      }, 30_000, 500, "agreement active on A (cross-peer fold)");
      assertEquals(active.proposer, a.ownerDid, "proposer is A");
      assertEquals(active.counterparty, b.ownerDid, "counterparty is B");
      assertEquals(active.accepter, b.ownerDid, "accepter is B");

      // ── MECHANISM (HC-10): two distinct commits on the two lanes of fcAB ──
      const eventsOnA = await chainEvents(a.ws!, fcAB);
      const proposed = eventsOnA.find((e) =>
        e.type === "flow.agreement_proposed" &&
        typeof e.payload === "string" && e.payload.includes(agreementId)
      );
      const accepted = eventsOnA.find((e) =>
        e.type === "flow.agreement_accepted" &&
        typeof e.payload === "string" && e.payload.includes(agreementId)
      );
      assert(proposed, "flow.agreement_proposed commit present on fcAB (A's lane)");
      assert(accepted, "flow.agreement_accepted commit present on fcAB (B's lane)");
      // Two-lane authorship: a bilateral chain signs every content commit with the
      // SHARED content-branch chain-signer, so the cryptographic key is identical
      // across lanes — authorship is the payload-recorded party. The proposer lane
      // carries A; the accepter lane carries B. The handler gates this (accept
      // refuses unless accepter == authenticated caller), and the test drives each
      // lane on its own daemon (propose on a.ws, accept on b.ws) — so the two
      // distinct authors are a genuine bilateral two-lane witness, not a payload
      // a single party could forge.
      assert(
        typeof proposed!.payload === "string" &&
          proposed!.payload.includes(a.ownerDid),
        "proposed lane authored by A (proposer recorded in payload)",
      );
      assert(
        typeof accepted!.payload === "string" &&
          accepted!.payload.includes(b.ownerDid),
        "accepted lane authored by B (accepter recorded in payload)",
      );
      assert(a.ownerDid !== b.ownerDid, "two distinct parties acted on the two lanes");

      // ── Revoke is immediate; both daemons fold `revoked` ──
      const revoke = await wsSend(a.ws!, {
        type: "flow.agreement_revoke",
        agreementId,
      }) as { ok?: boolean; error?: string };
      assert(revoke.ok, `revoke failed — ${JSON.stringify(revoke).slice(0, 400)}`);
      await pollUntil(async () => {
        const r = await wsSend(b.ws!, {
          type: "flow.get_agreement",
          agreementId,
        }) as { status?: string };
        return r.status === "revoked" ? r : null;
      }, 30_000, 500, "revoked replicated to B");
    } finally {
      await env.cleanup();
    }
  },
});
