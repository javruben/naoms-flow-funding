// src/packages/flow-funding/enrichers/index.ts — 1644 M1 enricher registry.
//
// The package loader discovers `packageEnrichers` and registers each into the
// materialize pipeline. M1 ships one POST enricher: the flow-policy supersede
// marker (maintains latest-active across versions).

import type { MaterializerEnricher } from "@naoms/core/enrichers/types.ts";
import { flowPolicySupersede } from "../materializers/flow-policy.ts";
import { flowAgreementFold } from "../materializers/flow-agreement.ts";

export const packageEnrichers: MaterializerEnricher[] = [
  flowPolicySupersede, // M1: latest-active FlowPolicy version
  flowAgreementFold, // M2: bilateral two-lane agreement status fold
];
