// src/packages/flow-funding/tests/integ-flow-transparency-local-first.test.ts
//
// 1644 M-TRANSPARENCY (T-26) — a holon's flow outcome auto-shares LOCAL-FIRST to
// its DIRECT peer, carrying the N-hop Biscuit capability, over the LIVE
// sharing-656 reshare mechanism across two real daemons.
//
// This is the multi-daemon mechanism proof underneath the pure builder/
// materializer unit (uc-flow-domain-build-materialize) and the pure Biscuit
// lifecycle unit (uc-flow-biscuit-nhop). Those assert the deterministic logic
// with real FFI but no peer fan-out. THIS test asserts the WHOLE path:
//
//   alice + bob run a FRESH peer-pair handshake (spawnPair + pairPeers) →
//   respondHandshakeInternal installs the bilateral friendship-chain signer
//   peer-keys LIVE during the ceremony → alice flips her per-connection
//   `sharing.flow-funding` level to `summary` for the bob connection → alice
//   arms a flow band + settles an epoch → a real `flow_settlement` graph node
//   lands → the core sharing reshare loop (`evaluateReshare`) matches the
//   flow-funding domain's triggerKinds (`flow_settlement`), runs `build()`
//   (which reads the settlement and mints a Biscuit capability), emits
//   `friendship.share.flow-funding` over the friendship-chain gossip → bob's
//   dispatch enricher materializes a `flow_outcome` graph node on bob's side.
//
// === WHY FRESH HANDSHAKE, NOT A PRE-PAIRED FIXTURE (2026-06-19) ===
// The prior revision spawned the `founder-with-friend-invitee-a` / `invitee-a`
// PRE-PAIRED fixture pair. On a branch 2772 commits behind origin/main (the
// 1682 cross-peer signer-key receiver fix `1456e5ba2cb` is on main but NOT on
// this branch), that stale pre-paired fixture genuinely LACKS the converged
// friendship-chain signer peer-keys, so bob rejected the share commit with
// `signature verification FAILED ... chain:fc-…:content:0` (the 1593-class
// cross-peer signer-key gap). A FRESH `spawnPair(founder, invitee-a)` +
// `pairPeers` runs the real ceremony: `respondHandshakeInternal` INSTALLS the
// friendship-chain signer peer-keys live, exactly the keys the stale fixture
// is missing. (Asymmetric-fixture note: `invitee-a`'s fixture carries the
// bilateral chain but plain `founder`'s DB does not, so pairPeers' BOTH-sides
// pre-existing-friendship probe does NOT short-circuit — the fresh ceremony
// genuinely runs. Same identity pair the canonical
// integ-sharing-auto-share-fresh-handshake test uses.)
//
// MECHANISM (not outcome-only): bob's `flow_outcome` must carry alice's
// settledTotal (300) AND the Biscuit `contract` (non-empty) AND
// `max_hops_remaining === 2`. If the flow-funding domain were not registered, or
// build() returned null (off / empty), or the capability did not ride along,
// bob's flow_outcome count is 0 (or contract is null) and the test FAILS. That is
// the theatre check — there is no pre-seed of bob's flow_outcome anywhere in this
// file; the only way it appears is the production share path firing end-to-end.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/sharing/flow-domain.ts:1
// @mechanism-asserted sharing-656 auto-share carries flow_outcome + Biscuit capability rides (contract non-null, max_hops_remaining===2) over a FRESH peer-pair handshake (live signer-key install); AND a settle racing the opt-in's _sharingSuppress window still delivers via the deterministic post-settle trigger (does NOT mask the reactive-path drop)
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, device-pair=pre-onboarded-fixture, keychain=fixture-shares-file, kronos-disabled, iroh-mdns-disabled, mls-real-ffi-forced
// @honesty-rationale Two real daemons (alice=founder + bob=invitee-a), paired by
//   a FRESH peer-pair ceremony (spawnPair + pairPeers — NOT a pre-paired
//   fixture), so the bilateral friendship chain AND its cross-peer signer-keys
//   are installed LIVE by respondHandshakeInternal during the handshake (the
//   same production path the canonical integ-sharing-auto-share-fresh-handshake
//   test exercises). The flow band is armed by the real flow.policy_set write
//   path, the epoch is settled by the real flow.epoch_settle handler (NOT a
//   pre-seeded flow_settlement), and the share level is flipped via the real
//   sharing.apply_decisions op (the production trigger of the reshare loop). The
//   Biscuit capability is minted by real packs FFI inside build(). bob's
//   flow_outcome is materialized by the real dispatch enricher — never
//   pre-seeded. db-unlock/keychain via fixture credentials keep the test
//   deterministic above the mechanism boundary; biometric unlock is human-gated.
//   identity pre-onboarded so the test starts post-onboarding; the peer-PAIR is
//   NOT pre-seeded — it is the fresh ceremony. iroh mDNS disabled so concurrent
//   test daemons do not cross-discover; pairPeers injects the peer addr. kronos
//   disabled so scheduled re-publishes do not race the deterministic poll.
//   mls-real-ffi-forced so the chain-write surface signs through the real bridge.
// @canonical-flow YES
// @pre-seeds device.onboarded (founder + invitee-a fixtures); friendship.connected is NOT pre-seeded (fresh pairPeers ceremony)
// === END HEADER ===
//
// RED (mechanism absent): with the flow-funding domain unregistered (or build()
//   short-circuited to `return null`), the reshare loop carries no flow-funding
//   payload, bob's `flow_outcome` count stays 0, and the poll fails at 30s with
//   "no flow_outcome node materialized on bob's side". Verbatim RED/GREEN banked
//   in the M-TRANSPARENCY step-04 verify note.

