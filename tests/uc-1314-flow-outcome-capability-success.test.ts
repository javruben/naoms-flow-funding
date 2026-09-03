// src/packages/flow-funding/tests/uc-1314-flow-outcome-capability-success.test.ts
//
// 1314 §6.0 escape hatch 4 — the SHARE arm.
//
// 🔑 This file exists so its twin cannot pass by sharing nothing ever. "Refuse
// when the capability mint fails" and "never share anything" produce the same
// `null` at the seam; only running the SAME builder through the SAME harness
// with a WORKING dylib separates them.
//
// Run: deno test --allow-all --unstable-ffi --no-check \
//   src/packages/flow-funding/tests/uc-1314-flow-outcome-capability-success.test.ts

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
import { isBiscuitFfiAvailable } from "../../packs/biscuit-contract.ts";
import { runFlowBuildWithFfiUp } from "./_1314-flow-capability-subprocess.ts";

const SR = { sanitizeResources: false, sanitizeOps: false };

Deno.test({
  name:
    "1314 hatch 4 (success): a HEALTHY capability mint still shares, with the capability attached",
  ignore: !isBiscuitFfiAvailable(),
  ...SR,
  async fn() {
    const out = await runFlowBuildWithFfiUp();

    assertStringIncludes(
      out,
      "MINT=ok",
      "control: the mint must have SUCCEEDED here, or this arm proves nothing",
    );
    assertEquals(
      out.includes("BUILD=null"),
      false,
      `the fix must not have turned the share off entirely: ${out}`,
    );
    // The payload still carries the data AND — the mechanism — the capability
    // that bounds its onward redistribution.
    assertStringIncludes(out, "total_flowed");
    assertStringIncludes(
      out,
      "_capability",
      "the shared payload must carry the N-hop capability, not just data",
    );
    assertStringIncludes(out, "max_hops_remaining");
  },
});
