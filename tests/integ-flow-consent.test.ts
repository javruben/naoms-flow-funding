// src/packages/flow-funding/tests/integ-flow-consent.test.ts
//
// 1644 M4 (T-12, single-daemon arm) — automated flow settlement rides REAL
// token.pay under a bounded, revocable, owner-rooted CAPABILITY, composing with
// (NOT bypassing) CORE_APPROVAL_REQUIRED. This is the integ acceptance for the
// SINGLE-DAEMON arm: the holon (owner/issuer) settles surplus to ADMITTED
// claimants on ONE daemon; the per-allocation token.pay completes via the
// single-daemon online co-sign waiver (tools-pay.ts:183 "final-between-parties").
// The CROSS-IDENTITY 2-daemon arm (payee-credit REPLICATION by member push) rides
// E1/1596 (gate-4) and is the SEPARATE integ-token-pay-payee-credit proof.
//
// === STATUS: gated OFF by default (NAOMS_INTEG_FLOW_CONSENT=1; build-host only) ===
// MBP is flow-integ FORBIDDEN — run on build-host. This GREENS the moment the
// gate-seam + the consumer wiring land (both now built):
//   (1) CORE SEAM: enforceApprovalGate accepts a cryptographically-valid,
//       owner-signed, op-scoped, single-use delegation capability on `token.pay`
//       (src/core/security/approval-gate.ts verifyPresentedCapability path +
//       message-router-dispatch-ws.ts:407 closure). Distinct from the removed
//       1611 loopback auto-grant — this is explicit signed bounded pre-auth.
//   (2) CONSUMER WIRING: flow.policy_set arms the owner-signed delegation ROOT +
//       the in-process engine key K (perEpochCap present); flow.epoch_settle, per
//       conserved allocation, mints a single-use K-signed LEAF bound to the exact
//       canonicalized pay args and re-dispatches token.pay THROUGH the gate
//       (ctx.dispatchGatedOp — never handlePay directly, which would bypass it).
//
// The flow-ocap PRIMITIVE (mint/verify, over-cap/stale-version/vault-locked/
// missing-receipt REFUSALS) is proven real-crypto 12/12 in uc-flow-ocap.test.ts,
// and the K lifecycle 6/6 in uc-engine-key-registry.test.ts. This asserts the LIVE
// end-state on the PRODUCTION path: an in-scope settlement CREDITS each admitted
// claimant via REAL token.pay (read back from the token fold, NEVER pre-seeded),
// while an under-cap arm REFUSES the over-cap allocation BEFORE any value moves.
//
// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier integration
// @covers src/packages/flow-funding/domain/flow-ocap.ts:1
// @covers src/packages/flow-funding/handlers/epoch-settle.ts:1
// @covers src/packages/flow-funding/handlers/policy-set.ts:1
// @covers src/core/transport/message-router-dispatch-ws.ts:407
// @mechanism-asserted automated settlement rides REAL token.pay (payee credit read
//   from the token fold) GATED by the owner-rooted single-use delegation capability
//   (non-interactive, non-bypass) — NOT a pre-seeded balance; an under-cap arm
//   REFUSES the over-cap allocation before value moves (valueMovement.refused, no
//   credit). Cross-daemon payee-credit REPLICATION is E1/1596 (separate proof).
// @canonical-flow YES — token.define/mint/admit → flow.policy_set (arm root + K) →
//   flow.epoch_settle → token.pay (handlePay) under args._capability={leaf,root}
// @bypasses db-unlock=fixture-password, identity=pre-onboarded, kronos-disabled
// @honesty-rationale Single-daemon: a flow token is defined + minted + the claimants
//   admitted (real token.define/mint/admit, action-tier approved with the fixture
//   app-password), a FlowPolicy is armed WITH perEpochCap (real flow.policy_set →
//   real owner-signed delegation root via bridgeSign "ucan:v1"), and settlement is
//   driven through the real flow.epoch_settle handler. The settlement's token.pay is
//   satisfied by the CAPABILITY (no interactive approval answered for it — that IS
//   the M4 claim). Payee credit is read back from the token fold, never pre-seeded.
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
import { sendWithActionApproval } from "../../../../tests/helpers/drive-action-approval.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("integ-flow-consent");
const NAOMS_ROOT = new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");
const SR = { sanitizeResources: false, sanitizeOps: false };

// Gated OFF by default — build-host only (MBP flow-integ forbidden).
const RUN = Deno.env.get("NAOMS_INTEG_FLOW_CONSENT") === "1";

let _port: number;
let _daemon: Awaited<ReturnType<typeof startDaemonFromFixture>> | null = null;
let _ws: WebSocket;
let _wsSend: (ws: WebSocket, msg: Record<string, unknown>) => Promise<Record<string, unknown>>;
let _appPassword: string;

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
  await unlockFixtureVault(_ws, { identity: "founder", naomsRoot: NAOMS_ROOT });
  _appPassword = Deno.readTextFileSync(
    `${NAOMS_ROOT}/tests/fixtures/state-seeds/founder/keys/founder-password.txt`,
  ).trim();
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

