// src/packages/flow-funding/tests/integ-flow-policy-set-and-read.test.ts
//
// 1644 M1 — A `flow` chain carries a versioned FlowPolicy per holon.
//
// Drives the real path on a single live daemon: WS `flow.policy_set` →
// namespace handler → securedAppend on the holon's own flow chain → generic
// triple materializer projects the `flow_policy` node → the supersede enricher
// (materializers/flow-policy.ts) reads prior versions via graphQueryAsync and
// demotes them → WS `flow.get_policy` folds the latest-active version back.
//
// Maps to frozen-plan T-01 (set/read + second-version-supersedes) and T-02 (the
// materializer awaits graphQueryAsync). The supersede MECHANISM is asserted, not
// just "a row appeared": after two versions exist (versionsTotal === 2) exactly
// one is left active (latestActiveCount === 1) — which only holds if the
// enricher's graphQueryAsync read + is_latest demotion fired.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/manifest.ts:1
// @covers src/packages/flow-funding/handlers/policy-set.ts:1
// @covers src/packages/flow-funding/materializers/flow-policy.ts:1
// @mechanism-asserted flow-policy supersede via graphQueryAsync + is_latest flip
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, device-pair=pre-onboarded-fixture, keychain=fixture-shares-file, kronos-disabled, iroh-mdns-disabled, llm-mocked, mls-real-ffi-forced
// @honesty-rationale Single-daemon integ: the flow namespace handler + generic projection + supersede enricher ARE the assertion target. identity/device-pair/keychain pre-state are upstream of flow.* and supplied by the canonical founder fixture; db-unlock=fixture-password unlocks the same encrypted DB the materializer projects into; kronos/iroh-mdns disabled — no scheduled job or peer discovery is part of the M1 single-daemon policy path. No flow.* state is pre-seeded: every node is produced by driving the real WS write path.
// @canonical-flow YES
// === END HEADER ===

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  delay,
  getRandomPort,
  startDaemonFromFixture,
  waitForBootReady,
} from "../../../../tests/helpers/browser-e2e.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("integ-flow-policy");
const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
const SR = { sanitizeResources: false, sanitizeOps: false };

