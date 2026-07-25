# C7 — UI token-targeting fix (make UI-driven flow move REAL value)

**Root cause (firsthand):** the flow-funding UI hardcodes `token:"custom"` (a token KIND label), but
`token.pay`/`balance` need a real **tokenId** node (`tools-pay.ts:30` `loadNode(db, token)` → `token-not-found`).
So UI-armed settle refuses (`paid:0`), no value moves via the UI, and the C6 capstone is unsatisfiable on any
runner. Design §"routes existing token value" ⇒ the flow UI MUST target a real token the user holds. C4 proves
the backend cross works with a real tokenId. Scope: declared "UI wiring", reuse-not-build.

## The four hardcoded sites (src/packages/flow-funding/ui/flow-tab.js)
- `:513` `policy_set({ tokenKind: "custom" })` — arm
- `:387` `get_policy({ tokenKind: "custom" })` — load (init)
- `:661` `get_policy({ tokenKind: "custom" })` — reload
- `:873` `balance({ token: "custom" })` — context balance read

## Fix (RED-first, reuse existing token/wallet UI)
1. **RED test first:** a uc/integ proving a policy armed FROM THE UI carries a REAL tokenId (not "custom"),
   and that UI-driven settle against that token moves value (payee credited>0). Extend the C6 narrative to
   provision the token (below) so its terminal flow_outcome cross becomes reachable — that is the success case.
2. **state:** add `state.tokenId` (+ label) to flow-tab.js `state`. Populate from the user's held tokens via
   the existing token list op (reuse `ctx.api` token list / the wallet token-view source — DO NOT build a new
   list). Default to the user's primary/first held token; expose a selector on the Policy surface reusing the
   wallet token-list rendering (`token/ui/token-view.js` / `wallet-tab.js` patterns).
3. Replace the four `"custom"` usages with `state.tokenId`. Keep back-compat only if a real token exists;
   if the user holds NO token, show an honest empty-state ("define/receive a token to flow") — never silently
   fall back to a non-existent "custom".
4. **C6 test:** before arming, provision a REAL token like C4 does — `token define`→`mint`(payer)→`admit`(payee)
   →poll replication — then drive the UI to SELECT that tokenId, arm automatedSettlementCap from the UI, settle
   from the UI. Now value moves → attributed `flow_outcome` crosses → C6 real-GREEN (incl the CROSSED witness).
5. **Re-verify on build1** (healthy runner): C6 SOLO → `1 passed` + `flow_outcome CROSSED`, firsthand.

## Guardrails
- Honor Rule: assertions unchanged in spirit (real value must move); no `--no-verify`; no seeding the
  flow_outcome/settlement under test. Reuse existing token UI (owner reuse-vs-build preference).
- Do NOT weaken C6; the point is to make its real-value cross ACHIEVABLE by fixing the UI + test setup.
- Land only after firsthand C6 green: `--gate=owner-approval` + C1–C6 real-runner proof.
