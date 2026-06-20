// src/packages/flow-funding/tests/integ-flow-consent.test.ts
//
// 1644 M4 (T-12, single-daemon arm) — automated flow settlement rides REAL
// token.pay under a bounded, revocable ocap, composing with (NOT bypassing)
// CORE_APPROVAL_REQUIRED. This is the integ acceptance for the SINGLE-DAEMON
// arm (holon + an admitted claimant co-sign on one daemon). The cross-identity
// 2-daemon arm rides E1/1596 (fc- quorum, building) and is a separate test.
//
// === STATUS: RED, gated OFF by default (NAOMS_INTEG_FLOW_CONSENT=1 to run) ===
// This is a TDD acceptance spec ahead of TWO landings; it is ignore-gated so it
// does NOT break the suite, and un-gates the instant both land:
//
//   (1) CORE-SECURITY SEAM (owner/core surface — routed, not built here):
//       `enforceApprovalGate` (src/core/security/approval-gate.ts:99-160) is
//       INTERACTIVE-ONLY today — it runs `requestActionApproval` and never
//       threads a capability `approval_receipt` (the receipt-accepting
//       `checkActionGate`, action-gate.ts:69, is a SEPARATE path the WS gate
//       does not call; the 1611 loopback auto-grant was removed). So a
//       pre-authorized flow-ocap cannot satisfy the gate non-interactively. M4
//       needs `enforceApprovalGate` to accept a cryptographically-valid,
//       owner-signed, op-scoped capability (the flow-ocap) — distinct from the
//       1611 loopback (explicit signed bounded pre-auth, not blanket).
//   (2) CONSUMER WIRING (flow-funding): epoch-settle presents the flow-ocap on
//       the gated token.pay per allocation (the value-leg). token.pay itself IS
//       wired (handlePay, tools-pay.ts) — only the gated presentation is new.
//
// The flow-ocap PRIMITIVE (mint/verify/all cap-bounded refusals) is already
// proven real-crypto 10/10 in uc-flow-ocap.test.ts; this asserts the LIVE
// end-state: an in-scope settlement CREDITS the claimant via real token.pay,
// while over-cap / revoked / vault-locked REFUSE before any value moves.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/domain/flow-ocap.ts:1
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:1
// @mechanism-asserted automated settlement rides REAL token.pay (payee credit on
//   the token chain) GATED by the flow-ocap (non-interactive, non-bypass);
//   over-cap/revoked/vault-locked REFUSE before value moves
// @canonical-flow YES — flow.policy_set → flow.epoch_settle → token.pay (handlePay)
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, kronos-disabled
// @honesty-rationale Single-daemon: a flow token is defined + the claimant admitted
//   (real token.define/token.admit), a FlowPolicy is armed (real flow.policy_set),
//   and settlement is driven through the real flow.epoch_settle handler. The payee
//   credit is read back from the token chain fold — never pre-seeded. RED until the
//   gate-seam + epoch-settle→token.pay consumer land; GREEN asserts the real
//   value-move + the cap-bounded refusals on the production path.
// === END HEADER ===
//
// RED (today): flow.epoch_settle does NOT yet ride token.pay (no consumer wiring)
//   AND enforceApprovalGate has no capability path — so the claimant is never
//   credited. `FAILED` at the "claimant credited via gated token.pay" assertion.
// GREEN (post seam + wiring): the in-scope settlement credits the claimant; the
//   over-cap/revoked/vault-locked arms REFUSE loud before any token.pay.

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

const L = createLogger("integ-flow-consent");
const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");
const SR = { sanitizeResources: false, sanitizeOps: false };

// Gated OFF by default — TDD acceptance spec ahead of the gate-seam + consumer wiring.
const RUN = Deno.env.get("NAOMS_INTEG_FLOW_CONSENT") === "1";

let _port: number;
let _daemon: Awaited<ReturnType<typeof startDaemonFromFixture>> | null = null;
let _ws: WebSocket;
let _wsSend: (ws: WebSocket, msg: Record<string, unknown>) => Promise<Record<string, unknown>>;

async function ensureDaemon(): Promise<void> {
  if (_daemon) return;
  _port = await getRandomPort();
  _daemon = await startDaemonFromFixture(NAOMS_ROOT, _port, "integ-flow-consent");
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
  // naoms-check-ignore: PC-01 best-effort teardown
  try {
    _ws?.close();
  } catch { /* already closed */ }
  // naoms-check-ignore: PC-01 best-effort teardown
  try {
    _daemon.daemon.process.kill("SIGTERM");
  } catch { /* already dead */ }
  await delay(500);
  for (const s of ["", "-wal", "-shm"]) {
    // naoms-check-ignore: PC-01 best-effort teardown
    try {
      Deno.removeSync(_daemon.dbPath + s);
    } catch { /* missing is fine */ }
  }
  // naoms-check-ignore: PC-01 best-effort teardown
  try {
    Deno.removeSync(_daemon.keysDir, { recursive: true });
  } catch { /* missing is fine */ }
  _daemon = null;
}

Deno.test({
  name:
    "1644 M4 [single-daemon]: in-scope settlement CREDITS the claimant via REAL " +
    "token.pay under the flow-ocap (gated, non-bypass); over-cap/revoked/" +
    "vault-locked REFUSE before value moves",
  ...SR,
  ignore: !RUN,
  async fn() {
    await ensureDaemon();
    try {
      const context = "nao";

      // Arm a viability band [100, 500] with a 0.6 per-claimant cap — the cap the
      // flow-ocap will bind. Real write path.
      const arm = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        params: { floor: 100, ceiling: 500, gradient: 0, perClaimantCap: 0.6 },
      });
      assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);

      // Settle: balance 800 → surplus 300, two claimants need 200 each → 150 each
      // (within the per-claimant cap). The REAL engine; conserved.
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
      assertEquals(settle.settledTotal, 300, "conserved surplus 300");

      // ACCEPTANCE (RED until the gate-seam + epoch-settle→token.pay land): the
      // settlement must have RIDDEN token.pay under the flow-ocap and CREDITED each
      // below-floor claimant on the token chain — non-interactively (no live
      // approval prompt), bounded by the per-claimant cap, gate composed-not-
      // bypassed. Read the credit back from the fold (NEVER pre-seeded).
      const allocations = settle.allocations as Array<{ id: string; amount: number }>;
      assert(Array.isArray(allocations) && allocations.length === 2, "two allocations");
      for (const a of allocations) {
        const credited = await _wsSend(_ws, {
          type: "graph.query",
          pattern: { type: "token_holder", where: { did: a.id } },
        }) as { nodes?: Array<{ properties?: Record<string, unknown> }> };
        const bal = Number(
          (credited.nodes?.[0]?.properties?.balance ?? 0) as number,
        );
        assert(
          bal >= a.amount - 1e-6,
          `claimant ${a.id} must be CREDITED ${a.amount} via the settlement's ` +
            `gated token.pay (got balance ${bal}). RED until: (1) enforceApprovalGate ` +
            `accepts the flow-ocap capability (core seam) AND (2) epoch-settle presents ` +
            `the ocap on token.pay (consumer wiring). token.pay itself is wired (handlePay).`,
        );
      }
    } finally {
      await cleanupDaemon();
    }
  },
});
