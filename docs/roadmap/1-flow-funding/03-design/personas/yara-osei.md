---
item: 1644-flow-funding
phase: 03-design
persona: yara-osei
source: constructed (product-designer synthesis, not a real-user intake)
authored: 2026-06-12
---

# Persona: Yara Osei

## Who she is

Yara organizes a mutual-aid circle of 18 people in a mid-sized city. The circle has been running for three years on group chats, shared spreadsheets, and periodic in-person check-ins. She is the de facto organizer but carries no formal role. She keeps track of who has been through a hard month, who has extra right now, and quietly coordinates transfers — all by hand, all in her head.

She is not financially sophisticated and does not want to be. She thinks in felt thresholds ("I have more than I need this month" / "I'm tight right now") not in dollar amounts. She does not want to set a precise floor or ceiling — she wants the system to accept "enough to breathe" as a valid answer and work from there.

She is mobile-first. She will use flow funding from her phone, probably in the evening after her kids are asleep.

## Context

- 18-person mutual-aid circle; some members have volatile incomes (gig work, seasonal employment)
- She is the informal organizer; she wants to hand off the tracking to the protocol and stop being the single point of coordination
- No interest in contracts, revenue-share, or formal agreements; the relational-weight end of the formality dial is her entire use case
- Commons pool: she wants a portion of surplus to flow automatically into the circle's emergency fund; she does not want to decide each time
- Privacy: she is comfortable with outcome-transparency within the circle but not outside it
- Device: primarily mobile; secondary laptop

## Emotional starting state

Exhausted from the coordination load and slightly guilty about it. She became the organizer because she cared, but the manual tracking has become a burden. She is not looking for a fintech product — she is looking for infrastructure that makes the circle's informal mutual aid more reliable without requiring her to manage it. Her barrier is not cost or trust — it is complexity. If the first screen requires her to set a dollar amount, she will close the app.

## Job to be done

**When** she sets up flow funding for her mutual-aid circle, **she wants** to do it without ever entering a dollar amount — only relative felt thresholds — and have the system derive sensible floor/ceiling values from her recent flow history, with a commons-pool tithe that runs automatically, so that the circle's informal mutual aid becomes self-sustaining without requiring her to coordinate each month.

Secondary: **When** one of the circle's members dips below floor, **she wants** to see that flow has already started moving toward them, so that she doesn't receive a "someone is struggling" notification that requires her action — the protocol already acted.

## 07-verification goal

**Yara opens the FlowPolicy configuration surface, chooses "felt threshold" mode (relative, not absolute), the system infers floor and ceiling ranges from a synthetic 3-month flow history, she confirms the ranges look right, enables the automatic commons-pool tithe at 5%, saves the policy; then opens the velocity view and sees that one synthetic circle member who is "in deficit" this period is already receiving support from Yara's outflow — without Yara having taken any manual action.**

This is testable: the verification passes when (a) the FlowPolicy surface offers a felt-threshold input path that does not require entering a specific dollar amount, (b) the system shows a derived range ("based on your recent flows: $800–$1,400/month — does this look right?"), (c) the commons-pool tithe is set and confirmed, and (d) the velocity view shows an active outflow to the deficit member in the current period without any manual trigger from Yara.
