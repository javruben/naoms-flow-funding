// src/packages/flow-funding/register.ts — 1644 package registration.
//
// Called by PackageLoader.bootAll() with the db handle. FlowPolicies/agreements/
// settlements live on-chain and project via the generic triple materializer +
// the supersede enricher, so M1–M5 have no boot-time state to replay.
//
// M-TRANSPARENCY: register the `sharing.flow-funding` outcome-transparency domain
// with sharing-656 (REUSE — HC-07, no new auto-sharer). This mirrors how the
// built-in sharers register at sharing boot (`loadAndRegisterBuiltinDomains` +
// `registerAllSharingEnrichers`), but for a first-party sibling package: we call
// the SAME value internals via the `@naoms/packages/sharing/...` specifier (the
// established cross-package pattern, cf. `contacts/auto-share-upgrade.ts`). The
// domain registration wires `build`/`materialize` (flow-domain.ts) into the
// engine, and the dispatch enricher routes `friendship.share.flow-funding` to the
// receive-side materializer. The per-settlement reshare itself is the existing
// `evaluateReshare` core path — no flow-side emit hook.

import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:register");

const FLOW_DOMAIN_KEY = "sharing.flow-funding";

export async function registerPackage(_db: bigint): Promise<void> {
  await registerFlowTransparencyDomain();
  L.info("Flow funding package registered");
}

/**
 * Register the flow-outcome sharing domain + its receive-side dispatch enricher.
 * Idempotent: a second boot (or a test re-run) finds the domain already present
 * and skips — `domainRegistry.register` throws on a duplicate key by design.
 */
async function registerFlowTransparencyDomain(): Promise<void> {
  const { getByKey, register: registerDomain } = await import(
    "@naoms/packages/sharing/engine/domain-registry.ts"
  );
  if (getByKey(FLOW_DOMAIN_KEY)) return; // already registered this process

  const {
    registerBuiltinDomain,
    registerDomainDispatchEnrichers,
  } = await import("@naoms/packages/sharing/sharers/sharer-registration.ts");
  const flow = await import("./sharing/flow-domain.ts");

  const domain = registerBuiltinDomain({
    manifest: flow.SHARER_FLOW_FUNDING_MANIFEST,
    pluginId: "flow-funding-transparency",
    mod: {
      build: flow.build,
      materialize: flow.materialize,
      revoke: flow.revoke,
    },
  });

  // Wire the `friendship.share.flow-funding` dispatch enricher with the same
  // deps the sharing package wires its built-ins with (`registerAllSharingEnrichers`).
  const { registerEnricher } = await import("@naoms/core/enrichers/registry.ts");
  const { graphQuery: gq } = await import("@naoms/core/graph/api.ts");
  const { unwrapPayloadDeep } = await import(
    "@naoms/core/enrichers/enricher-utils.ts"
  );
  registerDomainDispatchEnrichers({
    registerEnricher,
    domains: [domain],
    graphQuery: (db, query) =>
      gq(db, query as unknown as Parameters<typeof gq>[1]),
    unwrap: (payload) => unwrapPayloadDeep(payload),
  });
}
