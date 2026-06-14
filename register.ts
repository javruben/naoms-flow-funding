// src/packages/flow-funding/register.ts — 1644 M1 package registration.
//
// Called by PackageLoader.bootAll() with the db handle. M1 has no boot-time
// state to replay (FlowPolicies live on-chain and project via the generic
// triple materializer + the supersede enricher), so registration is a no-op
// beyond the load signal. M3+ engine state, if any, registers here later.

import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:register");

export function registerPackage(_db: bigint): void {
  L.info("Flow funding package registered");
}
