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
      q.type === "flow_settlement"
        ? { nodes: settlements }
        : { nodes: [] },
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

Deno.test("build: level off discloses nothing", async () => {
  const data = await build(buildCtx("off", [settlement("nao", 100)]));
  assertEquals(data, null, "off → null (privacy baseline)");
});

Deno.test("build: no settlements → null", async () => {
  const data = await build(buildCtx("summary", []));
  assertEquals(data, null, "nothing settled → nothing shared");
});

Deno.test("build: summary aggregates circulation total, omits per-context", async () => {
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
});

Deno.test("build: detailed adds per-context breakdown", async () => {
  const data = await build(buildCtx("detailed", [
    settlement("nao", 100),
    settlement("nao", 40),
    settlement("care", 50),
  ]));
  assert(data, "detailed yields data");
  assertEquals(data.total_flowed, 190);
  assertEquals(data.by_context, { nao: 140, care: 50 });
});

Deno.test("materialize: receive side writes a per-peer flow_outcome node; revoke tombstones", () => {
  const puts: Array<{ type: string; id: string; properties: Record<string, unknown> }> = [];
  const ctx = {
    graphPut: (n: { type: string; id: string; properties: Record<string, unknown> }) =>
      puts.push(n),
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
  assertEquals(node.id, "flow-outcome-did:naoms:peer-b", "keyed per peer DID");
  assertEquals(node.properties.peer_did, "did:naoms:peer-b");
  assertEquals(node.properties.source, "received");
  assertEquals(node.properties.total_flowed, 150);
  assertEquals(node.properties.epoch_count, 2);
  assertEquals(node.properties.level, "summary");

  revoke(ctx, "did:naoms:peer-b");
  assertEquals(puts.length, 2);
  assertEquals(puts[1].id, "flow-outcome-did:naoms:peer-b");
  assertEquals(puts[1].properties.deleted, 1);
});
