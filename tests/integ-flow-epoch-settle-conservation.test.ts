// src/packages/flow-funding/tests/integ-flow-epoch-settle-conservation.test.ts
//
// 1644 M3 (T-09) — a flow epoch settles CONSERVED on the real write path, and
// refuses LOUD when the surplus cannot be conserved.
//
// Drives the real path on a live daemon: flow.policy_set arms a viability band;
// flow.epoch_settle runs the gradient + allocation engines over a supplied
// balance + below-floor claimants → commits a `flow.epoch_settled` event whose
// allocation satisfies Σ(out) == surplus. The negative arm settles against a
// scenario the claimants cannot absorb → the allocator's FlowConservationError
// surfaces as a loud refusal carrying the residual (HC-01 / AX-H1 — never a
// silent clamp).
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:1
// @covers src/packages/flow-funding/engine/allocate.ts:1
// @mechanism-asserted conservation Σ(out)==surplus on the real flow.epoch_settled commit + refuse-loud residual path (HC-01)
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale Single-daemon integ: the epoch-settle handler + engines ARE the assertion target. The FlowPolicy is armed by driving the real flow.policy_set write path (not pre-seeded); the settlement reads the projected policy and commits flow.epoch_settled through the real handler. The epoch balance + claimants are the SCENARIO INPUT to the settlement (the same shape M5's simulation supplies), not a pre-seed of the settlement's output. The negative arm exercises the production refuse path, paired with the success arm (Layer-9).
// @canonical-flow YES
// === END HEADER ===

import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  delay,
  getRandomPort,
  startDaemonFromFixture,
  waitForBootReady,
} from "../../../../tests/helpers/browser-e2e.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("integ-flow-settle");
const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");
const SR = { sanitizeResources: false, sanitizeOps: false };

let _port: number;
let _daemon: Awaited<ReturnType<typeof startDaemonFromFixture>> | null = null;
let _ws: WebSocket;
let _wsSend: (ws: WebSocket, msg: Record<string, unknown>) => Promise<Record<string, unknown>>;

async function ensureDaemon(): Promise<void> {
  if (_daemon) return;
  _port = await getRandomPort();
  _daemon = await startDaemonFromFixture(NAOMS_ROOT, _port, "integ-flow-settle");
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
  const { unlockFixtureVault } = await import("../../../../tests/helpers/fixture-unlock.ts");
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

Deno.test({
  name: "1644 M3: flow epoch settles CONSERVED (Σ(out)==surplus); refuses LOUD when unconservable",
  ...SR,
  async fn() {
    await ensureDaemon();
    try {
      const context = "nao";

      // Arm a viability band [100, 500] with a 0.6 per-claimant cap.
      const arm = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        params: { floor: 100, ceiling: 500, gradient: 0, perClaimantCap: 0.6 },
      });
      assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);

      // ── Success arm: balance 800 → surplus 300 above ceiling, two equal claimants ──
      const settle = await _wsSend(_ws, {
        type: "flow.epoch_settle",
        context,
        balance: 800,
        claimants: [
          { id: "did:nao:dependent-a", need: 200, trustWeight: 1 },
          { id: "did:nao:dependent-b", need: 200, trustWeight: 1 },
        ],
      });
      assert(settle.ok, `epoch_settle ok — ${JSON.stringify(settle)}`);
      assertAlmostEquals(settle.surplus as number, 300, 1e-6, "surplus = balance - ceiling = 300");
      assertAlmostEquals(
        settle.settledTotal as number,
        300,
        1e-6,
        "CONSERVATION: Σ(out) == surplus",
      );
      assertEquals(settle.conserved, true, "conserved flag set");
      const allocs = settle.allocations as Array<{ id: string; amount: number }>;
      assertEquals(allocs.length, 2);
      assertAlmostEquals(allocs[0].amount, 150, 1e-6, "equal need+trust → 150 each");
      assertAlmostEquals(allocs[1].amount, 150, 1e-6);

      // The settlement is a real committed event — read it back by fold.
      const node = await _wsSend(_ws, {
        type: "graph.query",
        pattern: { type: "flow_settlement", where: { holon: settle.holon as string, context } },
      }) as { nodes?: Array<{ properties?: Record<string, unknown> }> };
      assert(
        (node.nodes ?? []).some((n) =>
          Math.abs(Number(n.properties?.surplus ?? -1) - 300) < 1e-6
        ),
        `flow_settlement node projected with surplus 300 — got ${JSON.stringify(node).slice(0, 300)}`,
      );

      // ── Refuse-loud arm: 300 surplus, claimants can absorb only 50 → loud refusal ──
      const refused = await _wsSend(_ws, {
        type: "flow.epoch_settle",
        context,
        balance: 800,
        claimants: [{ id: "did:nao:tiny", need: 50, trustWeight: 1 }],
      });
      assertEquals(refused.ok, false, "unconservable surplus refused (HC-01, no silent clamp)");
      assertAlmostEquals(
        refused.residual as number,
        250,
        1e-6,
        "residual (surplus 300 − absorbable 50) surfaced on the refusal",
      );
    } finally {
      await cleanupDaemon();
    }
  },
});
