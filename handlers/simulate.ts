// src/packages/flow-funding/handlers/simulate.ts — 1644 M5 simulation handler.
//
// flow.simulate runs the M5 driver (the REAL M3 engines) over the synthetic state
// the caller supplies and returns an allocation report — committing NOTHING. The
// no-commit guarantee is structural: this handler calls only the pure driver +
// the soft-dep demurrage preview; it never touches securedAppend or token.pay. A
// holon can thus preview a full flow epoch before arming/settling real value
// (design §6.5). `committed: false` is returned explicitly so callers can assert it.

import { createLogger } from "@naoms/logging";

import { runFlowSimulation, type SimHolon } from "../sim/driver.ts";
import { previewDemurrage } from "../sim/demurrage-preview.ts";

const L = createLogger("flow-funding:simulate");

export interface SimulateContext {
  ownerDid: string;
  callerDid?: string;
}

export type RespondFn = (payload: Record<string, unknown>) => void;

/** flow.simulate — preview a flow epoch over synthetic state; commits nothing. */
export async function handleSimulate(
  _ctx: SimulateContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const holons = Array.isArray(msg.holons) ? (msg.holons as SimHolon[]) : [];
  if (holons.length === 0) {
    return respond({
      type: "flow.simulate.result",
      ok: false,
      error: "holons[] required (the synthetic state to simulate)",
    });
  }
  const epochs = Number.isFinite(Number(msg.epochs)) ? Number(msg.epochs) : 1;
  const attestedElapsedPerEpoch = msg.attestedElapsedPerEpoch !== undefined
    ? Number(msg.attestedElapsedPerEpoch)
    : 1;

  try {
    const report = runFlowSimulation(holons, {
      epochs,
      attestedElapsedPerEpoch,
    });

    // Optional 1645 demurrage preview (soft-dep, degrades when 1645 absent).
    let demurrage;
    if (msg.demurragePreview && Number.isFinite(Number(msg.demurrageBalance))) {
      demurrage = await previewDemurrage(
        Number(msg.demurrageBalance),
        attestedElapsedPerEpoch * epochs,
      );
    }

    L.info("flow simulation previewed", {
      holons: holons.length,
      epochs: report.epochs,
      totalFlowed: report.totalFlowed,
    });
    return respond({
      type: "flow.simulate.result",
      ok: true,
      committed: false, // structural: the sim writes nothing to the chain
      report,
      ...(demurrage ? { demurrage } : {}),
    });
  } catch (e) {
    return respond({
      type: "flow.simulate.result",
      ok: false,
      error: (e as Error).message,
    });
  }
}
