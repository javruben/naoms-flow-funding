// src/packages/flow-funding/materializers/flow-policy.ts — 1644 M1 supersede.
//
// The generic triple materializer projects each `flow.policy_set` event into a
// `flow_policy` graph node (manifest nodeKind). This POST enricher carries the
// versioning invariant the generic projector cannot: "a new policy is a new
// version event; the fold reads the LATEST ACTIVE version" (design §5, line
// 151). On each policy_set it reads the prior versions for (holon, context)
// and marks every older one `is_latest:false`, leaving exactly one active node
// — the newest — for the get_policy fold to read.
//
// PC-700/701 (hot-path async): the prior-version read uses
// `scope.graphQueryAsync` and the supersede write uses `scope.graphPutAsync`,
// so the FFI hops yield the daemon main loop. This enricher does NOT emit a
// chain commit (no securedAppend) from its handler — it only projects graph
// state — so it is clear of the materialize-phase write-lock deadlock class
// (PC-788/PC-551).
//
// @mechanism-asserted flow-policy supersede via graphQueryAsync + is_latest flip

import type {
  EnricherContext,
  MaterializerEnricher,
} from "@naoms/core/enrichers/types.ts";
import { extractPayloadDeep } from "@naoms/core/enrichers/enricher-utils.ts";
import { createLogger } from "@naoms/logging";

const L = createLogger("flow-funding:materializer");

export const flowPolicySupersede: MaterializerEnricher = {
  id: "flow-funding/flow-policy-supersede",
  eventPatterns: ["flow.policy_set"],
  phase: "post",
  critical: false,
  builtIn: true,
  declares: { reads: ["flow_policy"], writes: ["flow_policy"] },

  async handler(ctx: EnricherContext): Promise<void> {
    const data = extractPayloadDeep(ctx);
    const holon = data.holon as string | undefined;
    const context = data.context as string | undefined;
    const tokenKind = data.token_kind as string | undefined;
    const version = Number(data.version ?? 0);
    if (
      !holon || !context || !tokenKind || !Number.isFinite(version) ||
      version <= 0
    ) {
      L.warn(
        "flow-policy supersede: missing holon/context/token_kind/version",
        {
          holon,
          context,
          tokenKind,
          version,
        },
      );
      return;
    }

    // PC-700/701: async sibling on the serving path; warn on the sync arm.
    const q = ctx.scope.graphQueryAsync ?? ctx.scope.graphQuery;
    if (!ctx.scope.graphQueryAsync && ctx.scope.graphQuery) {
      L.warn("graphQueryAsync absent — sync graphQuery fallback (PC-700)", {
        holon,
        context,
      });
    }
    if (!q) return;

    // Scope the supersede to (holon, context, tokenKind): a new version of one
    // token-kind's band must NOT demote another kind's latest-active node.
    const res = await (q as NonNullable<typeof ctx.scope.graphQueryAsync>)({
      type: "flow_policy",
      where: { holon, context, token_kind: tokenKind },
      limit: 10000,
    });
    if (res.error) {
      L.warn("flow-policy supersede: query failed", { error: res.error });
      return;
    }

    const put = ctx.scope.graphPutAsync ?? ctx.scope.graphPut;
    for (const node of res.nodes ?? []) {
      const nodeVersion = Number(node.properties?.version ?? 0);
      const stillActive = node.properties?.is_latest === true ||
        node.properties?.is_latest === "true";
      // Demote every strictly-older version that is still flagged active. The
      // newest node (version === version) keeps its is_latest:true from the
      // generic projection.
      if (nodeVersion < version && stillActive) {
        await (put as NonNullable<typeof ctx.scope.graphPutAsync>)({
          type: "flow_policy",
          id: node.id,
          properties: { is_latest: false },
        });
        L.info("flow-policy superseded", {
          holon,
          context,
          tokenKind,
          demoted: nodeVersion,
          by: version,
        });
      }
    }
  },
};
