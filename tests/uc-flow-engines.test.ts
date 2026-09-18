// src/packages/flow-funding/tests/uc-flow-engines.test.ts — 1644 M3 engines (unit).
//
// Pure-function unit coverage of the M3 anti-hoarding engines: accrual (CIKU
// heartbeat-attested, no wall clock), gradient outflow, activity-decay of a
// claim, and the conserved + capped trust-weighted allocator. No daemon, no FFI.
//
// Mechanism witnesses (HC-04 / HC-01 / HC-05):
//   - accrue/decayClaim take an ATTESTED elapsed/epoch arg and read NO clock —
//     the no-wall-clock contract is structural (the signature has no time source).
//   - the allocator REFUSES LOUD (FlowConservationError) when surplus exceeds the
//     eligible absorbable capacity — the conservation refuse path, not a clamp.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/engine/accrual.ts:1
// @covers src/packages/flow-funding/engine/gradient.ts:1
// @covers src/packages/flow-funding/engine/activity-decay.ts:1
// @covers src/packages/flow-funding/engine/allocate.ts:1
// @mechanism-asserted no-wall-clock accrual/decay (attested-elapsed signature) + conservation refuse-loud path
// @canonical-flow N/A (pure unit — engines are exercised end-to-end by integ-flow-epoch-settle-conservation)
// === END HEADER ===

import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from "@std/assert";
import { accrue, FlowAccrualError } from "../engine/accrual.ts";
import { FlowGradientError, gradientOutflow } from "../engine/gradient.ts";
import { decayClaim, FlowDecayError } from "../engine/activity-decay.ts";
import {
  allocate,
  type FlowClaimant,
  FlowConservationError,
} from "../engine/allocate.ts";

Deno.test("accrue: floor(attestedElapsed) × rate (CIKU pattern, no clock)", () => {
  assertEquals(accrue(2, 3), 6);
  assertEquals(accrue(2, 3.9), 6, "elapsed is floored to whole attested units");
  assertEquals(accrue(0, 100), 0);
  assertEquals(accrue(5, 0), 0);
});

Deno.test("accrue: refuses loud on invalid input (no silent clamp)", () => {
  assertThrows(() => accrue(-1, 3), FlowAccrualError);
  assertThrows(() => accrue(2, -1), FlowAccrualError);
  assertThrows(() => accrue(NaN, 3), FlowAccrualError);
  assertThrows(() => accrue(2, NaN), FlowAccrualError);
});

Deno.test("gradientOutflow: no surplus at/below ceiling", () => {
  assertEquals(gradientOutflow(100, 50, 100, 0), 0);
  assertEquals(gradientOutflow(80, 50, 100, 0), 0);
});

Deno.test("gradientOutflow: hard switch (gradient 0) flows ALL surplus", () => {
  assertEquals(gradientOutflow(130, 50, 100, 0), 30);
});

Deno.test("gradientOutflow: smooth ramp (gradient>0) eases just-over-ceiling out", () => {
  // band = 100-50 = 50; gradient 1 → ramp over surplus/(1*50).
  // surplus 10 → fraction min(1, 10/50)=0.2 → outflow 2.
  assertAlmostEquals(gradientOutflow(110, 50, 100, 1), 2, 1e-9);
  // a large surplus still flows (asymptotically) in full: surplus 100 → fraction 1 → 100.
  assertAlmostEquals(gradientOutflow(200, 50, 100, 1), 100, 1e-9);
  // smooth flows STRICTLY LESS than hard for a small surplus (the mechanism).
  assert(
    gradientOutflow(110, 50, 100, 1) < gradientOutflow(110, 50, 100, 0),
    "smooth gradient throttles a small surplus vs the hard switch",
  );
});

Deno.test("gradientOutflow: refuses loud on inverted band / bad gradient", () => {
  assertThrows(() => gradientOutflow(100, 100, 50, 0), FlowGradientError); // ceiling<floor
  assertThrows(() => gradientOutflow(100, 50, 100, 2), FlowGradientError); // gradient>1
});

