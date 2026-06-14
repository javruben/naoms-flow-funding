// src/packages/flow-funding/namespace.ts — 1644 M1 WS namespace handler.
//
// Routes the `flow.` WS namespace to the M1 policy handlers. The package
// loader discovers this `packageNamespace` export and registers the prefix.

import type { NamespaceHandler } from "@naoms/core/manifest/package-loader.ts";
import {
  type FlowHandlerContext,
  handleGetPolicy,
  handlePolicySet,
  type RespondFn,
} from "./handlers/policy-set.ts";

async function handleFlow(
  ctx: FlowHandlerContext,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const type = typeof msg.type === "string" ? msg.type : "";
  switch (type) {
    case "flow.policy_set":
      return await handlePolicySet(ctx, msg, respond);
    case "flow.get_policy":
      return await handleGetPolicy(ctx, msg, respond);
    default:
      return respond({ type, error: `Unknown message type: ${type}` });
  }
}

export const packageNamespace: NamespaceHandler = {
  prefix: "flow.",
  handler: handleFlow as NamespaceHandler["handler"],
};