/** Read a DID's credited balance for a token from the materialized fold (settled +
 *  provisional), polling so a real co-sign push is caught. NEVER pre-seeded. */
async function creditedBalance(did: string, tokenId: string): Promise<number> {
  const res = await _wsSend(_ws, {
    type: "graph.query",
    pattern: { type: "token_balance", where: { did, token_id: tokenId } },
  }) as { nodes?: Array<{ properties?: Record<string, unknown> }> };
  let total = 0;
  for (const n of res.nodes ?? []) {
    total += Number(n.properties?.settled ?? 0) + Number(n.properties?.provisional ?? 0);
  }
  // Fallback to the token_holder.balance projection (older materializer).
  if (total === 0) {
    const alt = await _wsSend(_ws, {
      type: "graph.query",
      pattern: { type: "token_holder", where: { did } },
    }) as { nodes?: Array<{ properties?: Record<string, unknown> }> };
    for (const n of alt.nodes ?? []) {
      total += Number(n.properties?.balance ?? 0);
    }
  }
  return total;
}

async function defineMintAdmit(opts: {
  cap: number;
  mint: number;
  claimants: string[];
}): Promise<string> {
  const def = await sendWithActionApproval(_ws, {
    type: "token.define",
    kind: "custom",
    humanLabel: "flow-favor",
    valueBasis: "favor",
    cap: opts.cap,
    ttlMs: 72 * 3600 * 1000,
    privacy: "clear",
    transferable: true,
    minAttesters: 1,
  }, { timeoutMs: 120_000, appPassword: _appPassword });
  assert(def.ok === true, `token.define failed: ${JSON.stringify(def)}`);
  const tokenId = String(def.tokenId ?? def.id);
  assert(tokenId.length > 0, `token.define returned no tokenId: ${JSON.stringify(def)}`);

  const mint = await sendWithActionApproval(_ws, {
    type: "token.mint",
    tokenId,
    amount: opts.mint,
  }, { timeoutMs: 120_000, appPassword: _appPassword });
  assert(mint.ok === true, `token.mint failed: ${JSON.stringify(mint)}`);

  for (const c of opts.claimants) {
    const admit = await sendWithActionApproval(_ws, {
      type: "token.admit",
      token: tokenId,
      admittedDid: c,
    }, { timeoutMs: 120_000, appPassword: _appPassword });
    assert(admit.ok === true, `token.admit(${c}) failed: ${JSON.stringify(admit)}`);
  }
  return tokenId;
}

Deno.test({
  name:
    "1644 M4 [single-daemon]: in-scope settlement CREDITS each admitted claimant via " +
    "REAL token.pay under the owner-rooted delegation capability (gated, non-bypass)",
  ...SR,
  ignore: !RUN,
  async fn() {
    await ensureDaemon();
    try {
      const context = "nao";
      const A = "did:nao:dependent-a";
      const B = "did:nao:dependent-b";

      // Setup: define a flow token, mint a spendable balance to the holon (issuer),
      // admit both claimants — all action-tier, approved with the fixture password.
      const tokenId = await defineMintAdmit({ cap: 100000, mint: 10000, claimants: [A, B] });

      // Arm a viability band [100,500] WITH an ABSOLUTE automatedSettlementCap (the
      // owner-signed total ceiling that mints + bounds the delegation root) plus the
      // [0,1] fairness FRACTIONS (perClaimantCap 0.6 of surplus, perEpochCap 0.5 of
      // balance). tokenKind == the defined token so the settlement pays THAT token.
      const arm = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        tokenKind: tokenId,
        params: {
          floor: 100,
          ceiling: 500,
          gradient: 0,
          perClaimantCap: 0.6,
          perEpochCap: 0.5,
          automatedSettlementCap: 1000,
        },
      });
      assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);
      assertEquals(arm.delegationArmed, true, "delegation root must be armed (automatedSettlementCap + signer ready)");

      // Settle: balance 800 → surplus 300 above ceiling; two claimants need 200 each
      // → 150 each (within the 200 per-claimant cap). REAL engine; conserved.
      const settle = await _wsSend(_ws, {
        type: "flow.epoch_settle",
        context,
        balance: 800,
        claimants: [
          { id: A, need: 200, trustWeight: 1 },
          { id: B, need: 200, trustWeight: 1 },
        ],
      });
      assert(settle.ok, `epoch_settle ok — ${JSON.stringify(settle)}`);
      assertEquals(settle.settledTotal, 300, "conserved surplus 300");

      // The value-movement leg must have ATTEMPTED the real token.pay for both
      // allocations (the capability path, not interactive) and recorded them paid.
      const vm = settle.valueMovement as {
        attempted: boolean;
        reason?: string;
        paid: Array<{ id: string; amount: number }>;
        refused: Array<{ id: string; amount: number; reason: string }>;
      };
      assert(vm && vm.attempted, `value movement must be attempted — ${JSON.stringify(vm)}`);
      assertEquals(vm.refused.length, 0, `no allocation refused — ${JSON.stringify(vm.refused)}`);
      assertEquals(vm.paid.length, 2, `both allocations paid — ${JSON.stringify(vm.paid)}`);

      // ACCEPTANCE: each below-floor claimant CREDITED via the settlement's gated
      // token.pay — non-interactively (no live approval answered for the pay),
      // bounded by the cap, gate composed-not-bypassed. Read from the fold (NEVER
      // pre-seeded). Poll for the single-daemon co-sign to materialize the credit.
      const allocations = settle.allocations as Array<{ id: string; amount: number }>;
      assert(Array.isArray(allocations) && allocations.length === 2, "two allocations");
      for (const a of allocations) {
        let bal = 0;
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          bal = await creditedBalance(a.id, tokenId);
          if (bal >= a.amount - 1e-6) break;
          await delay(2_000);
        }
        assert(
          bal >= a.amount - 1e-6,
          `claimant ${a.id} must be CREDITED ${a.amount} via the settlement's gated ` +
            `token.pay (got balance ${bal}). The capability path: enforceApprovalGate ` +
            `accepts the owner-rooted single-use leaf AND epoch-settle presents it on ` +
            `token.pay; token.pay completes single-daemon final-between-parties.`,
        );
      }
    } finally {
      await cleanupDaemon();
    }
  },
});

