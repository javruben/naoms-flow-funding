// src/packages/flow-funding/sim/demurrage-preview.ts — 1644 M5 demurrage preview.
//
// Demurrage is item 1645's deliverable, NOT a 1644 engine (HC-06 / owner ALIGN A3).
// The simulation surface may PREVIEW demurrage for a holon's idle balance by
// CONSUMING 1645 — never by implementing a 1644 demurrage engine. 1645 is
// build-complete on its own branch; when it is absent from this build the preview
// DEGRADES GRACEFULLY (returns unavailable + reason). It never errors and never
// falls back to a home-grown decay (which would violate HC-06).

export interface DemurragePreview {
  available: boolean;
  /** When available: the demurrage charge 1645 computes for this balance + period. */
  charge?: number;
  /** When unavailable: why (1645 absent / not wired on this build). */
  reason?: string;
}

// Candidate module paths where item 1645 publishes its demurrage computation. Held
// as data (not a static `import "…"`) so this file type-checks and runs on a build
// where 1645 is absent — the dynamic import simply rejects and we degrade.
const DEMURRAGE_1645_MODULES = [
  "@naoms/packages/token/kinds/demurrage/mod.ts",
  "@naoms/packages/demurrage/mod.ts",
];

/**
 * Preview the demurrage a holon's idle balance would incur, by consuming 1645.
 * Soft-dep: returns `{ available: false, reason }` when 1645 is not present —
 * 1644 must not implement demurrage itself (HC-06). Async because consuming 1645
 * is a dynamic import.
 */
export async function previewDemurrage(
  balance: number,
  attestedElapsed: number,
): Promise<DemurragePreview> {
  for (const path of DEMURRAGE_1645_MODULES) {
    try {
      // Variable specifier → not statically resolved; rejects at runtime when absent.
      const mod = await import(path) as {
        computeDemurrage?: (balance: number, elapsed: number) => number;
      };
      const charge = mod.computeDemurrage?.(balance, attestedElapsed);
      if (typeof charge === "number" && Number.isFinite(charge)) {
        return { available: true, charge };
      }
    } catch {
      // try the next candidate path
    }
  }
  return {
    available: false,
    reason:
      "1645 demurrage not present on this build — preview unavailable. 1644 " +
      "implements NO demurrage engine (HC-06); it only consumes 1645 when present.",
  };
}
