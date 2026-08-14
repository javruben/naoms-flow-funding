// src/packages/flow-funding/tests/uc-1314-flow-outcome-capability-failure-mode.test.ts
//
// 1314 §6.0 escape hatch 4 — A GUARD WHOSE FAILURE MODE IS TO PERMIT IS NOT A
// GUARD. The REFUSE arm.
//
// 🛑 THE DEFECT: `flow-domain.ts` read
//     const cap = mintFlowShareCapability();
//     if (cap) data._capability = capabilityToWire(cap);
//   so when the mint FAILED — FFI unavailable, build error — the holon's
//   circulation totals were shared anyway, with NO capability attached. The one
//   mechanism bounding onward redistribution degraded, on error, into an
//   unbounded ungated disclosure. The comment called that "the privacy
//   baseline"; the baseline is to disclose NOTHING we cannot bound.
//
// RED, measured (positive control fired: mintFlowShareCapability() === null):
//   D build() with settlements + FFI down -> SHARED:
//     {"total_flowed":50,"epoch_count":2,"by_context":{"alpha":42,"beta":8}}
//
// This runs in a SUBPROCESS because the FFI handle is cached per process and
// pointing `NAOMS_FFI_LIB_PATH` at an empty directory in-process would break
// every sibling test file sharing it.
//
// 🔑 Read with `uc-1314-flow-outcome-capability-success.test.ts`, which proves
// a HEALTHY mint still shares. A change that shares nothing at all is as broken
// as one that shares unbounded. NEITHER file may be read alone.
//
// Run: deno test --allow-all --unstable-ffi --no-check \
//   src/packages/flow-funding/tests/uc-1314-flow-outcome-capability-failure-mode.test.ts

// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/sharing/flow-domain.ts:build
// @covers src/packages/flow-funding/sharing/biscuit-nhop.ts:mintFlowShareCapability
// @mechanism-asserted capability-mint-failure-refuses-the-share
// @bypasses NONE
// @canonical-flow N/A
// @pre-seeds NONE
// === END HEADER ===

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runFlowBuildWithFfiDown } from "./_1314-flow-capability-subprocess.ts";

const SR = { sanitizeResources: false, sanitizeOps: false };

Deno.test({
  name:
    "1314 hatch 4 (failure-mode): a failed capability mint SHARES NOTHING, not an ungated payload",
  ...SR,
  async fn() {
    const out = await runFlowBuildWithFfiDown();

    // POSITIVE CONTROL, and it is the whole test: without it a `null` result
    // proves nothing — it is also what an empty settlement set returns. This
    // line asserts the mint really did fail in that process.
    assertStringIncludes(
      out,
      "MINT=null",
      "control: the capability mint must actually have FAILED in the " +
        "subprocess, or this test is vacuous",
    );
    assertStringIncludes(
      out,
      "SETTLEMENTS=2",
      "control: the builder must actually have had data to share",
    );

    assertEquals(
      out.includes("BUILD=null"),
      true,
      "pre-1314 this shared the circulation totals with NO capability: " +
        `got ${out}`,
    );
    // Assert the MECHANISM at the level that matters — no totals escaped.
    assertEquals(
      out.includes("total_flowed"),
      false,
      "no flow data may appear in a share we cannot bound",
    );
  },
});
