# Product Requirements Document — The Headless Booking Primitive

> *The Shadcn for Scheduling*
>
> An open-source, composable developer toolkit for building industry-standard booking systems in Next.js and any Postgres database.

| Field          | Value       |
|----------------|-------------|
| Version        | 3.0         |
| Date           | March 2026  |
| Status         | Draft       |
| License        | MIT         |
| Classification | Open Source  |

---

## 1. Executive Summary

The Headless Booking Primitive is an open-source, MIT-licensed developer toolkit that provides the database schema, complex scheduling math, and copy-paste UI components needed to build production-grade booking systems. Built on Next.js and standard Postgres (via Drizzle ORM), it is designed as composable, vendor-agnostic infrastructure that developers integrate into their own applications — not a destination SaaS product. It runs on any Postgres provider: Neon, Supabase, Railway, Vercel Postgres, AWS RDS, or a local Docker container.

Version 3.0 of this PRD makes two transformative changes:

1. **Decouples the entire toolkit from Supabase-proprietary features** — replacing Edge Functions with Next.js API routes and Inngest background jobs, Supabase Auth with a pluggable `AuthAdapter` pattern (NextAuth.js default), Supabase migrations with Drizzle ORM and Drizzle Kit, and Row-Level Security with middleware-based authorization.
2. **Adds open-source project infrastructure as a first-class concern** — GitHub repository governance, CI/CD pipelines, a Starlight documentation site, a component registry, and comprehensive contributor tooling.

The project follows a philosophy captured in the phrase: **"Hide the Math, Expose the UI."** Developers get a battle-tested logic core that handles the notoriously difficult problems of timezone conversion, recurrence rules, and race-condition-safe slot allocation, while retaining full ownership over the UI, the data, and the user experience.

### 1.1 Problem Statement

Developers building applications with booking functionality face a painful dilemma. They can integrate a third-party SaaS (Calendly, Cal.com), which locks them into uncustomizable embeds, monthly fees, and third-party data storage. Alternatively, they can build from scratch, confronting weeks of work on timezone edge cases, recurrence logic, concurrent slot allocation, team scheduling algorithms, payment flows, and workflow automation. Neither option is acceptable for developers building premium, brand-native experiences.

### 1.2 Proposed Solution

This toolkit eliminates the dilemma by providing three composable layers:

1. A **core logic package** (`@slotkit/core`) that encapsulates all scheduling math.
2. A set of **copy-paste UI components** built on shadcn/ui conventions.
3. A **Drizzle ORM schema** with Next.js API routes and Inngest background jobs for the backend.

It covers the complete feature surface of a modern scheduling platform — from event types and team scheduling to payments and automated workflows — as headless primitives developers own and customize.

### 1.3 What's New in v3

- **Database-Agnostic Architecture:** Standard Postgres via Drizzle ORM; runs on any provider (Neon, Supabase, Railway, Vercel Postgres, AWS RDS, Docker).
- **Pluggable Auth:** `AuthAdapter` interface with NextAuth.js default; swap to Supabase Auth, Clerk, or Lucia with a single file change.
- **Standard Server Runtime:** Next.js API routes + Inngest background jobs replace all vendor-specific Edge Functions.
- **Open Source Infrastructure:** GitHub repo governance, CI/CD with GitHub Actions + Changesets, Turborepo monorepo.
- **Documentation & Component Registry:** Starlight docs site with auto-generated component registry, live previews, and copy-paste code blocks.
- **Serialization Retry Logic:** `withSerializableRetry()` utility handles Postgres `SERIALIZABLE` transaction contention automatically.
- **GDPR Compliance:** `anonymize_customer()` function for Right to be Forgotten requests without breaking audit trails.
- **Webhook Replay Protection:** Timestamp-based HMAC signing with configurable tolerance window.
- **Email Deliverability:** Bounce handling, spam complaint tracking, RFC 8058 one-click unsubscribe, and SPF/DKIM/DMARC guidance.
- **CLI Component Updates:** `diff` and `update --interactive` commands for safe upstream merge of customized components.
- **Event Types & Booking Types:** Named, configurable service definitions with duration, pricing, and custom booking questions.
- **Round-Robin, Collective & Managed Scheduling:** Full team assignment patterns with priority and weight-based distribution.
- **Routing Forms:** Pre-booking intake forms that dynamically route to the correct provider or event type.
- **Stripe Payment Integration (Deep):** Prepayment, no-show fees, time-based cancellation fees, and refund policies.
- **Workflow Engine:** Trigger-action automation for emails, SMS, and webhooks on booking lifecycle events.
- **Webhook Infrastructure:** Typed, replay-protected hooks with HMAC + timestamp signing.
- **Booking Limits & Controls:** Frequency limits, duration caps, buffer time, minimum notice, and future booking windows.
- **Recurring Bookings:** Repeating booking series with configurable frequency and occurrence limits.
- **Out-of-Office Management:** Temporary unavailability with optional redirect to teammate.
- **Seats & Group Bookings:** Multiple attendees per time slot for classes, workshops, and group events.
- **Embed Modes:** Inline, popup, and floating button embed options for non-Next.js sites.
- **Multi-Tenancy Foundations:** Organization and team scoping with middleware-based authorization for SaaS-ready deployments.
- **Developer API:** Full REST API mirroring all UI capabilities for programmatic access.

### 1.4 Target Audience

- Freelance and agency developers building client sites with booking needs (barber shops, clinics, studios, consultancies).
- Indie hackers and startup founders who want scheduling as a native feature, not a bolted-on widget.
- SaaS builders embedding scheduling into multi-tenant platforms (marketplaces, CRMs, LMS platforms).
- Experienced Next.js developers who value composability and would rather own their infrastructure.
- Teams migrating away from Cal.com (AGPL concerns), Calendly (customization limits), or other SaaS scheduling platforms.

---

## 2. Competitive Landscape

### 2.1 Competitor Matrix

| Dimension | Calendly | Cal.com | Build from Scratch | SlotKit (This) |
|---|---|---|---|---|
| Customization | Minimal (iframe) | Moderate (atoms) | Total (but costly) | Total (composable) |
| Data Ownership | Vendor-controlled | Self-host (AGPL) | Full ownership | Full ownership |
| Licensing | Proprietary SaaS | AGPL-3.0 | N/A | MIT |
| Time to Integrate | Minutes (but rigid) | Hours to days | Weeks to months | Hours to a day |
| Recurring Costs | Per-seat monthly | Free or paid cloud | Eng. maintenance | None |
| Round-Robin | Yes (paid) | Yes (team plan) | Must implement | Yes (built-in) |
| Routing Forms | No | Yes (team plan) | Must implement | Yes (built-in) |
| Payments/No-Show | Limited | Stripe integration | Must implement | Deep Stripe (built-in) |
| Workflow Automation | Yes (paid) | Yes (team plan) | Must implement | Yes (built-in) |
| Webhooks | Yes | Yes (extensive) | Must implement | Yes (typed, extensive) |
| Seats / Group | No | Yes | Must implement | Yes (built-in) |
| Recurring Bookings | No | Yes | Must implement | Yes (built-in) |
| Tech Stack Lock-in | Any (iframe) | React / Next.js | Any | Next.js / Any Postgres |
| Embed Options | iframe only | Inline/Popup/Float | N/A | Inline/Popup/Float |
| API Access | Yes (paid) | Yes (REST v2) | Custom | Yes (REST + hooks) |

