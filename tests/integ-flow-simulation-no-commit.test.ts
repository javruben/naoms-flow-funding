// src/packages/flow-funding/tests/integ-flow-simulation-no-commit.test.ts
//
// 1644 M5 (T-15/T-16) — a holon previews a flow epoch in simulation: the REAL
// engines run over synthetic state on a live daemon and produce an allocation
// report, while committing ZERO flow.* chain writes; the demurrage preview consumes
// 1645 and degrades gracefully when 1645 is absent (T-16 / HC-06).
//
// Zero-write mechanism: after flow.simulate, the simulated holon ids have NO
// flow_settlement graph node (the only node a real settlement would project) —
// proving the dry-run touched no chain, unlike flow.epoch_settle which commits one.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/handlers/simulate.ts:1
// @covers src/packages/flow-funding/sim/driver.ts:1
// @mechanism-asserted real-engine simulation on a live daemon with ZERO flow_settlement commits (committed:false + no projected node) + 1645-demurrage soft-dep degrade
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, kronos-disabled, iroh-mdns-disabled
// @honesty-rationale Single-daemon integ: the flow.simulate handler + sim driver ARE the assertion target, driven over the real authenticated WS path. The synthetic holon set is the simulation INPUT (design §6.5 — synthetic/historical state). The zero-write claim is asserted against the real graph (no flow_settlement node for the sim holons), not merely the self-reported committed flag.
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

const L = createLogger("integ-flow-sim");
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
  _daemon = await startDaemonFromFixture(NAOMS_ROOT, _port, "integ-flow-sim");
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

Deno.test({
  name:
    "1644 M5: flow.simulate previews a conserved epoch with ZERO chain writes; demurrage degrades",
  ...SR,
  async fn() {
    await ensureDaemon();
    try {
      const richId = `sim-rich-${crypto.randomUUID().slice(0, 8)}`;
      const poorId = `sim-poor-${crypto.randomUUID().slice(0, 8)}`;

      const res = await _wsSend(_ws, {
        type: "flow.simulate",
        holons: [
          {
            id: richId,
            balance: 800,
            floor: 100,
            ceiling: 500,
            channels: [{ to: poorId, trustWeight: 1 }],
          },
          { id: poorId, balance: 50, floor: 400, ceiling: 900 },
        ],
        epochs: 1,
        demurragePreview: true,
        demurrageBalance: 1000,
      });
      assert(res.ok, `simulate ok — ${JSON.stringify(res).slice(0, 300)}`);
      assertEquals(res.committed, false, "simulation commits nothing");
      const report = res.report as {
        totalFlowed: number;
        conserved: boolean;
        perHolon: Array<{ id: string; received: number }>;
      };
      assertAlmostEquals(
        report.totalFlowed,
        300,
        1e-6,
        "real engine ran: 300 surplus flowed",
      );
      assertEquals(report.conserved, true);
      assertAlmostEquals(
        report.perHolon.find((h) => h.id === poorId)!.received,
        300,
        1e-6,
        "poor absorbed the surplus in the preview",
      );

      // demurrage preview degrades gracefully (1645 absent on this build).
      const dem = res.demurrage as { available: boolean } | undefined;
      assert(dem, "demurrage preview present in the response");
      assertEquals(
        dem.available,
        false,
        "1645 absent → preview unavailable (HC-06, no 1644 engine)",
      );

      // ── ZERO-WRITE mechanism: no flow_settlement node was committed for the sim holons ──
      const q = await _wsSend(_ws, {
        type: "graph.query",
        pattern: { type: "flow_settlement", where: { holon: richId } },
      }) as { nodes?: unknown[] };
      assertEquals(
        (q.nodes ?? []).length,
        0,
        "the dry-run committed NO flow_settlement node (T-15 zero chain writes)",
      );
    } finally {
      await cleanupDaemon();
    }
  },
});
