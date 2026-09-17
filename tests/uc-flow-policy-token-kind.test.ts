// src/packages/flow-funding/tests/uc-flow-policy-token-kind.test.ts
//
// 1644 M6.1 — FlowPolicy is keyed per (holon, context, token-kind).
//
// Pure unit coverage of the entity-id keying that makes two value substrates
// (e.g. "custom" and "iou") independent policies for the same holon+context.
// The integ test (integ-flow-policy-set-and-read) drives the live supersede +
// fold mechanism; this asserts the deterministic key the whole dimension rests
// on, with no daemon (MBP-runnable).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/types.ts:1
// @canonical-flow N/A — pure function unit
// === END HEADER ===

import {
  assert,
  assertEquals,
  assertNotEquals,
} from "@std/assert";
import { DEFAULT_TOKEN_KIND, flowPolicyEntityId } from "../types.ts";

const HOLON = "did:naoms:holon-a";
const CONTEXT = "nao";

Deno.test("flowPolicyEntityId: token-kind is part of the key", () => {
  const custom = flowPolicyEntityId(HOLON, CONTEXT, "custom");
  const iou = flowPolicyEntityId(HOLON, CONTEXT, "iou");
  const ciku = flowPolicyEntityId(HOLON, CONTEXT, "ciku");

  // Distinct kinds → distinct policy entities (no cross-kind supersede).
  assertNotEquals(custom, iou, "custom and iou are distinct policy entities");
  assertNotEquals(custom, ciku, "custom and ciku are distinct policy entities");
  assertNotEquals(iou, ciku, "iou and ciku are distinct policy entities");

  assertEquals(custom, `flow-policy-${HOLON}-${CONTEXT}-custom`);
  assertEquals(iou, `flow-policy-${HOLON}-${CONTEXT}-iou`);
});

Deno.test("flowPolicyEntityId: defaults to the token substrate default kind", () => {
  // A policy armed without naming a kind keys identically on set and read,
  // because both default to DEFAULT_TOKEN_KIND.
  assertEquals(DEFAULT_TOKEN_KIND, "custom", "default matches token substrate");
  assertEquals(
    flowPolicyEntityId(HOLON, CONTEXT),
    flowPolicyEntityId(HOLON, CONTEXT, DEFAULT_TOKEN_KIND),
    "2-arg call resolves to the default-kind key",
  );
  assertEquals(
    flowPolicyEntityId(HOLON, CONTEXT),
    `flow-policy-${HOLON}-${CONTEXT}-custom`,
  );
});

Deno.test("flowPolicyEntityId: same holon+context+kind is stable across calls", () => {
  // Versions update in place under one entity id — the id must be deterministic.
  const a = flowPolicyEntityId(HOLON, CONTEXT, "iou");
  const b = flowPolicyEntityId(HOLON, CONTEXT, "iou");
  assertEquals(a, b, "deterministic for a fixed (holon, context, kind)");
  assert(a.endsWith("-iou"), "kind is the trailing key segment");
});