### 2.2 Competitive Positioning

This toolkit competes against two distinct failure modes:

- **The SaaS Trap:** Calendly and Cal.com solve the complexity problem but introduce dependency, cost, data loss, and brand dilution. Cal.com's AGPL license further complicates commercial use, and its team features are gated behind paid plans.
- **The Maintenance Nightmare:** Building from scratch provides freedom but imposes an enormous, ongoing engineering burden. Most teams underestimate the difficulty of timezone math, recurring availability rules, team scheduling algorithms, payment orchestration, and concurrency-safe booking.

The Headless Booking Primitive occupies the open gap: the safety of proven logic with the freedom of full ownership, at the feature depth of a mature scheduling platform, under an MIT license.

---

## 3. Architecture & Technical Design

### 3.1 Design Philosophy

The architecture follows a **"Hide the Math, Expose the UI"** strategy. The scheduling logic (timezone math, recurrence rules, overlap detection, team assignment algorithms) is encapsulated in a versioned npm package. The UI layer is copy-paste source code that developers own entirely. The backend infrastructure is a Drizzle ORM schema, Next.js API routes, and Inngest background jobs that developers deploy to their own stack. The entire system is vendor-agnostic: it runs on any Postgres 15+ instance with no proprietary dependencies.

### 3.2 System Layers

#### 3.2.1 Layer 1 — Logic Package (`@slotkit/core`)

This is the installed npm dependency and the intellectual core of the project. It is framework-agnostic at its math layer and exposes a fully typed TypeScript API.

**Key Dependencies:**

- `date-fns` and `date-fns-tz` for standardized time manipulation and timezone conversions.
- `rrule` for parsing and expanding recurring availability rules (e.g., "Every Monday and Wednesday, except Dec 25").

**Core APIs:**

| API | Signature | Purpose |
|---|---|---|
| `useAvailability` | `({ providerId, date, duration, timezone, buffer? }) → Slot[]` | React hook: the hero API for computing available slots |
| `getAvailableSlots` | `(providerId, dateRange, timezone, options?) → Slot[]` | Imperative slot engine for non-React contexts |
| `getTeamSlots` | `(teamId, strategy, dateRange, timezone) → TeamSlot[]` | Compute slots across a team with round-robin / collective logic |
| `assignHost` | `(teamId, slot, strategy, weights?) → HostAssignment` | Determine which host gets a booking based on assignment strategy |
| `isSlotAvailable` | `(providerId, startTime, endTime) → boolean` | Quick check for a single slot |
| `parseRecurrence` | `(rruleString) → DateOccurrence[]` | Expand RRULE into concrete date/time windows |
| `normalizeToUTC` | `(localTime, timezone) → UTCTime` | Convert local time to UTC handling DST transitions |
| `computeBookingLimits` | `(providerId, eventTypeId, date) → LimitStatus` | Check frequency, duration, and active booking limits |

**Slot Computation Pipeline (Three-Step Model):**

1. **Base Layer:** Apply `availability_rules` via RRULE expansion. ("It's a Monday, generate slots 9 AM–5 PM in 30-minute increments.")
2. **Mask Layer:** Apply `availability_overrides` and `out-of-office` entries. ("Oct 2 is a Monday, but there's an override marking it unavailable — delete those slots.")
3. **Filter Layer:** Subtract existing bookings, apply buffer time, enforce booking limits. ("There's a booking at 10 AM with a 5-minute buffer — remove 10:00 and mark 10:30 as the next available.")

#### 3.2.2 Layer 2 — UI Components (Copy-Paste)

These are React components developers copy into their project and fully own. They follow shadcn/ui conventions: unstyled or minimally styled, composable, and customizable via `className` and render props.

**Key Dependencies:**

- `shadcn/ui` as the component foundation.
- `react-day-picker` for the customer-facing date selection calendar.
- `react-big-calendar` for the host-side admin dashboard.
- `react-hook-form` for booking questions and routing forms.

**Component Inventory:**

| Component | User | Purpose |
|---|---|---|
| `<BookingCalendar />` | Customer | Date picker displaying available dates, respecting provider schedule and timezone |
| `<TimeSlotPicker />` | Customer | Selectable time slots for a chosen date, grouped by morning/afternoon/evening |
| `<BookingConfirmation />` | Customer | Summary view with booking details, customer info form, and confirm action |
| `<BookingQuestions />` | Customer | Dynamic form rendering custom booking questions configured per event type |
| `<RoutingForm />` | Customer | Pre-booking intake form that routes to the correct provider or event type |
| `<RecurringBookingPicker />` | Customer | Frequency and occurrence selector for recurring booking series |
| `<SeatsPicker />` | Customer | Seat selection for group events with capacity display |
| `<PaymentGate />` | Customer | Stripe payment form for prepayment, deposit holds, and no-show fee authorization |
| `<AvailabilityEditor />` | Host/Admin | Visual editor for weekly recurring hours with RRULE generation |
| `<OverrideManager />` | Host/Admin | Interface for blocked dates, extra hours, and out-of-office entries |
| `<AdminScheduleView />` | Host/Admin | Weekly calendar dashboard with all bookings, powered by react-big-calendar |
| `<EventTypeManager />` | Host/Admin | CRUD interface for event types with duration, price, questions, and limits |
| `<TeamAssignmentEditor />` | Admin | Round-robin, collective, and managed event configuration for teams |
| `<WorkflowBuilder />` | Admin | Visual trigger-action workflow editor for automation rules |
| `<WebhookManager />` | Admin | Webhook subscription management with trigger selection and payload preview |
| `<BookingStatusBadge />` | Both | Visual indicator of booking state: confirmed, pending, cancelled, completed, no-show |
| `<EmbedConfigurator />` | Admin | Generate embed code snippets (inline, popup, floating button) |

#### 3.2.3 Layer 3 — Backend Infrastructure (Postgres + Next.js + Inngest)

The backend consists of a Postgres schema defined via Drizzle ORM, middleware-based authorization, database functions, Next.js API routes for synchronous operations, and Inngest functions for background jobs (email sending, calendar sync, workflow execution, webhook dispatch).

**Database Layer (Drizzle ORM):**

