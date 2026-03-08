# Scrum Backlog — Epics & User Stories

> **The Headless Booking Primitive (SlotKit)**
>
> Derived from PRD v3.0 — MVP + Post-MVP Decomposition
>
> 16 Epics · 71 User Stories · ~447 Story Points

| Field | Value |
|---|---|
| Version | 1.1 |
| Date | March 2026 |
| Sprint Length | 2 Weeks |
| MVP Target | 6 Sprints (12 Weeks) |
| Methodology | Scrum |

---

## 1. Overview & MVP Strategy

This document decomposes the Headless Booking Primitive PRD v3 into Scrum-ready epics and user stories with clearly defined acceptance criteria. Stories are prioritized using MoSCoW (Must / Should / Could / Won't) and sized with Fibonacci story points (1, 2, 3, 5, 8, 13).

### 1.1 MVP Definition

The MVP delivers a fully functional single-provider booking system that a developer can install, configure, and deploy in under a day. It covers the core value proposition: schema + math + UI. Team scheduling, payments, workflows, and advanced features are deferred to post-MVP iterations.

- **MVP Scope (Epics 1–6):** Database schema, slot engine with RRULE support, event types with booking questions, customer booking flow, host admin dashboard, and basic email notifications with Google Calendar sync.
- **Post-MVP Scope (Epics 7–16):** Team scheduling (round-robin, collective, managed), routing forms, Stripe payments, workflow automation, webhooks, recurring bookings, seats, embeds, REST API, CLI tooling, and multi-tenancy.

### 1.2 Sprint Cadence

- Sprint duration: 2 weeks
- MVP target: 6 sprints (12 weeks)
- Velocity assumption: 30–40 story points per sprint (small team of 2–3 developers)
- Definition of Done: Code reviewed, unit tested (>90% for logic), integration tested, documented, and merged to main

### 1.3 Epic Summary & Release Map

| Epic | Title | Priority | Sprints | Story Pts | Release |
|---|---|---|---|---|---|
| [E-01](./E-01_database_schema_infrastructure.md) | Database Schema & Infrastructure | MVP | 1 | 44 | R1 |
| [E-02](./E-02_slot_engine_availability.md) | Slot Engine & Availability Logic | MVP | 1–2 | 39 | R1 |
| [E-03](./E-03_event_types_booking_config.md) | Event Types & Booking Configuration | MVP | 2–3 | 26 | R1 |
| [E-04](./E-04_customer_booking_flow.md) | Customer Booking Flow (UI) | MVP | 3–4 | 34 | R1 |
| [E-05](./E-05_host_admin_dashboard.md) | Host & Admin Dashboard | MVP | 4–5 | 36 | R1 |
| [E-06](./E-06_notifications_calendar_sync.md) | Notifications & Calendar Sync | MVP | 5–6 | 31 | R1 |
| [E-07](./E-07_team_scheduling.md) | Team Scheduling | Post-MVP | 7–8 | 34 | R2 |
| [E-08](./E-08_routing_forms.md) | Routing Forms | Post-MVP | 8–9 | 18 | R2 |
| [E-09](./E-09_payments_stripe.md) | Payments & Stripe Integration | Post-MVP | 9–10 | 34 | R2 |
| [E-10](./E-10_workflow_automation.md) | Workflow Automation Engine | Post-MVP | 10–11 | 26 | R3 |
| [E-11](./E-11_webhook_infrastructure.md) | Webhook Infrastructure | Post-MVP | 11–12 | 21 | R3 |
| [E-12](./E-12_recurring_bookings_seats.md) | Recurring Bookings & Seats | Post-MVP | 12–13 | 21 | R3 |
| [E-13](./E-13_embed_modes.md) | Embed Modes | Post-MVP | 13–14 | 13 | R4 |
| [E-14](./E-14_rest_api.md) | REST API | Post-MVP | 14–15 | 21 | R4 |
| [E-15](./E-15_cli_tooling.md) | CLI Tooling (`@slotkit/cli`) | Post-MVP | 15–16 | 23 | R4 |
| [E-16](./E-16_multi_tenancy.md) | Multi-Tenancy & Organizations | Post-MVP | 16–18 | 26 | R5 |

**Total MVP:** ~210 story points across 6 sprints.
**Total Post-MVP:** ~237 story points across 12 additional sprints.

---

## 2. Scrum Ceremonies & Definitions

### 2.1 Definition of Done (DoD)

- Code is written in TypeScript with strict mode enabled.
- All acceptance criteria are met and verified.
- Unit tests pass with required coverage (>95% for core logic, >85% for UI components, >90% for API routes).
- Integration test exists for any database interaction or background job.
- Code has been peer reviewed and approved (minimum 1 reviewer).
- JSDoc comments exist on all exported functions, types, and component props.
- No TypeScript errors or ESLint warnings.
- Changes are documented in CHANGELOG.md.
- Feature branch is merged to `main` via squash merge.

### 2.2 Definition of Ready (DoR)

- User story has a clear title in "As a… I want to… so that…" format.
- Acceptance criteria are written, testable, and agreed upon by the team.
- Story is estimated (Fibonacci points) and fits within a single sprint.
- Dependencies on other stories are identified and either completed or deferred.
- Technical approach has been discussed in sprint planning or a refinement session.
- Any required design mockups or API contracts are available.

### 2.3 Sprint Ceremonies

| Ceremony | Frequency | Duration | Purpose |
|---|---|---|---|
| Sprint Planning | Start of sprint | 2 hours | Select stories from backlog, discuss approach, commit to sprint goal |
| Daily Standup | Daily | 15 minutes | Blockers, progress, and plan for the day |
| Backlog Refinement | Mid-sprint | 1 hour | Refine, estimate, and split upcoming stories |
| Sprint Review | End of sprint | 1 hour | Demo completed work to stakeholders |
| Sprint Retrospective | End of sprint | 45 minutes | Reflect on process and identify improvements |

### 2.4 Story Point Reference Scale

| Points | Complexity | Typical Example |
|---|---|---|
| 1 | Trivial | Fix a typo, update a config value, add a CSS class |
| 2 | Simple | Add a new column to a table, write a simple utility function |
| 3 | Small | Build a basic UI component, write a database query with joins |
| 5 | Medium | Implement a React hook with state management, build an API route with external API call |
| 8 | Large | Build a complex UI component (calendar, editor), implement a multi-step algorithm |
| 13 | Very Large | Implement the full slot engine pipeline, build the round-robin assignment algorithm |
