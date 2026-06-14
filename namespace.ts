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
import {
  type AgreementHandlerContext,
  handleAgreementAccept,
  handleAgreementPropose,
  handleAgreementRevoke,
  handleGetAgreement,
} from "./handlers/agreement.ts";

// The router context satisfies both handler slices (dbHandle/ownerDid/callerDid/
// graph + chain). Widen to their union at the dispatch boundary.
type FlowCtx = FlowHandlerContext & AgreementHandlerContext;

async function handleFlow(
  ctx: FlowCtx,
  msg: Record<string, unknown>,
  respond: RespondFn,
): Promise<void> {
  const type = typeof msg.type === "string" ? msg.type : "";
  switch (type) {
    case "flow.policy_set":
      return await handlePolicySet(ctx, msg, respond);
    case "flow.get_policy":
      return await handleGetPolicy(ctx, msg, respond);
    case "flow.agreement_propose":
      return await handleAgreementPropose(ctx, msg, respond);
    case "flow.agreement_accept":
      return await handleAgreementAccept(ctx, msg, respond);
    case "flow.agreement_revoke":
      return await handleAgreementRevoke(ctx, msg, respond);
    case "flow.get_agreement":
      return await handleGetAgreement(ctx, msg, respond);
    default:
      return respond({ type, error: `Unknown message type: ${type}` });
  }
}

export const packageNamespace: NamespaceHandler = {
  prefix: "flow.",
  handler: handleFlow as NamespaceHandler["handler"],
};