- Schema is defined in TypeScript using `drizzle-orm/pg-core`, producing auto-inferred types with zero codegen.
- Migrations run via `drizzle-kit push` or `drizzle-kit migrate` against any Postgres 15+ instance.
- A `docker-compose.yml` is provided for local development with standard Postgres (not a full Supabase instance).
- Tested against: local Docker Postgres, Neon, Supabase, Railway, Vercel Postgres, AWS RDS.

**Authentication (AuthAdapter pattern):**

- A pluggable `AuthAdapter` interface defines: `getCurrentUser()`, `getSession()`, `signIn()`, `signOut()`, `verifyToken()`.
- Default implementation uses NextAuth.js with Credentials + Google OAuth providers.
- Optional adapters provided for: Supabase Auth, Clerk, and Lucia.
- Middleware wrapper (`withAuth()`) injects the authenticated user into every request, enforcing data isolation at the query layer.
- Optional Postgres RLS policies available as a defense-in-depth addendum (not required).

**Background Jobs (Inngest):**

- Email notifications (confirmation, reminders, cancellation) run as Inngest functions triggered by booking events.
- Google Calendar sync runs as a scheduled Inngest cron function.
- Workflow engine evaluates trigger-condition-action rules via Inngest event handlers.
- Webhook dispatch with retry logic runs as Inngest functions with built-in retry and failure handling.
- Developers can replace Inngest with any job runner (Trigger.dev, BullMQ, Vercel Cron) by implementing the `JobAdapter` interface.

### 3.3 Adapter Architecture

The toolkit uses a pluggable adapter pattern to avoid vendor lock-in. Every external dependency is abstracted behind a TypeScript interface with a default implementation and documented alternatives.

| Adapter Interface | Default Implementation | Alternatives | Methods |
|---|---|---|---|
| `AuthAdapter` | NextAuth.js (Credentials + Google) | Supabase Auth, Clerk, Lucia, Custom | `getCurrentUser()`, `getSession()`, `signIn()`, `signOut()`, `verifyToken()` |
| `JobAdapter` | Inngest | Trigger.dev, BullMQ, Vercel Cron, Custom | `enqueue()`, `schedule()`, `cancel()` |
| `EmailAdapter` | Resend | SendGrid, AWS SES, Postmark, Custom | `send()`, `sendBatch()`, `getDeliveryStatus()` |
| `CalendarAdapter` | Google Calendar (OAuth) | Outlook Calendar, CalDAV, Custom | `createEvent()`, `updateEvent()`, `deleteEvent()`, `getConflicts()` |
| `StorageAdapter` | Environment variable encryption key | AWS KMS, GCP KMS, HashiCorp Vault, Custom | `encrypt()`, `decrypt()` |

### 3.4 Open Source Project Infrastructure

The project is structured as a Turborepo monorepo with clearly separated packages, comprehensive CI/CD, and community governance.

**Monorepo Structure:**

| Package | Path | Purpose |
|---|---|---|
| `@slotkit/core` | `packages/core/` | Slot engine, timezone utils, RRULE parser, team algorithms |
| `@slotkit/db` | `packages/db/` | Drizzle ORM schema, migrations, type exports |
| `@slotkit/cli` | `packages/cli/` | Scaffolding CLI: init, add, migrate, generate, diff, update |
| `@slotkit/embed` | `packages/embed/` | Lightweight embed script (< 50KB gzipped) |
| UI Components | `packages/ui/` | 17+ React components with metadata headers |
| Documentation | `packages/docs/` | Astro Starlight site with component registry |
| Barber Shop Demo | `packages/demo/` | Full working example application |

**CI/CD Pipeline (GitHub Actions):**

- **PR Pipeline:** install → lint (ESLint + Prettier) → typecheck (tsc) → test (Vitest against Postgres service container) → build (turbo build)
- **Release Pipeline:** Changesets-based versioning, auto-publish to npm, auto-deploy docs site.
- **Branch Strategy:** `main` (always deployable) ← `develop` (integration) ← `feature/*` | `fix/*` | `docs/*`

**Documentation Site (Starlight):**

- Auto-deployed on merge to `main` via Vercel, Netlify, or Cloudflare Pages.
- **Component Registry:** auto-generated from `packages/ui/` metadata headers with live previews and copyable code blocks.
- **Structure:** Getting Started, Guides (availability, event types, booking flow, auth adapters, database providers), API Reference (auto-generated from JSDoc), Component Reference, Database Reference (Drizzle schema + ER diagram), Recipes.
- Versioned documentation: `/docs/v1/`, `/docs/v2/` when breaking changes occur.
- Every page includes an "Edit on GitHub" link for community contributions.

---

## 4. Data Model

### 4.1 Core Schema

The v3 schema is defined in TypeScript via Drizzle ORM and supports event types, team scheduling, payments, workflows, webhooks, and GDPR anonymization. All tables include optional `organization_id` for multi-tenancy readiness. The schema runs on any Postgres 15+ instance.

| Entity | Key Fields | Purpose |
|---|---|---|
| `organizations` | id, name, slug, settings, created_at | Multi-tenancy container; optional for single-tenant deploys |
| `teams` | id, org_id, name, slug, settings | Group of providers within an organization |
| `team_members` | id, team_id, user_id, role, priority, weight | Membership with role (admin/member) and round-robin weight |
| `providers` | id, org_id, user_id, display_name, timezone, metadata | Individual provider linked to auth user via AuthAdapter |
| `event_types` | id, provider_id, team_id, title, slug, duration_minutes, buffer_before, buffer_after, price_cents, currency, location_type, booking_limits, requires_confirmation, is_recurring, max_seats, custom_questions, metadata | Named bookable service with all configuration |
| `availability_rules` | id, provider_id, event_type_id, rrule, start_time, end_time, timezone, valid_from, valid_until | RRULE-based recurring availability |
| `availability_overrides` | id, provider_id, date, start_time, end_time, is_unavailable, reason | Date-specific overrides: blocked days or extra hours |
| `out_of_office` | id, provider_id, start_date, end_date, reason, redirect_to_user_id | Temporary unavailability with optional teammate redirect |
| `bookings` | id, event_type_id, provider_id, team_id, customer_email, customer_name, customer_phone, starts_at, ends_at, status, payment_status, recurring_booking_id, metadata, created_at | Core booking record with DB-level overlap prevention |
| `booking_events` | id, booking_id, event_type, actor, metadata, created_at | Immutable audit trail: created, confirmed, rescheduled, cancelled, completed, no_show, payment_received, payment_failed |
| `booking_questions_responses` | id, booking_id, question_key, response_value | Answers to custom booking questions |
| `recurring_bookings` | id, event_type_id, provider_id, customer_email, frequency, count, starts_at | Parent record for recurring booking series |
| `booking_seats` | id, booking_id, attendee_email, attendee_name, status | Individual seat assignments for group bookings |
| `payments` | id, booking_id, stripe_payment_intent_id, amount_cents, currency, status, payment_type, refund_amount_cents, created_at | Payment records: prepay, no_show_hold, cancellation_fee |
| `routing_forms` | id, org_id, team_id, title, fields, routing_rules, created_at | Pre-booking intake form with conditional routing logic |
| `routing_submissions` | id, form_id, responses, routed_to_event_type_id, routed_to_provider_id, created_at | Submission audit trail for routing forms |
| `workflows` | id, org_id, name, trigger, conditions, actions, is_active | Automation rules: trigger + conditions + actions |
| `workflow_logs` | id, workflow_id, booking_id, action_type, status, error, executed_at | Execution log for workflow debugging |
| `webhooks` | id, org_id, team_id, event_type_id, subscriber_url, triggers, secret, is_active | Webhook subscriptions at org, team, or event-type scope |
| `webhook_deliveries` | id, webhook_id, trigger, payload, response_code, delivered_at | Delivery log for webhook debugging |
| `email_delivery_log` | id, booking_id, email_type, recipient, status, bounced_at, created_at | Email delivery tracking: sent, delivered, bounced, complained |
| `customer_preferences` | id, email, email_opt_out, bounced_at, anonymized_at | Customer-level preferences and GDPR anonymization tracking |