import { assert, assertEquals } from "jsr:@std/assert";

const FLOW_DOMAIN = "sharing.flow-funding";

interface GraphNode {
  id?: string;
  properties?: Record<string, unknown>;
}

async function graphQuery(
  ws: WebSocket,
  wsSend: (
    ws: WebSocket,
    msg: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>,
  pattern: Record<string, unknown>,
): Promise<GraphNode[]> {
  const resp = await wsSend(ws, { type: "graph.query", pattern }) as {
    nodes?: GraphNode[];
    error?: string;
  };
  if (resp.error) throw new Error(`graph.query failed: ${resp.error}`);
  return resp.nodes ?? [];
}

/** Poll bob's graph for the per-peer flow_outcome node from alice. */
async function pollFlowOutcome(
  ws: WebSocket,
  wsSend: (
    ws: WebSocket,
    msg: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>,
  aliceDid: string,
  budgetMs: number,
): Promise<GraphNode | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    // Keyed `flow-outcome-${peerDid}` by the materializer.
    const byId = await graphQuery(ws, wsSend, {
      id: `flow-outcome-${aliceDid}`,
    });
    const direct = byId.find((n) =>
      (n.properties?.source as string | undefined) === "received"
    );
    if (direct) return direct;
    // Fallback: scan all received flow_outcome rows (peer_did keying may vary
    // by whether bob's view resolves alice's owner vs operational DID — the
    // materializer keys on ctx.signerDid, not ownerDid).
    const all = await graphQuery(ws, wsSend, {
      type: "flow_outcome",
      where: { source: "received" },
      limit: 50,
    });
    if (all.length > 0) return all[0];
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const RUN = Deno.env.get("NAOMS_INTEG_FLOW_TRANSPARENCY") !== "0";

Deno.test({
  name:
    "1644 M-TRANSPARENCY T-26: alice's flow outcome auto-shares to direct peer " +
    "bob carrying the Biscuit capability (sharing-656 reshare, FRESH handshake)",
  sanitizeResources: false,
  sanitizeOps: false,
  ignore: !RUN,
  async fn(t) {
    const { spawnPair, wsSend, pairPeers } = await import(
      "../../../../tests/helpers/shared-harness.ts"
    );
    const { installActionApprovalAutoGrant } = await import(
      "../../../../tests/helpers/drive-action-approval.ts"
    );

    // Fresh peer-pair: alice=founder (plain, NOT pre-paired), bob=invitee-a.
    // spawnPair boots both daemons (vaults unlocked); pairPeers drives the real
    // ceremony, installing the friendship-chain signer peer-keys LIVE.
    const pair = await spawnPair({
      label: "1644-flow-transparency",
      settleMs: 4000,
      aliceIdentity: "founder",
      bobIdentity: "invitee-a",
      extraEnv: { NAOMS_NO_KRONOS: "1" },
    });

    try {
      const aliceWs = pair.alice.ws!;
      const bobWs = pair.bob.ws!;
      assert(
        aliceWs,
        "alice WS must be authenticated (fixtureStage onboarded)",
      );
      assert(bobWs, "bob WS must be authenticated (fixtureStage onboarded)");

      // Owner/action-tier ops (flow.policy_set, sharing.apply_decisions) are
      // approval-gated. The auto-grant resolves alice's per-spawn app password
      // from the harness registry (spawnDaemon binds it at unlock — see
      // tests/helpers/AGENTS.md "Per-WS app-password registry"); callers MUST
      // NOT thread the password through the public API.
      installActionApprovalAutoGrant(aliceWs);

      let friendshipChainId = "";
      let aliceDid = "";
      let bobDid = "";

      await t.step(
        "FRESH peer-pair handshake (spawnPair + pairPeers)",
        async () => {
          const { aliceOwnerDid, bobOwnerDid, fcId } = await pairPeers({
            alice: pair.alice,
            bob: pair.bob,
          });
          assert(
            aliceOwnerDid && bobOwnerDid && aliceOwnerDid !== bobOwnerDid,
            "peer-pair must produce two distinct owner DIDs (alice + bob)",
          );
          assert(
            aliceOwnerDid.startsWith("did:key:"),
            `aliceDid: ${aliceOwnerDid}`,
          );
          assert(bobOwnerDid.startsWith("did:key:"), `bobDid: ${bobOwnerDid}`);
          assert(
            typeof fcId === "string" && fcId.startsWith("fc-"),
            `pairPeers must return an fc-* friendship chainId, got ${fcId}`,
          );
          aliceDid = aliceOwnerDid;
          bobDid = bobOwnerDid;
          friendshipChainId = fcId;
        },
      );

      // Confirm alice sees bob as a connected contact on the fresh fc-* chain.
      await t.step(
        "alice: bob is a connected contact on the fresh fc-* chain",
        async () => {
          const resp = await wsSend(aliceWs, { type: "connect.contacts" }) as {
            contacts?: Array<Record<string, unknown>>;
          };
          const contacts = resp.contacts ?? [];
          const bob = contacts.find((c) =>
            c.peerDid === bobDid && c.status === "connected"
          );
          assert(
            bob,
            `alice must see bob as a connected contact after pairPeers. Got ${
              JSON.stringify(contacts).slice(0, 300)
            }`,
          );
          const cid = (bob!.chainId ?? bob!.chain_id) as string;
          assertEquals(
            cid,
            friendshipChainId,
            "alice's contact-row chainId must match pairPeers fcId",
          );
        },
      );

      const context = "nao";

      // Helper: arm the viability band (idempotent across epochs).
      async function armBand() {
        const arm = await wsSend(aliceWs, {
          type: "flow.policy_set",
          context,
          params: {
            floor: 100,
            ceiling: 500,
            gradient: 0,
            perClaimantCap: 0.6,
          },
        }) as { ok?: boolean; error?: string };
        assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);
      }

      // Helper: settle one epoch (balance 800 → surplus 300 above ceiling, two
      // equal claimants need 200 each → settledTotal 300). Returns nothing; the
      // assertion is on settledTotal conservation.
      async function settleEpoch() {
        const settle = await wsSend(aliceWs, {
          type: "flow.epoch_settle",
          context,
          balance: 800,
          claimants: [
            { id: "did:nao:dependent-a", need: 200, trustWeight: 1 },
            { id: "did:nao:dependent-b", need: 200, trustWeight: 1 },
          ],
        }) as { ok?: boolean; settledTotal?: number; error?: string };
        assert(settle.ok, `epoch_settle ok — ${JSON.stringify(settle)}`);
        assertEquals(
          settle.settledTotal,
          300,
          "CONSERVATION: Σ(out) == surplus 300 (the value bob must receive)",
        );
      }

      // ===== DISAMBIGUATION SEQUENCING (2026-06-20) =====
      // The prior revision opted-in then settled 72ms apart, so the settle's
      // reactive reshare could race the opt-in's _sharingSuppress/debounce
      // window (sharing-engine.ts:166 early-return, broadcast.ts:430 skip-while-
      // suppressed). To prove which trigger path emits the flow-funding share we
      // SPACE the phases ~1.5s apart so each reshare fires cleanly:
      //   PHASE 1: settle epoch-1 FIRST → a flow_settlement node already exists.
      //   PHASE 2: opt-in flow-funding=summary → the OPT-IN's own evaluateReshare
      //            now builds flow-funding WITH the settlement present → emits.
      //   PHASE 3: settle epoch-2 → a clean settle-triggered reshare, no
      //            concurrent opt-in in the suppress window.
      // Either path materializing bob's flow_outcome proves the product correct.

      await t.step(
        "PHASE 1 — alice: arm band + settle epoch-1 (flow_settlement lands BEFORE opt-in)",
        async () => {
          await armBand();
          await settleEpoch();

          // Confirm the settlement projected as a graph node alice can build from.
          const nodes = await graphQuery(aliceWs, wsSend, {
            type: "flow_settlement",
            limit: 50,
          });
          assert(
            nodes.some((n) =>
              Math.abs(Number(n.properties?.settledTotal ?? -1) - 300) < 1e-6
            ),
            `flow_settlement node with settledTotal 300 must exist on alice after ` +
              `epoch-1 — got ${JSON.stringify(nodes).slice(0, 300)}`,
          );

          // Quiescence: let any reactive reshare + suppress window fully drain
          // before the opt-in, so the next evaluateReshare is unraced.
          await new Promise((r) => setTimeout(r, 1500));
        },
      );

      await t.step(
        "PHASE 2 — alice: decide flow-funding=summary (opt-in's evaluateReshare builds WITH settlement present)",
        async () => {
          const resp = await wsSend(aliceWs, {
            type: "sharing.apply_decisions",
            connectionId: friendshipChainId,
            peerDid: bobDid,
            chainId: friendshipChainId,
            decisions: { [FLOW_DOMAIN]: "summary" },
          }) as { ok?: boolean; error?: string };
          assert(
            resp.ok === true,
            `sharing.apply_decisions failed: ${
              resp.error ?? JSON.stringify(resp)
            }`,
          );

          // The outbound sharing_domain row must now exist at summary — proof the
          // decision actually opted flow-funding in (not a silent no-op).
          const rows = await graphQuery(aliceWs, wsSend, {
            type: "sharing_domain",
            where: { domain: FLOW_DOMAIN, direction: "outbound" },
            limit: 50,
          });
          assert(
            rows.some((n) =>
              (n.properties?.peer_did as string | undefined) === bobDid &&
              n.properties?.level === "summary"
            ),
            `alice must carry an outbound ${FLOW_DOMAIN}=summary row for bob ` +
              `after the decision; got ${JSON.stringify(rows).slice(0, 300)}`,
          );

          // Quiescence: let the opt-in-triggered reshare + suppress drain before
          // the second settle, so PHASE 3 is a clean settle-only reshare.
          await new Promise((r) => setTimeout(r, 1500));
        },
      );

      await t.step(
        "PHASE 3 — alice: settle epoch-2 (clean settle-triggered reshare, no concurrent opt-in)",
        async () => {
          await settleEpoch();

          const nodes = await graphQuery(aliceWs, wsSend, {
            type: "flow_settlement",
            limit: 50,
          });
          assert(
            nodes.some((n) =>
              Math.abs(Number(n.properties?.settledTotal ?? -1) - 300) < 1e-6
            ),
            `flow_settlement node with settledTotal 300 must exist on alice after ` +
              `epoch-2 — got ${JSON.stringify(nodes).slice(0, 300)}`,
          );

          await new Promise((r) => setTimeout(r, 1500));
        },
      );

      await t.step(
        "bob: flow_outcome materializes carrying alice's settledTotal + Biscuit capability",
        async () => {
          const node = await pollFlowOutcome(bobWs, wsSend, aliceDid, 30_000);
          assert(
            node,
            "bob-side: no flow_outcome node materialized within 30s. The flow " +
              "sharer is the only mint surface, so absence means the reshare " +
              "loop didn't run, build() returned null, or the dispatch enricher " +
              "didn't materialize — see flow-domain.ts:build/materialize and " +
              "register.ts (domain + dispatch-enricher registration).",
          );
          const props = node!.properties ?? {};

          // MECHANISM 1 — the VALUE rode across: alice's conserved settledTotal.
          // build() aggregates ALL of alice's flow_settlement nodes (flow-domain.ts
          // sums settledTotal over every settlement, epoch_count = node count). The
          // disambiguation sequencing settles TWO epochs of surplus 300 (PHASE 1 +
          // PHASE 3), so the conserved total bob receives is 2 × 300 = 600 across
          // epoch_count 2. (CONSERVATION holds per-epoch at 300 — asserted on alice
          // in each settle step; the shared aggregate is their sum.)
          assertEquals(
            Number(props.total_flowed),
            600,
            `bob's flow_outcome.total_flowed must equal alice's aggregated ` +
              `settledTotal 600 (2 epochs × surplus 300); ` +
              `got ${JSON.stringify(props).slice(0, 300)}`,
          );
          assertEquals(
            Number(props.epoch_count),
            2,
            `bob's flow_outcome.epoch_count must be 2 (two settled epochs rode ` +
              `across); got ${JSON.stringify(props).slice(0, 300)}`,
          );

          // MECHANISM 2 — the Biscuit capability rode across (contract non-empty).
          const contract = props.contract;
          assert(
            typeof contract === "string" && contract.length > 0,
            `bob's flow_outcome.contract must be a non-empty Biscuit token (the ` +
              `N-hop capability minted in build()); got ${
                JSON.stringify(contract)
              }`,
          );

          // MECHANISM 3 — the hop budget is the freshly minted ceiling (2).
          assertEquals(
            Number(props.max_hops_remaining),
            2,
            `bob's flow_outcome.max_hops_remaining must be 2 (FLOW_SHARE_MAX_HOPS, ` +
              `fresh direct share); got ${JSON.stringify(props).slice(0, 300)}`,
          );

          assertEquals(
            props.source,
            "received",
            "flow_outcome must be a received (not self-authored) node on bob",
          );
        },
      );

      // ===== RACE-SURVIVAL (2026-06-20) — do NOT mask the suppress race =====
      // The phases above settle BEFORE opt-in, which proves the reactive path
      // works when UNRACED — but side-steps the realistic prod sequence
      // (opt-in, THEN a settlement lands shortly after, inside the opt-in
      // reshare's _sharingSuppress window). The reactive evaluateReshare DROPS a
      // graph.changed under suppress (sharing-engine.ts:166, no re-queue), so
      // without a deterministic trigger that settlement's reshare would silently
      // vanish. This step EXERCISES that order: re-apply the opt-in (entering a
      // fresh suppress window) then settle IMMEDIATELY with no quiescence, and
      // asserts bob's aggregate still climbs — proof the deterministic
      // post-settle trigger (epoch-settle → triggerFlowReshareAfterSettle)
      // delivers where the reactive path alone would drop the settle.
      await t.step(
        "RACE: opt-in re-applied then settle with NO spacing still delivers (deterministic trigger survives _sharingSuppress)",
        async () => {
          // Re-apply the decision → fires an opt-in reshare (enters suppress)…
          await wsSend(aliceWs, {
            type: "sharing.apply_decisions",
            connectionId: friendshipChainId,
            peerDid: bobDid,
            chainId: friendshipChainId,
            decisions: { [FLOW_DOMAIN]: "summary" },
          });
          // …then settle epoch-3 IMMEDIATELY (no await/delay) so its
          // graph.changed can land inside the opt-in reshare's suppress window.
          await settleEpoch();

          // bob's aggregate must reach 3 × 300 = 900 — the racy settle delivered.
          const deadline = Date.now() + 30_000;
          let delivered = false;
          let lastTotal: unknown = undefined;
          while (Date.now() < deadline) {
            const node = await pollFlowOutcome(bobWs, wsSend, aliceDid, 1000);
            lastTotal = node?.properties?.total_flowed;
            if (node && Number(node.properties?.total_flowed) === 900) {
              delivered = true;
              break;
            }
          }
          assert(
            delivered,
            "racy opt-in→settle must still deliver via the deterministic " +
              "post-settle trigger (bob.total_flowed → 900 across 3 epochs); the " +
              "reactive path alone would silently drop the suppressed settle. " +
              `last observed total_flowed=${JSON.stringify(lastTotal)}`,
          );
        },
      );
    } finally {
      await pair.teardown();
    }
  },
});
