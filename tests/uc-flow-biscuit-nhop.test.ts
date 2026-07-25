// src/packages/flow-funding/tests/uc-flow-biscuit-nhop.test.ts
//
// 1644 M-TRANSPARENCY — N-hop reshare capability (T-25/T-27).
//
// Mechanism-asserted FFI unit over the REAL packs Biscuit (mint → verify →
// attenuate). Proves the Biscuit caveat — not a JS counter — is the bound on
// onward redistribution: a token whose `max_hops` budget is spent is DENIED by
// `verify()`, and each authorized hop produces a DISTINCT (attenuated) token.
//
// Requires the naoms_core dylib (Biscuit FFI). Run on build-host:
//   NAOMS_FFI_LIB_PATH=$HOME/dev/naoms/rust/target/release/ \
//     deno test --allow-all --unstable-ffi <this>
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier unit
// @covers src/packages/flow-funding/sharing/biscuit-nhop.ts:1
// @mechanism-asserted Biscuit max_hops caveat (verify DENY on spent budget +
//   attenuate monotonic hop-tightening); NOT an outcome-only/JS-counter check
// @canonical-flow N/A (flow-funding/sharing/biscuit-nhop.ts authorizeReshare)
// === END HEADER ===
//
// RED (pre-biscuit-nhop.ts):
//   error: Module not found ".../flow-funding/sharing/biscuit-nhop.ts"
//   FAILED | 0 passed | 0 failed
// GREEN (build-host, real Biscuit FFI):
//   ok | 4 passed | 0 failed   (verbatim run banked in the M-TRANSPARENCY impl note)

import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verify } from "@naoms/packages/packs/biscuit-contract.ts";
import {
  authorizeReshare,
  FLOW_SHARE_MAX_HOPS,
  mintFlowShareCapability,
} from "../sharing/biscuit-nhop.ts";

// The naoms_core dylib is a process-singleton (loaded once, never closed by
// design) — disable Deno's resource/op leak sanitizer for these FFI tests, the
// canonical idiom across packs/token Biscuit unit tests.
const SR = { sanitizeResources: false, sanitizeOps: false };

Deno.test("mint: minted capability verifies in-scope at its budget", SR, () => {
  const cap = mintFlowShareCapability(2);
  assert(cap, "mint produced a capability (Biscuit FFI available)");
  assertEquals(cap.hopsRemaining, 2);
  assert(cap.tokenHex.length > 0);
  assert(cap.rootPubHex.length > 0);

  // Direct mechanism check: the caveat ALLOWs a hop while budget remains.
  const v = verify(cap.tokenHex, cap.rootPubHex, {
    redistribute_requested: true,
    current_hops: 0,
  });
  assertEquals(v.status, "ALLOW", "0 < max_hops(2) → ALLOW");
});

Deno.test(
  "authorizeReshare: each authorized hop attenuates to a DISTINCT, smaller-budget token (T-27)",
  SR,
  () => {
    const cap = mintFlowShareCapability(2)!;

    const d1 = authorizeReshare(cap);
    assert(d1.ok, "hop 1 authorized (budget 2)");
    assertEquals(d1.next.hopsRemaining, 1, "budget tightened 2 → 1");
    assertNotEquals(
      d1.next.tokenHex,
      cap.tokenHex,
      "attenuation produced a new token (mechanism: attenuate ran)",
    );

    const d2 = authorizeReshare(d1.next);
    assert(d2.ok, "hop 2 authorized (budget 1)");
    assertEquals(d2.next.hopsRemaining, 0, "budget tightened 1 → 0");
  },
);

Deno.test(
  "authorizeReshare: spent budget is REFUSED by the Biscuit caveat (T-25)",
  SR,
  () => {
    const cap = mintFlowShareCapability(2)!;
    const d1 = authorizeReshare(cap);
    assert(d1.ok);
    const d2 = authorizeReshare(d1.next);
    assert(d2.ok);

    // Budget is now 0. The next reshare MUST be refused — and by the caveat,
    // not a JS guard: verify() the spent token directly DENYs.
    const d3 = authorizeReshare(d2.next);
    assertEquals(d3.ok, false, "out-of-scope N-hop reshare refused");
    if (!d3.ok) assert(d3.reason.startsWith("VERIFY_DENY"), d3.reason);

    const vSpent = verify(d2.next.tokenHex, d2.next.rootPubHex, {
      redistribute_requested: true,
      current_hops: 0,
    });
    assertEquals(vSpent.status, "DENY", "0 < max_hops(0) is false → DENY");
  },
);

Deno.test(
  "authorizeReshare: empty/absent capability is fail-closed",
  SR,
  () => {
    const d = authorizeReshare({
      tokenHex: "",
      rootPubHex: "",
      hopsRemaining: 2,
    });
    assertEquals(d.ok, false);
    assertEquals(FLOW_SHARE_MAX_HOPS, 2);
  },
);
