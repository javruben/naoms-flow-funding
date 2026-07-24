// src/packages/flow-funding/tests/uc-flow-simulation.test.ts — 1644 M5 sim (unit).
//
// Pure-function coverage of the simulation driver: it runs the REAL M3 engines over
// in-process synthetic state, conserves, records (never silently drops) unconservable
// epochs, mutates no input, and previews 1645 demurrage as a soft-dep that degrades
// gracefully when 1645 is absent (HC-06 — 1644 implements no demurrage engine).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/sim/driver.ts:1
// @covers src/packages/flow-funding/sim/demurrage-preview.ts:1
// @mechanism-asserted real-engine sim (gradient+allocate) conserved + zero-side-effect (no input mutation, no I/O) + 1645-demurrage soft-dep degrade
// @canonical-flow N/A (pure unit — the no-chain-write guarantee is exercised on a daemon by integ-flow-simulation-no-commit)
// === END HEADER ===

import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runFlowSimulation, type SimHolon } from "../sim/driver.ts";
import { previewDemurrage } from "../sim/demurrage-preview.ts";

Deno.test("sim: a holon's surplus flows to a below-floor channel, conserved", () => {
  const holons: SimHolon[] = [
    {
      id: "rich",
      balance: 800,
      floor: 100,
      ceiling: 500,
      channels: [{ to: "poor", trustWeight: 1 }],
    },
    { id: "poor", balance: 50, floor: 400, ceiling: 900 },
  ];
  const report = runFlowSimulation(holons);
  const rich = report.perHolon.find((h) => h.id === "rich")!;
  const poor = report.perHolon.find((h) => h.id === "poor")!;
  assertAlmostEquals(rich.surplus, 300, 1e-6, "surplus = 800 - ceiling 500");
  assertAlmostEquals(rich.outflow, 300, 1e-6);
  assertAlmostEquals(
    poor.received,
    300,
    1e-6,
    "poor (need 350) absorbs the 300 surplus",
  );
  assertAlmostEquals(
    rich.endBalance,
    500,
    1e-6,
    "rich settles down to ceiling",
  );
  assertAlmostEquals(poor.endBalance, 350, 1e-6);
  assertAlmostEquals(report.totalFlowed, 300, 1e-6);
  assertEquals(report.conserved, true);
  assertEquals(report.refusals.length, 0);
});

Deno.test("sim: an unconservable epoch is RECORDED as a refusal, not silently dropped", () => {
  const holons: SimHolon[] = [
    {
      id: "rich",
      balance: 800,
      floor: 100,
      ceiling: 500,
      channels: [{ to: "tiny", trustWeight: 1 }],
    },
    { id: "tiny", balance: 50, floor: 100, ceiling: 900 }, // need 50 < surplus 300
  ];
  const report = runFlowSimulation(holons);
  assertEquals(
    report.refusals.length,
    1,
    "the unconservable surplus is recorded",
  );
  assertEquals(report.refusals[0].holon, "rich");
  assertAlmostEquals(
    report.totalFlowed,
    0,
    1e-6,
    "nothing flowed on the refused epoch",
  );
});

Deno.test("sim: does NOT mutate the caller's input (pure, no side effects)", () => {
  const holons: SimHolon[] = [
    {
      id: "rich",
      balance: 800,
      floor: 100,
      ceiling: 500,
      channels: [{ to: "poor", trustWeight: 1 }],
    },
    { id: "poor", balance: 50, floor: 400, ceiling: 900 },
  ];
  runFlowSimulation(holons, { epochs: 3 });
  assertEquals(holons[0].balance, 800, "input balance untouched after sim");
  assertEquals(holons[1].balance, 50);
});

Deno.test("sim: stream accrual compounds over epochs (CIKU pattern, attested elapsed)", () => {
  const holons: SimHolon[] = [
    // No channels, no surplus drain — pure accrual: 10/epoch × 3 epochs = +30.
    { id: "earner", balance: 100, floor: 50, ceiling: 100000, rate: 10 },
  ];
  const report = runFlowSimulation(holons, {
    epochs: 3,
    attestedElapsedPerEpoch: 1,
  });
  const earner = report.perHolon[0];
  assertAlmostEquals(earner.accrued, 30, 1e-6);
  assertAlmostEquals(earner.endBalance, 130, 1e-6);
});

Deno.test("demurrage preview: degrades gracefully when 1645 is absent (HC-06)", async () => {
  const preview = await previewDemurrage(1000, 30);
  assertEquals(
    preview.available,
    false,
    "1645 absent on this build → unavailable",
  );
  assert(
    (preview.reason ?? "").includes("HC-06") ||
      (preview.reason ?? "").toLowerCase().includes("1645"),
    `degrade reason names the soft-dep — got ${preview.reason}`,
  );
});