Deno.test("decayClaim: geometric decay of a claim; identity at 0 inactive", () => {
  assertEquals(decayClaim(100, 0, 0.1), 100);
  assertAlmostEquals(decayClaim(100, 1, 0.1), 90, 1e-9);
  assertAlmostEquals(decayClaim(100, 2, 0.1), 81, 1e-9);
  assertEquals(decayClaim(100, 5, 1), 0, "decayRate 1 zeroes the claim after inactivity");
});

Deno.test("decayClaim: refuses loud on invalid input", () => {
  assertThrows(() => decayClaim(-1, 1, 0.1), FlowDecayError);
  assertThrows(() => decayClaim(100, -1, 0.1), FlowDecayError);
  assertThrows(() => decayClaim(100, 1, 1.5), FlowDecayError);
});

Deno.test("allocate: conserved need×trust split (Σ(out) == surplus)", () => {
  const claimants: FlowClaimant[] = [
    { id: "a", need: 60, trustWeight: 1 },
    { id: "b", need: 60, trustWeight: 1 },
  ];
  const out = allocate(100, claimants);
  const total = out.reduce((s, o) => s + o.amount, 0);
  assertAlmostEquals(total, 100, 1e-9, "conservation: Σ(out) == surplus");
  // equal need + equal trust → equal split (each below its 60 need).
  assertAlmostEquals(out[0].amount, 50, 1e-9);
  assertAlmostEquals(out[1].amount, 50, 1e-9);
});

Deno.test("allocate: trust-weight tilts the split (terrain), still conserved", () => {
  const out = allocate(90, [
    { id: "trusted", need: 100, trustWeight: 2 },
    { id: "farmed", need: 100, trustWeight: 1 }, // a sybil-farmed low-weight edge
  ]);
  assertAlmostEquals(out[0].amount, 60, 1e-9, "2:1 trust → 60");
  assertAlmostEquals(out[1].amount, 30, 1e-9, "1 part → 30");
  assertAlmostEquals(out[0].amount + out[1].amount, 90, 1e-9);
});

Deno.test("allocate: per-claimant cap bounds capture; spillover redistributes (water-fill)", () => {
  // perClaimantCap 0.5 → no one gets >50. 'whale' would take 80 by weight but is
  // capped at 50; the 30 spillover flows to the others, still Σ==100.
  const out = allocate(100, [
    { id: "whale", need: 100, trustWeight: 8 },
    { id: "x", need: 100, trustWeight: 1 },
    { id: "y", need: 100, trustWeight: 1 },
  ], { perClaimantCap: 0.5 });
  const byId = Object.fromEntries(out.map((o) => [o.id, o.amount]));
  assert(byId.whale <= 50 + 1e-9, `whale capped at 50 (got ${byId.whale})`);
  assertAlmostEquals(out.reduce((s, o) => s + o.amount, 0), 100, 1e-6, "still conserved");
  assert(byId.x > 0 && byId.y > 0, "spillover reached the smaller claimants");
});

Deno.test("allocate: REFUSES LOUD when surplus exceeds absorbable (conservation refuse path)", () => {
  // total need 30 < surplus 100 → 70 unallocatable → refuse loud, NOT a silent clamp.
  const err = assertThrows(
    () => allocate(100, [{ id: "a", need: 30, trustWeight: 1 }]),
    FlowConservationError,
  ) as FlowConservationError;
  assertAlmostEquals(err.residual, 70, 1e-9, "residual surfaced on the error");
});

Deno.test("allocate: untrusted (trustWeight 0) claimants pull nothing → refuse loud if no terrain", () => {
  // a below-floor claimant with zero trust-weight is no terrain for flow.
  assertThrows(
    () => allocate(50, [{ id: "stranger", need: 100, trustWeight: 0 }]),
    FlowConservationError,
  );
});
