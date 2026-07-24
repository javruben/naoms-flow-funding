// src/packages/flow-funding/tests/uc-flow-domain-build-materialize.test.ts
//
// 1644 M-TRANSPARENCY — flow-outcome sharer plugin (sharing.flow-funding).
//
// Pure unit coverage of the builder (outbound payload, level-scoped) and the
// materializer (receive-side flow_outcome node). The 2-daemon integ
// (integ-flow-transparency-local-first) drives the LIVE sharing-656 auto-share +
// reshare mechanism + Biscuit caveat on build-host; this asserts the
// level-gating + aggregation + node shape the share rests on, no daemon
// (MBP-runnable, no FFI).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/sharing/flow-domain.ts:1
// @canonical-flow N/A — pure builder/materializer unit (mechanism RED→GREEN is
//   the multi-daemon integ; this is the deterministic logic underneath)
// === END HEADER ===
//
// RED (pre-flow-domain.ts, against the empty package):
//   error: Module not found "./../sharing/flow-domain.ts"
//   (no builder/materializer existed — the share had no payload to carry)
// GREEN (this file, deno test, post-implementation):
//   ok | 5 passed | 0 failed
//   (verbatim run output banked in the M-TRANSPARENCY impl note)

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type {
  SharerBuildContext,
  SharerMaterializeContext,
} from "@naoms/plugins";
import { build, materialize, revoke } from "../sharing/flow-domain.ts";
import {
  authorizeReshare,
  mintFlowShareCapability,
} from "../sharing/biscuit-nhop.ts";

// build() mints a Biscuit capability (process-singleton naoms_core dylib, never
// closed by design) — disable Deno's leak sanitizer, the canonical FFI-test idiom.
const SR = { sanitizeResources: false, sanitizeOps: false };

type SettlementNode = {
  id: string;
  properties: Record<string, unknown>;
};

function buildCtx(
  level: string,
  settlements: SettlementNode[],
): SharerBuildContext {
  return {
    graphQuery: (q: Record<string, unknown>) =>
      q.type === "flow_settlement" ? { nodes: settlements } : { nodes: [] },
    pluginDid: "did:builtin:flow-funding-transparency",
    ownerDid: "did:naoms:holon-self",
    level,
    peerDid: "did:naoms:peer-b",
    connectionId: "conn-1",
    extras: {},
  } as unknown as SharerBuildContext;
}

function settlement(context: string, settledTotal: number): SettlementNode {
  return {
    id: `flow-settlement-self-${context}-${settledTotal}`,
    properties: { holon: "did:naoms:holon-self", context, settledTotal },
  };
}

Deno.test("build: level off discloses nothing", SR, async () => {
  const data = await build(buildCtx("off", [settlement("nao", 100)]));
  assertEquals(data, null, "off → null (privacy baseline)");
});

Deno.test("build: no settlements → null", SR, async () => {
  const data = await build(buildCtx("summary", []));
  assertEquals(data, null, "nothing settled → nothing shared");
});

Deno.test(
  "build: summary aggregates circulation total, omits per-context",
  SR,
  async () => {
    const data = await build(buildCtx("summary", [
      settlement("nao", 100),
      settlement("care", 50),
    ]));
    assert(data, "summary yields data");
    assertEquals(data.total_flowed, 150, "Σ settledTotal");
    assertEquals(data.epoch_count, 2, "epoch count = settlement node count");
    assertEquals(
      data.by_context,
      undefined,
      "summary level does NOT leak per-context breakdown",
    );
  },
);

Deno.test("build: detailed adds per-context breakdown", SR, async () => {
  const data = await build(buildCtx("detailed", [
    settlement("nao", 100),
    settlement("nao", 40),
    settlement("care", 50),
  ]));
  assert(data, "detailed yields data");
  assertEquals(data.total_flowed, 190);
  assertEquals(data.by_context, { nao: 140, care: 50 });
});