### 4.2 Assignment Strategy Enum

| Strategy | Behavior | Use Case |
|---|---|---|
| `ROUND_ROBIN` | Cycle through available hosts, weighted by priority and weight fields | Sales teams, support queues, barber shops with multiple barbers |
| `COLLECTIVE` | Find slots where ALL selected hosts are available simultaneously | Panel interviews, group consultations, team onboarding |
| `MANAGED` | Admin creates event template; team members inherit with optional personalization | Standardized consultations across a firm |
| `FIXED` | Always assign to specific host(s), ignoring rotation | VIP client relationships, account managers |

### 4.3 Double-Booking Prevention

Double-booking is prevented at the database level using a Postgres exclusion constraint with the `btree_gist` extension:

```sql
EXCLUDE USING gist (
  provider_id WITH =,
  tstzrange(starts_at, ends_at) WITH &&
) WHERE (status NOT IN ('cancelled', 'rejected'))
```

This guarantees atomicity even under high-concurrency loads, eliminating race condition bugs entirely. No application-level locking is required.

Because the booking function runs in `SERIALIZABLE` transactions, the application layer includes a `withSerializableRetry()` utility that catches `SQLSTATE 40001` (serialization_failure) and retries with jittered exponential backoff (up to 3 attempts, base 50ms). This is critical for handling contention under concurrent load without surfacing raw Postgres errors to customers.

### 4.4 Booking Status State Machine

Bookings transition through defined states. Every transition is recorded as an immutable event in `booking_events`.

| From State | To State | Trigger |
|---|---|---|
| (new) | `pending` | Booking created when `requires_confirmation = true` or payment pending |
| (new) | `confirmed` | Booking created when auto-confirm and no payment required |
| `pending` | `confirmed` | Host confirms, or payment succeeds |
| `pending` | `rejected` | Host rejects the booking request |
| `confirmed` | `cancelled` | Customer or host cancels; triggers refund policy evaluation |
| `confirmed` | `rescheduled` | Customer or host moves to new time (atomic cancel + rebook) |
| `confirmed` | `completed` | Booking end time passes, or host marks complete |
| `confirmed` | `no_show` | Host marks customer as no-show; triggers no-show fee if configured |

---

## 5. Functional Requirements

### 5.1 Event Types & Booking Types

**FR-100: Event Type Configuration**

- Providers shall create named event types with title, slug, description, duration, location type, and price.
- Each event type shall support configurable buffer time before and after appointments.
- Event types shall support custom booking questions (text, select, checkbox, phone, email) with required/optional flags.
- Event types shall be assignable to individual providers or teams.
- Slot duration, interval, and minimum notice shall be configurable per event type.

**FR-101: Booking Limits & Controls**

- Frequency limits: Maximum bookings per day/week/month per event type (e.g., max 5 consultations per week).
- Duration limits: Maximum total booked hours per day/week/month.
- Active booking limits: Maximum concurrent pending/confirmed bookings per customer.
- Future booking window: How far in advance bookings can be made (e.g., max 30 days out).
- Minimum notice period: Minimum lead time before a booking (e.g., no bookings less than 2 hours away).
- Offset start times: Slots start at non-standard intervals (e.g., every 20 minutes instead of on the hour).

### 5.2 Customer-Facing Booking Flow

**FR-200: Date & Slot Selection**

- Display a calendar showing only dates with available slots, respecting provider rules, overrides, and timezone.
- Auto-detect customer timezone; allow manual override with timezone selector.
- Compute available slots using the three-step pipeline: Base → Mask → Filter.
- For team events, merge provider availabilities based on assignment strategy (union for round-robin, intersection for collective).
- Visually disable past dates, fully booked dates, and out-of-office dates.

**FR-201: Booking Questions & Intake**

- Render custom booking questions defined on the event type before confirmation.
- Support field types: short text, long text, single select, multi-select, phone, email, number, checkbox.
- Store responses in `booking_questions_responses` linked to the booking.

**FR-202: Recurring Bookings**

- Customers shall select a recurrence frequency (weekly, biweekly, monthly) and maximum occurrences.
- System shall validate all occurrences for availability before confirming the series.
- Cancelling one occurrence shall not cancel the series; cancelling the series shall cancel all future occurrences.

**FR-203: Seats & Group Bookings**

- Event types with `max_seats > 1` shall allow multiple customers to book the same time slot.
- Available seat count shall decrement as attendees book; slot hides when capacity is reached.
- Each attendee shall receive individual confirmation and can cancel independently.

**FR-204: Booking Confirmation & Management**

- Display summary (date, time in customer timezone, provider, duration, price) before confirmation.
- On confirmation, atomically insert booking validated by DB exclusion constraint.
- Send confirmation email to customer and provider.
- Provide unique booking management link for view, reschedule, or cancel.
- Rescheduling shall atomically cancel the old slot and create a new booking.

### 5.3 Team Scheduling

**FR-300: Round-Robin Scheduling**

- Distribute bookings across available team members in rotation.
- Support priority levels (low, medium, high) that influence host selection likelihood.
- Support weight-based distribution (e.g., senior barber gets 200% weight, junior gets 100%).
- Only confirmed bookings count toward past booking counts for weight calculation.
- Support fixed hosts who attend every meeting plus rotating round-robin hosts.

**FR-301: Collective Scheduling**

- Find time slots where ALL selected team members are simultaneously available.
- Display only the intersection of all hosts' availability to the booker.
- All hosts are added as attendees to the created booking and calendar event.

**FR-302: Managed Event Types**

- Admins create event type templates that team members inherit.
- Admins can lock specific fields (duration, price, questions) or allow member personalization.
- New team members can be auto-assigned to managed event types.

### 5.4 Routing Forms

**FR-400: Dynamic Routing**