let _port: number;
let _daemon: Awaited<ReturnType<typeof startDaemonFromFixture>> | null = null;
let _ws: WebSocket;
let _wsSend: (
  ws: WebSocket,
  msg: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

async function ensureDaemon(): Promise<void> {
  if (_daemon) return;
  _port = await getRandomPort();
  _daemon = await startDaemonFromFixture(NAOMS_ROOT, _port, "integ-flow");
  assert(_daemon, "Daemon started");
  try {
    await waitForBootReady(_port, 120000);
  } catch (e) {
    L.warn(`Boot ready timeout: ${(e as Error).message} — retrying`);
    await delay(5000);
    await waitForBootReady(_port, 30000);
  }
  const ceremony = await import("../../../../tests/helpers/ws-ceremony.ts");
  const { ws } = await ceremony.authenticateWs(_port, _daemon.keysDir);
  assert(ws.readyState === WebSocket.OPEN, "WS authenticated");
  _ws = ws;
  _wsSend = ceremony.wsSend;
  // PC-365: wire the operational signer so securedAppend can sign flow events.
  const { unlockFixtureVault } = await import(
    "../../../../tests/helpers/fixture-unlock.ts"
  );
  await unlockFixtureVault(_ws, { naomsRoot: NAOMS_ROOT });
}

async function cleanupDaemon(): Promise<void> {
  if (!_daemon) return;
  // naoms-check-ignore: PC-01 - best-effort test teardown; failure is non-fatal
  try {
    _ws?.close();
  } catch { /* already closed */ }
  // naoms-check-ignore: PC-01 - best-effort test teardown; failure is non-fatal
  try {
    _daemon.daemon.process.kill("SIGTERM");
  } catch { /* already dead */ }
  await delay(500);
  for (const s of ["", "-wal", "-shm"]) {
    // naoms-check-ignore: PC-01 - best-effort test teardown; failure is non-fatal
    try {
      Deno.removeSync(_daemon.dbPath + s);
    } catch { /* missing is fine */ }
  }
  // naoms-check-ignore: PC-01 - best-effort test teardown; failure is non-fatal
  try {
    Deno.removeSync(_daemon.keysDir, { recursive: true });
  } catch { /* missing is fine */ }
  _daemon = null;
}

/** Poll get_policy until the projection settles (load-invariant wait — the
 *  query IS the materializer signal, never a fixed sleep). tokenKind keys the
 *  fold so each value substrate is read independently. */
async function getPolicy(
  context: string,
  expectActive = 1,
  tokenKind?: string,
): Promise<Record<string, unknown>> {
  let last: Record<string, unknown> = {};
  const msg: Record<string, unknown> = { type: "flow.get_policy", context };
  if (tokenKind !== undefined) msg.tokenKind = tokenKind;
  for (let attempt = 0; attempt < 20; attempt++) {
    last = await _wsSend(_ws, msg);
    if (last.ok && (last.latestActiveCount as number) === expectActive) {
      return last;
    }
    await delay(200);
  }
  return last;
}

Deno.test({
  name:
    "1644 M1: flow.policy_set projects a versioned FlowPolicy; v2 supersedes v1",
  ...SR,
  async fn() {
    await ensureDaemon();
    try {
      const context = "nao";

      // ── Version 1 ──────────────────────────────────────────────────
      const set1 = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        params: { floor: 100, ceiling: 500, gradient: 0.5 },
      });
      assert(set1.ok, `policy_set v1 ok (got ${JSON.stringify(set1)})`);
      assertEquals(set1.version, 1, "first policy is version 1");

      const read1 = await getPolicy(context, 1);
      assert(read1.ok, `get_policy after v1 ok (got ${JSON.stringify(read1)})`);
      assertEquals(read1.found, true, "v1 found");
      assertEquals(read1.version, 1, "latest-active is v1");
      assertEquals(read1.versionsTotal, 1, "one version projected");
      assertEquals(read1.latestActiveCount, 1, "exactly one active");
      assertEquals(
        (read1.params as { floor: number }).floor,
        100,
        "v1 floor folded back",
      );

      // ── Version 2 supersedes ───────────────────────────────────────
      const set2 = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        params: { floor: 150, ceiling: 600 },
      });
      assert(set2.ok, `policy_set v2 ok (got ${JSON.stringify(set2)})`);
      assertEquals(set2.version, 2, "second policy is version 2");

      const read2 = await getPolicy(context, 1);
      assert(read2.ok, `get_policy after v2 ok (got ${JSON.stringify(read2)})`);
      assertEquals(read2.version, 2, "latest-active is now v2 (superseded v1)");
      assertEquals(
        read2.versionsTotal,
        2,
        "two versions projected (history kept)",
      );
      // MECHANISM (T-02): two versions exist but the supersede enricher's
      // graphQueryAsync + is_latest demotion leaves exactly one active node.
      assertEquals(
        read2.latestActiveCount,
        1,
        "supersede materializer demoted v1 — exactly one active",
      );
      assertEquals(
        (read2.params as { ceiling: number }).ceiling,
        600,
        "v2 params folded back (no mid-epoch re-price of v1)",
      );

      // ── A second token-kind is an INDEPENDENT band ─────────────────
      // M6.1: FlowPolicy is keyed per (holon, context, token-kind). Arming an
      // "iou" band for the SAME (holon, context) must start its own version
      // sequence at v1 and must NOT supersede the existing "custom" band — the
      // supersede materializer is scoped by token_kind.
      const setIou = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        tokenKind: "iou",
        params: { floor: 10, ceiling: 50 },
      });
      assert(setIou.ok, `policy_set iou ok (got ${JSON.stringify(setIou)})`);
      assertEquals(setIou.tokenKind, "iou", "kind echoed back");
      assertEquals(
        setIou.version,
        1,
        "iou band starts its OWN version sequence at v1 (not 3)",
      );

      const readIou = await getPolicy(context, 1, "iou");
      assert(readIou.ok, `get_policy iou ok (got ${JSON.stringify(readIou)})`);
      assertEquals(readIou.found, true, "iou band found");
      assertEquals(readIou.version, 1, "iou latest-active is v1");
      assertEquals(readIou.versionsTotal, 1, "exactly one iou version exists");
      assertEquals(readIou.latestActiveCount, 1, "one active iou node");
      assertEquals(
        (readIou.params as { ceiling: number }).ceiling,
        50,
        "iou params folded (independent of custom band)",
      );

      // MECHANISM (M6.1): the custom band is UNTOUCHED by the iou arm — its
      // latest-active is still v2/ceiling 600. A cross-kind supersede would have
      // demoted it; the token_kind-scoped query in the materializer prevents that.
      const readCustomAfter = await getPolicy(context, 1, "custom");
      assertEquals(
        readCustomAfter.version,
        2,
        "custom band still v2 — iou arm did not supersede it",
      );
      assertEquals(
        (readCustomAfter.params as { ceiling: number }).ceiling,
        600,
        "custom band params intact across a different-kind arm",
      );
    } finally {
      await cleanupDaemon();
    }
  },
});