Deno.test(
  "materialize: receive side writes a per-peer flow_outcome node; revoke tombstones",
  SR,
  () => {
    const puts: Array<
      { type: string; id: string; properties: Record<string, unknown> }
    > = [];
    const ctx = {
      graphPut: (
        n: { type: string; id: string; properties: Record<string, unknown> },
      ) => puts.push(n),
      graphLink: () => {},
      graphQuery: () => ({ nodes: [] }),
      pluginDid: "did:builtin:flow-funding-transparency",
      ownerDid: "did:naoms:holon-self",
      signerDid: "did:naoms:peer-b",
      chainId: "friendship-chain-xyz",
    } as unknown as SharerMaterializeContext;

    materialize(ctx, {
      level: "summary",
      shared_at: "2026-06-19T00:00:00.000Z",
      data: { total_flowed: 150, epoch_count: 2 },
      terms: { maxHops: 2 },
    });

    assertEquals(puts.length, 1);
    const node = puts[0];
    assertEquals(node.type, "flow_outcome");
    assertEquals(
      node.id,
      "flow-outcome-did:naoms:peer-b",
      "keyed per peer DID",
    );
    assertEquals(node.properties.peer_did, "did:naoms:peer-b");
    assertEquals(node.properties.source, "received");
    assertEquals(node.properties.total_flowed, 150);
    assertEquals(node.properties.epoch_count, 2);
    assertEquals(node.properties.level, "summary");

    revoke(ctx, "did:naoms:peer-b");
    assertEquals(puts.length, 2);
    assertEquals(puts[1].id, "flow-outcome-did:naoms:peer-b");
    assertEquals(puts[1].properties.deleted, 1);
  },
);

Deno.test(
  "build: carries an N-hop capability and relays only in-scope received outcomes (T-26/T-27/T-25)",
  SR,
  async () => {
    // Live received outcome (budget 2) — must be forwarded, attenuated to 1.
    const live = mintFlowShareCapability(2);
    assert(live, "Biscuit FFI available");
    // Spent received outcome (budget driven to 0) — must NOT be forwarded (T-25).
    const minted = mintFlowShareCapability(2)!;
    const h1 = authorizeReshare(minted);
    assert(h1.ok);
    const h2 = authorizeReshare(h1.next);
    assert(h2.ok);
    const spent = h2.next; // hopsRemaining === 0

    const received = [
      {
        id: "flow-outcome-peerX",
        properties: {
          peer_did: "did:naoms:peerX",
          source: "received",
          total_flowed: 70,
          epoch_count: 1,
          contract: live.tokenHex,
          biscuit_root_pub_hex: live.rootPubHex,
          max_hops_remaining: live.hopsRemaining,
        },
      },
      {
        id: "flow-outcome-peerZ",
        properties: {
          peer_did: "did:naoms:peerZ",
          source: "received",
          total_flowed: 999,
          epoch_count: 9,
          contract: spent.tokenHex,
          biscuit_root_pub_hex: spent.rootPubHex,
          max_hops_remaining: spent.hopsRemaining,
        },
      },
    ];
    const ctx = {
      graphQuery: () => ({ nodes: [] }),
      graphQueryAsync: (q: Record<string, unknown>) =>
        Promise.resolve(
          q.type === "flow_settlement"
            ? { nodes: [settlement("nao", 100)] }
            : q.type === "flow_outcome"
            ? { nodes: received }
            : { nodes: [] },
        ),
      pluginDid: "did:builtin:flow-funding-transparency",
      ownerDid: "did:naoms:holon-self",
      level: "summary",
      peerDid: "did:naoms:peer-b",
      connectionId: "conn-1",
      extras: {},
    } as unknown as SharerBuildContext;

    const data = await build(ctx);
    assert(data);

    // T-26 + capability: the direct outcome carries a freshly minted Biscuit cap.
    const capWire = data._capability as {
      contract: string;
      max_hops_remaining: number;
    };
    assert(capWire, "direct share carries a capability");
    assert(capWire.contract.length > 0);
    assertEquals(capWire.max_hops_remaining, 2);

    // T-27 + T-25: the in-scope outcome is relayed (attenuated 2→1); the
    // spent-budget outcome is REFUSED by the Biscuit gate, so it is NOT relayed.
    const fwd = data._forwarded as Array<
      { origin_peer: string; max_hops_remaining: number }
    >;
    assertEquals(fwd.length, 1, "only the in-scope outcome is relayed");
    assertEquals(fwd[0].origin_peer, "did:naoms:peerX");
    assertEquals(fwd[0].max_hops_remaining, 1, "relayed copy attenuated 2 → 1");
  },
);