- Admins create intake forms with configurable fields (dropdown, text, radio, checkbox).
- Define routing rules: based on field responses, route to a specific event type, provider, or team.
- Support conditional logic (if answer is X, route to provider A; if Y, route to team B's round-robin).
- Log all routing submissions for analytics and debugging.
- Integrate with the booking flow: after routing, the customer seamlessly enters the slot selection step.

### 5.5 Host & Admin Management

**FR-500: Availability Configuration**

- Define recurring weekly availability using a visual editor that generates RRULE strings.
- Support multiple availability schedules per provider (e.g., different hours for different event types).
- Add date-specific overrides: blocked days (vacation, holiday) or extra hours.
- Changes to availability shall not affect existing confirmed bookings.

**FR-501: Out-of-Office**

- Providers mark date ranges as out-of-office with reason text.
- Optionally redirect booking links to a specified teammate during OOO period.
- OOO dates are visible to customers on the booking calendar (showing when provider returns).

**FR-502: Schedule Dashboard**

- Weekly/monthly calendar view of all bookings, color-coded by status.
- Manually create, reschedule, cancel, or mark bookings as no-show from the dashboard.
- Filter by event type, provider, team, status, and date range.
- Team admins see aggregated view across all team members.

**FR-503: Booking Confirmation Mode**

- Event types can require manual host confirmation (opt-in booking).
- Pending bookings appear in host dashboard with approve/reject actions.
- Auto-rejection after configurable timeout (e.g., 24 hours).

### 5.6 Payments & Monetization

**FR-600: Stripe Integration**

- Connect provider's Stripe account via Stripe Connect (standard or express).
- Event types specify pricing: free, prepaid (charge on booking), or held payment (no-show fee).
- Support Apple Pay and Google Pay via Stripe's Payment Element.

**FR-601: Payment Modes**

- **Prepayment:** Full charge at booking time; booking auto-confirms on successful payment.
- **No-Show Fee Hold:** Authorize/hold an amount on the customer's card; only capture if host confirms no-show.
- **Time-Based Cancellation Fee:** Configurable fee window (e.g., cancel < 24h before = 50% fee, < 2h = 100% fee).

**FR-602: Refund Policy Engine**

- Configurable per event type: full refund, partial refund, or no refund based on cancellation timing.
- Automatic refund processing on qualifying cancellations.
- All payment events logged in the `payments` table with Stripe payment intent references.

### 5.7 Workflow Automation

**FR-700: Workflow Engine**

- Define workflows as trigger + conditions + actions.
- Workflows are scoped to organization, team, or individual event type level.

**FR-701: Triggers**

- Booking created, Booking confirmed, Booking cancelled, Booking rescheduled.
- Before event start (configurable: 24h, 1h, 15min), After event end.
- Payment received, Payment failed, No-show confirmed.
- Routing form submitted.

**FR-702: Actions**

- Send email (to customer, host, or custom address) with template variables.
- Send SMS (via Twilio/provider) with template variables.
- Fire webhook to external URL with typed payload.
- Update booking status (e.g., auto-complete after event end).
- Create/update external calendar event (Google Calendar, Outlook).

**FR-703: Templates & Variables**

- Workflows support customizable message templates with dynamic variables: `{booking.title}`, `{booking.startTime}`, `{attendee.name}`, `{host.name}`, `{event.location}`, etc.
- Default templates provided for common scenarios (confirmation, reminder, cancellation, follow-up).

### 5.8 Webhook Infrastructure

**FR-800: Webhook Subscriptions**

- Subscribe to events at user, team, or event-type scope.
- Configurable subscriber URL with optional HMAC secret for payload verification.
- Typed triggers: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_PAID`, `BOOKING_PAYMENT_INITIATED`, `BOOKING_NO_SHOW`, `MEETING_STARTED`, `MEETING_ENDED`, `FORM_SUBMITTED`, `OOO_CREATED`.
- Custom payload templates with variable interpolation.
- Delivery log with response codes for debugging failed deliveries.
- Retry logic with exponential backoff for failed webhook deliveries (3 attempts).

### 5.9 Calendar & Integration Sync

**FR-900: Google Calendar Sync**

- OAuth connection to provider's Google Calendar.
- New bookings create events on the provider's connected calendar.
- External calendar events optionally block availability (two-way conflict checking).
- Support multiple connected calendars with selectable primary for event creation.

**FR-901: Email Notifications**

- Confirmation emails to customer and provider on booking creation.
- Reminder emails at configurable intervals (default: 24h and 1h before).
- Cancellation and rescheduling notification emails.
- Custom branding (logo, colors, reply-to) on all outgoing emails.

**FR-902: Embed Modes**

- **Inline Embed:** Render full booking calendar inside a host page via `<script>` tag or React component.
- **Popup Embed:** Button click opens booking flow in a modal overlay.
- **Floating Button:** Persistent button in page corner that opens booking popup.
- Each mode supports custom colors, branding, and pre-filled parameters via URL or config.

---

## 6. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Slot computation for a single provider over a 30-day range | < 100ms |
| Performance | Team slot computation (round-robin, 10 members, 30 days) | < 500ms |
| Performance | Booking creation (insert + constraint check + payment init) | < 300ms at p99 |
| Concurrency | Simultaneous booking attempts for the same slot | Exactly one succeeds; others receive clear conflict error |
| Reliability | Database-level double-booking prevention | Zero double-bookings under any load |
| Timezone | Correct handling across DST transitions | 100% accuracy verified by property-based tests |
| Accessibility | UI components meet WCAG 2.1 AA | Keyboard navigable, screen-reader compatible |
| Bundle Size | `@slotkit/core` gzipped | < 20 KB |
| Browser Support | Customer-facing components | Last 2 versions of Chrome, Firefox, Safari, Edge |
| Documentation | Every public API function and component | JSDoc + dedicated docs site |
| Test Coverage | Core logic package | > 95% line coverage |
| Test Coverage | Team scheduling algorithms | > 90% with property-based fuzzing |
| API Latency | REST API endpoint response time | < 200ms at p95 |
| Webhook Delivery | Time from trigger event to webhook dispatch | < 5 seconds |

---

## 7. Developer Experience Requirements

As a developer toolkit, DX is the product. The following requirements govern how developers interact with the project.

### 7.1 Installation & Setup

**DX-100: Quick Start Path**

1. Developer runs `npm install @slotkit/core` to install the logic package.
2. Developer runs `npx drizzle-kit push` with their Postgres connection string to create the schema.
3. Developer copies desired UI components via CLI (`npx @slotkit/cli add booking-calendar`) or manual copy.
4. Developer imports components and the `useAvailability` hook; system works with sensible defaults.

**DX-101: CLI Tool (`@slotkit/cli`)**

- `npx @slotkit/cli init` — Interactive setup that scaffolds schema, env config, and starter components (prompts for database provider and auth adapter).
- `npx @slotkit/cli add <component>` — Adds individual components to the project (shadcn-style) with dependency resolution.
- `npx @slotkit/cli migrate` — Runs pending Drizzle Kit migrations against the connected Postgres instance.
- `npx @slotkit/cli generate types` — Generates consolidated TypeScript types barrel file from the Drizzle schema.
- `npx @slotkit/cli diff <component>` — Shows a colored diff between local (customized) and latest upstream component version.
- `npx @slotkit/cli update <component> --interactive` — Three-way merge for safely applying upstream fixes to customized components.

### 7.2 Customization Surface

- All UI components accept `className`, `style`, and render props / slot patterns for structural customization.
- Core logic exposes configuration objects for slot duration, buffer time, locale, first-day-of-week, and time format (12h/24h).
- Developers extend the Postgres schema via foreign keys to custom tables without modifying core tables.
- Workflow actions are extensible: developers register custom action handlers alongside built-in ones.
- Webhook payloads include raw booking data plus any custom metadata from event types and booking questions.

### 7.3 REST API

A complete REST API is provided as Next.js API routes that developers deploy to their own application. The API mirrors every UI capability for programmatic access.

| Endpoint Group | Key Operations | Auth |
|---|---|---|
| `/api/event-types` | CRUD event types, manage custom questions | Provider API key |
| `/api/availability` | Get/set availability rules, overrides, OOO | Provider API key |
| `/api/slots` | Compute available slots for a date range | Public (optionally scoped) |
| `/api/bookings` | Create, confirm, cancel, reschedule, mark no-show | Signed token or API key |
| `/api/teams` | Manage team members, assignment strategy, weights | Admin API key |
| `/api/routing-forms` | CRUD routing forms and rules | Admin API key |
| `/api/workflows` | CRUD workflows, view execution logs | Admin API key |
| `/api/webhooks` | Manage webhook subscriptions | Admin API key |
| `/api/payments` | View payment history, initiate refunds | Admin API key |

### 7.4 Documentation

- Dedicated documentation site built with Astro Starlight, auto-deployed on merge to `main` via Vercel/Netlify/Cloudflare Pages.
- **Component registry:** auto-generated `/components` page with live previews, full source code in copyable blocks, props tables, and customization guides.
- Full working example application (the "Barber Shop" demo) deployed and open-source, runnable locally in under 3 minutes with Docker + Node.
- Advanced example: multi-provider salon with round-robin, payments, and workflows.
- Inline JSDoc comments on every exported function, type, and component prop.
- Migration guides for teams coming from Calendly, Cal.com, or Supabase-specific setups.
- Auth adapter guides for NextAuth.js (default), Supabase Auth, Clerk, and custom implementations.
- Database provider guides for Neon, Railway, Vercel Postgres, AWS RDS, and local Docker.
- Video walkthrough of the quick-start flow (< 5 minutes from zero to working booking page).

---

## 8. Reference Use Case — The Barber Shop

### 8.1 Scenario (v2: Multi-Barber Salon)

A freelance developer is building a custom site for a barber shop with three barbers. Each barber offers different services (Haircut = 30min, Shave = 15min, Full Service = 45min) at different prices. The shop wants online booking with automatic distribution across barbers, payment collection, no-show fees, email reminders, and Google Calendar sync.

### 8.2 Integration Steps

1. **Schema:** Run `npx drizzle-kit push` against any Postgres instance. Tables, constraints, and the `btree_gist` extension are created in a single migration. Works with Neon, Supabase, Railway, or a local Docker Postgres.
2. **Core:** `npm install @slotkit/core`. Import `useAvailability` and `getTeamSlots`.
3. **Event Types:** Create three event types (Haircut, Shave, Full Service) with durations, 5-minute buffer, and prices.
4. **Team Setup:** Create a team for the shop. Add three barbers with round-robin assignment and weights (senior barber gets 150% weight).
5. **Routing:** Create a routing form asking "What service do you need?" that routes to the appropriate event type.
6. **Payments:** Connect the shop's Stripe account. Configure Haircut as prepaid ($25), Shave as free, Full Service with a $10 no-show hold.
7. **UI:** Copy `<RoutingForm />`, `<BookingCalendar />`, `<TimeSlotPicker />`, and `<PaymentGate />` into the site. Style to match the brand.
8. **Workflows:** Create workflows for confirmation email on booking, SMS reminder 1 hour before, and follow-up email 24 hours after.
9. **Calendar Sync:** Each barber connects their Google Calendar. External appointments block availability automatically.
10. **Go Live:** Deploy. Customers select a service, pick a slot, pay, and receive confirmations. Barbers see bookings in their dashboard and Google Calendar.

### 8.3 Outcome

- Brand-native booking experience with no iframes, no third-party branding.
- Developer ships in 2–3 days instead of 4–6 weeks.
- All customer and payment data lives in the shop's own Postgres database and Stripe account.
- Zero recurring SaaS fees (Postgres hosting free tier + Stripe transaction fees only).
- Round-robin ensures fair distribution; senior barber gets proportionally more appointments.
- No-show fees protect revenue; automated reminders reduce no-shows.
- Fully extensible: add loyalty points, product upsells, or tip collection later.

---

## 9. Package Structure & Distribution

| Package / Artifact | Distribution | License | Purpose |
|---|---|---|---|
| `@slotkit/core` | npm registry | MIT | Slot engine, timezone utils, recurrence parser, team algorithms, booking limits |
| `@slotkit/db` | npm registry | MIT | Drizzle ORM schema, migrations, type exports, database utilities |
| `@slotkit/cli` | npm registry | MIT | Scaffolding CLI: init, add, migrate, generate, diff, update |
| `@slotkit/embed` | npm registry | MIT | Lightweight embed script for non-Next.js sites (inline, popup, float) |
| UI Components | Copy-paste / CLI | MIT | 17 React components (shadcn convention) with component registry |
| API Routes | Copy-paste / CLI | MIT | Next.js API routes for full REST API + Inngest background job handlers |
| Auth Adapters | Copy-paste / CLI | MIT | AuthAdapter implementations for NextAuth, Supabase Auth, Clerk, Lucia |
| Docs Site | Web (Starlight) | MIT | API reference, component registry, guides, tutorials, recipes |
| Barber Shop Demo | GitHub repo | MIT | Full working example: multi-provider salon (runs on Docker Postgres) |

---

## 10. Security Considerations

**SEC-100: Authorization & Data Isolation**

Data isolation is enforced via middleware-based authorization (`withAuth()` wrapper) that injects the authenticated user into every query and scopes all database operations to the user's own data. An optional Postgres RLS policy set is provided as a defense-in-depth addendum for teams that want database-level enforcement. The `AuthAdapter` interface abstracts all authentication concerns, supporting NextAuth.js (default), Supabase Auth, Clerk, and custom implementations.

**SEC-101: Input Validation**

The core package validates all inputs (date ranges, RRULE strings, timezone identifiers, event type configurations) before processing. Malformed inputs throw typed errors with descriptive messages.

**SEC-102: Rate Limiting**

Documentation includes recommended rate-limiting middleware for booking creation, slot queries, and API endpoints. Example patterns for Next.js middleware are provided. Default: 10 booking attempts per IP per minute.

**SEC-103: Payment Security**

All payment processing occurs server-side via Stripe's server SDKs. No card data touches the application. Payment intents are created server-side and confirmed client-side via Stripe Elements. Webhook signatures are verified using Stripe's signing secret.

**SEC-104: Webhook Security**

All outgoing webhooks support HMAC-SHA256 signing with a timestamp in the `X-SlotKit-Timestamp` header. The signature is computed over `timestamp + '.' + rawBody`. A `verifyWebhookSignature()` utility rejects payloads outside a configurable tolerance window (default 5 minutes), preventing replay attacks. Delivery logs never store full subscriber responses, only status codes.

**SEC-105: Data Privacy & GDPR**

The toolkit never transmits customer data to any external service except those explicitly configured (Stripe, Google Calendar, email provider). All data remains within the developer's own Postgres database. PII fields (`customer_email`, `customer_phone`) support optional encryption at rest via a configurable encryption key in environment variables. An `anonymize_customer()` database function handles GDPR Right to be Forgotten requests by replacing PII across all tables while preserving audit trail structure and financial records.

**SEC-106: Email Deliverability & Compliance**

All outgoing emails include RFC 8058 one-click unsubscribe headers (`List-Unsubscribe`, `List-Unsubscribe-Post`). Hard bounces automatically flag customer records to prevent future sends. Spam complaints auto-opt-out the customer from non-transactional emails. Documentation includes an SPF/DKIM/DMARC setup guide for sender domain configuration.

---

## 11. Milestones & Roadmap

### 11.1 Phase 0 — Open Source Infrastructure (Weeks 1–2)

1. Set up Turborepo monorepo with packages: core, db, ui, cli, embed, docs, demo.
2. Configure GitHub repo: branch protection, PR/issue templates, CODEOWNERS, labels, CI/CD with GitHub Actions + Changesets.
3. Build and deploy Starlight documentation site with component registry auto-generation.
4. Create governance files: LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT, SECURITY.md.
5. Set up Barber Shop demo with Docker Compose (standard Postgres, not Supabase).

### 11.2 Phase 1 — Core Foundation (Weeks 3–6)

1. Define Drizzle ORM schema in `@slotkit/db` with all core tables, constraints, and `btree_gist` extension.
2. Implement `AuthAdapter` interface with NextAuth.js default implementation.
3. Implement `withAuth()` middleware and `withSerializableRetry()` utility.
4. Implement `@slotkit/core`: slot engine, `useAvailability` hook, timezone utilities, RRULE parser.
5. Implement event types system with booking questions and limits.
6. Build three-step slot pipeline with comprehensive DST edge case test suite (>95% coverage).
7. Implement `anonymize_customer()` GDPR function.
8. Publish alpha to npm.

### 11.3 Phase 2 — Team Scheduling & Routing (Weeks 7–10)

1. Implement round-robin, collective, managed, and fixed assignment strategies.
2. Build `getTeamSlots` and `assignHost` APIs with priority and weight-based distribution.
3. Implement routing forms engine with conditional logic and submission logging.
4. Build out-of-office management with teammate redirect.
5. Implement recurring bookings and seats/group booking support.

### 11.4 Phase 3 — UI Components & DX (Weeks 11–14)

1. Build all 17+ UI components with shadcn/ui conventions and component registry metadata.
2. Build `@slotkit/cli` with init, add, migrate, generate, diff, and update commands.
3. Build the Barber Shop demo application end-to-end (multi-provider version).
4. Populate documentation site: Getting Started, Guides, API Reference, Component Registry, Recipes.

### 11.5 Phase 4 — Payments & Automation (Weeks 15–18)

1. Implement Stripe Connect integration with prepayment, no-show holds, and time-based cancellation fees.
2. Build refund policy engine with configurable time-based rules.
3. Implement workflow engine with trigger-condition-action framework (via Inngest).
4. Build webhook infrastructure with typed events, HMAC + timestamp signing, replay protection, and retry logic.
5. Implement email notification system with bounce handling, opt-out management, and RFC 8058 compliance.

### 11.6 Phase 5 — Integrations & Polish (Weeks 19–22)

1. Google Calendar two-way sync via OAuth (Next.js API route + Inngest cron).
2. Build embed modes: inline, popup, and floating button (`@slotkit/embed`).
3. Build full REST API layer as Next.js API routes.
4. Security review, penetration testing, and authorization audit.
5. Complete documentation: API reference, recipes, migration guides, database provider guides, auth adapter guides.

### 11.7 Phase 6 — Launch & Ecosystem (Weeks 23–26)

1. Community soft launch: publish to npm, open GitHub repo, launch blog post.
2. Submit to Next.js ecosystem directories, Drizzle showcase, and Postgres community resources.
3. Publish additional auth adapters: Supabase Auth, Clerk, Lucia.
4. Gather feedback and iterate on API surface based on early adopter usage.
5. Begin adapter work for Remix, SvelteKit, and additional database providers.
6. Explore plugin system for community-contributed integrations (Twilio SMS, Outlook Calendar, iCal export, Zoom).

---

## 12. Success Metrics

| Metric | Target (6 Months) | Target (12 Months) |
|---|---|---|
| GitHub Stars | 1,000+ | 5,000+ |
| npm Weekly Downloads (`@slotkit/core`) | 500+ | 3,000+ |
| Active GitHub Contributors | 10+ | 30+ |
| Documentation Site Monthly Visitors | 3,000+ | 15,000+ |
| Open Issues Resolved (% within 14 days) | > 70% | > 80% |
| Community Discord Members | 300+ | 1,500+ |
| Production Deployments (self-reported) | 30+ | 300+ |
| CLI Downloads (`npx @slotkit/cli`) | 200+ | 2,000+ |

---

## 13. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep from feature parity ambition | High | Strict phased delivery; each phase ships a usable subset |
| Postgres-only limits adoption | Medium | Postgres is the most popular DB for web apps; document MySQL/SQLite adapters as future |
| Timezone edge cases in production | High | Property-based testing with fast-check; DST transition test matrix |
| Low adoption due to Next.js requirement | Medium | Core logic is framework-agnostic; add Remix/SvelteKit adapters in Phase 6 |
| Stripe API changes or policy shifts | Medium | Abstract behind internal payment interface; pin API versions |
| Maintenance burden as solo/small team | High | Invest in CI/CD, automated testing, and contributor docs early |
| Cal.com releases MIT-licensed primitives | Medium | Differentiate on simplicity, vendor-agnostic design, and composable DX |
| Drizzle ORM breaking changes | Low | Pin major versions; schema DSL is stable since v1.0 |
| Auth adapter complexity across providers | Medium | Keep the AuthAdapter interface minimal (5 methods); test each adapter in CI |
| Inngest vendor dependency for jobs | Low | `JobAdapter` interface allows swap to Trigger.dev, BullMQ, or plain cron |

---

## 14. Feature Parity Checklist vs. Cal.com

| Cal.com Feature | SlotKit Coverage | Phase |
|---|---|---|
| Event Types (personal, team) | Full: `event_types` table + UI components | 1 |
| Multiple Durations per Event | Full: configurable `duration_minutes` per event type | 1 |
| Custom Booking Questions | Full: dynamic fields stored in `booking_questions_responses` | 1 |
| Availability Schedules | Full: RRULE-based `availability_rules` with timezone support | 1 |
| Date Overrides | Full: `availability_overrides` (blocked days + extra hours) | 1 |
| Buffer Time (before/after) | Full: `buffer_before`, `buffer_after` on `event_types` | 1 |
| Booking Limits (frequency, duration, future) | Full: `booking_limits` config per event type | 1 |
| Minimum Notice Period | Full: `min_notice_minutes` on `event_types` | 1 |
| Round-Robin Scheduling | Full: priority + weight-based with fixed hosts | 2 |
| Collective Events | Full: intersection-based availability for all hosts | 2 |
| Managed Event Types | Full: admin templates with lockable fields | 2 |
| Routing Forms | Full: conditional routing with submission logging | 2 |
| Out-of-Office | Full: date range OOO with teammate redirect | 2 |
| Recurring Bookings | Full: frequency + occurrence limits with series management | 2 |
| Seats / Group Bookings | Full: `max_seats` on event types with per-attendee management | 2 |
| Stripe Payments (prepay) | Full: Stripe Connect + payment on booking | 4 |
| No-Show Fees (held payment) | Full: authorize/hold with manual capture on no-show | 4 |
| Time-Based Cancellation Fees | Full: configurable time thresholds and fee percentages | 4 |
| Workflows (email/SMS automation) | Full: trigger-condition-action engine with templates | 4 |
| Webhooks | Full: typed events, HMAC signing, retry logic, delivery logs | 4 |
| Google Calendar Sync | Full: two-way sync via OAuth (Next.js API + Inngest cron) | 5 |
| Embed (Inline/Popup/Float) | Full: `@slotkit/embed` package with three modes | 5 |
| REST API | Full: API routes mirroring all UI capabilities | 5 |
| Requires Confirmation mode | Full: opt-in booking with approve/reject flow | 3 |
| Reschedule Flow | Full: atomic cancel + rebook with notification | 3 |
| Dynamic Group Links | Planned: Phase 6 ecosystem | 6 |
| Cal Video (built-in conferencing) | Out of scope: use Zoom/Meet/Teams integration instead | — |
| Salesforce Routing Integration | Out of scope for v1: extensible via webhook/workflow | — |
| SCIM Provisioning | Out of scope for v1: enterprise feature | — |

---

## 15. Open Questions

1. **Package Naming:** Is `@slotkit` the final namespace, or consider `@shadbook`, `@bookprim`?
2. **Monorepo Structure:** Turborepo with packages for core, db, cli, embed, ui, docs, and demo — confirmed or alternative?
3. **RRULE vs. Hybrid:** Should the visual availability editor abstract RRULE entirely, or expose it for power users?
4. **Auth Adapter Default:** Is NextAuth.js the right default, or should the toolkit ship auth-agnostic with all adapters as optional?
5. **Job Runner Default:** Inngest as the default background job runner, or provide a simpler built-in cron option for smaller deployments?
6. **Email Provider:** Default to Resend (modern, developer-friendly) or SendGrid (more established)?
7. **Multi-Tenancy Depth:** Is `organization_id` on every table sufficient, or do some users need full database-per-tenant isolation?
8. **Commercial Model:** Is there a future paid tier (hosted dashboard, premium templates), or is the project purely community-driven?
9. **Waitlist Feature:** Should v1 support waitlist (notify on cancellation), or defer to v2?
10. **i18n:** Should the UI components ship with built-in locale support, or leave internationalization to the developer?

---

## Appendix A — Technology Reference

| Technology | Version | Role |
|---|---|---|
| Next.js | 14+ (App Router) | Application framework |
| PostgreSQL | 15+ | Primary data store with `btree_gist` extension (any provider) |
| Drizzle ORM | 0.36+ | TypeScript schema DSL, auto-inferred types, migrations |
| Drizzle Kit | 0.28+ | Schema migration tool (push, migrate, generate) |
| NextAuth.js | 5.x (Auth.js) | Default authentication (pluggable via AuthAdapter) |
| Inngest | 3.x | Default background job runner (pluggable via JobAdapter) |
| date-fns | 3.x | Date manipulation and formatting |
| date-fns-tz | 3.x | Timezone conversion (IANA database) |
| rrule | 2.x | iCalendar recurrence rule parsing and expansion |
| shadcn/ui | Latest | UI component foundation (copy-paste convention) |
| react-day-picker | 9.x | Customer-facing calendar date picker |
| react-big-calendar | 1.x | Admin weekly/monthly schedule view |
| react-hook-form | 7.x | Form handling for booking questions and routing forms |
| Stripe SDK | Latest | Payment processing (server + Elements) |
| TypeScript | 5.x | Type safety across all packages |
| Vitest | Latest | Test runner with fast-check for property-based testing |
| Astro Starlight | Latest | Documentation site framework |
| Turborepo | Latest | Monorepo build orchestration |
| Changesets | Latest | Version management and changelog generation |
| Docker | Latest | Local Postgres development environment |

---

## Appendix B — Webhook Event Payload Reference

All webhook payloads follow a consistent envelope structure:

| Field | Type | Description |
|---|---|---|
| `triggerEvent` | string | Event name: `BOOKING_CREATED`, `BOOKING_CANCELLED`, etc. |
| `createdAt` | ISO 8601 string | Timestamp of the event |
| `payload.bookingId` | UUID | Unique booking identifier |
| `payload.eventType` | object | Event type slug, title, duration |
| `payload.startTime` | ISO 8601 string | Booking start time in UTC |
| `payload.endTime` | ISO 8601 string | Booking end time in UTC |
| `payload.organizer` | object | Host: id, name, email, timezone |
| `payload.attendees` | array | Customer(s): name, email, timezone |
| `payload.status` | string | Current booking status |
| `payload.paymentStatus` | string \| null | Payment state if applicable |
| `payload.responses` | object | Custom booking question responses |
| `payload.metadata` | object | Custom metadata from event type |
| `payload.teamId` | UUID \| null | Team ID if team booking |
| `payload.assignmentStrategy` | string \| null | `ROUND_ROBIN`, `COLLECTIVE`, etc. |