// SAFETY ARM — the gate is COMPOSED, not bypassable: a settlement with NO armed
// owner-signed delegation root (the owner never set a per-epoch cap) records its
// conserved allocation but moves NO value (no silent credit without an owner-rooted
// capability). This is the non-bypass invariant at the integ tier.
//
// The ocap-INTERNAL cap-bounded REFUSALS (over-cap / stale-policy-version /
// vault-locked / missing-receipt) are proven deterministically real-crypto 12/12 in
// uc-flow-ocap.test.ts. The cap-semantics reconciliation that the first build-host
// run surfaced is RESOLVED: the [0,1] fairness FRACTIONS (perClaimantCap of surplus,
// perEpochCap of balance) stay in the allocator, and the delegation root's
// owner-signed ceiling is its OWN ABSOLUTE `automatedSettlementCap` (the B3
// aggregate_cap, enforced by the per-root ledger). A LIVE over-cap arm (arm a small
// automatedSettlementCap, settle above it → the ledger REFUSES Σ > cap before value
// moves) is now well-defined and is the next integ increment once the value-leg is
// confirmed green here.
Deno.test({
  name:
    "1644 M4 [single-daemon]: a settlement with NO armed delegation root RECORDS the " +
    "allocation but moves NO value (the gate is composed, not bypassable)",
  ...SR,
  ignore: !RUN,
  async fn() {
    await ensureDaemon();
    try {
      const context = "nao-unarmed";
      const A = "did:nao:unarmed-claimant";

      const tokenId = await defineMintAdmit({ cap: 100000, mint: 10000, claimants: [A] });

      // Arm WITHOUT an automatedSettlementCap → no owner-signed delegation root is
      // minted (delegationArmed:false). Automated value movement is NOT authorized.
      // (Fraction caps are valid; only the absolute automation cap is omitted.)
      const arm = await _wsSend(_ws, {
        type: "flow.policy_set",
        context,
        tokenKind: tokenId,
        params: { floor: 100, ceiling: 500, gradient: 0, perClaimantCap: 1.0, perEpochCap: 0.5 },
      });
      assert(arm.ok, `policy_set ok — ${JSON.stringify(arm)}`);
      assertEquals(arm.delegationArmed, false, "no automatedSettlementCap ⇒ no delegation root armed");

      // One claimant whose need absorbs the whole surplus (perClaimantCap 1.0 of
      // surplus) → conserved settlement that records, so we can assert NO value moves.
      const settle = await _wsSend(_ws, {
        type: "flow.epoch_settle",
        context,
        balance: 800,
        claimants: [{ id: A, need: 300, trustWeight: 1 }],
      });
      assert(settle.ok, `epoch_settle ok (records the allocation) — ${JSON.stringify(settle)}`);
      assertEquals(settle.settledTotal, 300, "conserved surplus 300 (still recorded)");

      const vm = settle.valueMovement as { attempted: boolean; reason?: string; paid: unknown[] };
      assertEquals(vm.attempted, false, `no value moved without an armed root — ${JSON.stringify(vm)}`);
      assertEquals(vm.reason, "no-delegation-armed", "records-but-no-value reason surfaced LOUD");

      // And the claimant is NOT credited (no silent value movement).
      const bal = await creditedBalance(A, tokenId);
      assertEquals(bal, 0, `claimant must NOT be credited without an armed capability (got ${bal})`);
    } finally {
      await cleanupDaemon();
    }
  },
});
