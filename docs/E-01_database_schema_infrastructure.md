# E-01 — Database Schema & Core Infrastructure

> **Priority:** MVP · **Sprints:** 1 · **Story Points:** 44 · **Release:** R1

Establish the foundational Postgres schema, Drizzle ORM configuration, middleware-based authorization, `btree_gist` extension for double-booking prevention, serialization retry utilities, and GDPR-compliant data anonymization. This epic produces the migration files and core infrastructure that developers integrate into their projects.

---

## User Stories

### 1.1 E01-S01 — Core Schema Migration `[Must]` · 8 pts

- [x] **Complete**

**As a** developer, **I want to** run a single Drizzle Kit migration that creates all core tables **so that** I have a working database schema without designing tables myself.

**Acceptance Criteria:**

- [x] Migration file creates tables: `providers`, `event_types`, `availability_rules`, `availability_overrides`, `bookings`, `booking_events`, and `booking_questions_responses`.
- [x] `btree_gist` extension is enabled in the migration.
- [x] All tables include `id` (UUID, PK), `created_at`, and `updated_at` columns.
- [x] `bookings` table includes an `EXCLUDE USING gist` constraint on `(provider_id, tstzrange(starts_at, ends_at)) WHERE status NOT IN ('cancelled','rejected')`.
- [x] Migration runs cleanly on a fresh Postgres 15+ instance with `drizzle-kit push`.
- [x] Migration is idempotent (running twice does not error).

---

### 1.2 E01-S02 — Middleware-Based Authorization `[Must]` · 5 pts

- [x] **Complete**

**As a** developer, **I want to** have middleware-based authorization on all data access by default **so that** customer and provider data is isolated without me writing auth logic from scratch.

**Acceptance Criteria:**

- [x] `withAuth()` middleware wrapper is implemented and injects the authenticated user into every request.
- [x] Providers can only SELECT, INSERT, UPDATE, DELETE their own rows (matched by authenticated user ID = `user_id`).
- [x] Customers can only SELECT bookings where `customer_email` matches their authenticated email or signed token.
- [x] Unauthenticated requests are rejected with a 401 response.
- [x] Each authorization rule is documented with inline code comments explaining its purpose.
- [x] Optional Postgres RLS policies are provided as a defense-in-depth addendum (not required for default operation).

---

### 1.3 E01-S03 — Bookings Audit Trail `[Must]` · 5 pts

- [x] **Complete**

**As a** developer, **I want to** have a bookings audit trail that logs every state change automatically **so that** I have a complete history of every booking lifecycle event without writing trigger logic.

**Acceptance Criteria:**

- [x] A Postgres trigger fires on INSERT and UPDATE of the `bookings` table.
- [x] The trigger inserts a row into `booking_events` with: `booking_id`, `event_type` (created, confirmed, cancelled, rescheduled, completed, no_show, rejected), `actor` (user ID or 'system'), and `metadata` (JSON of changed fields).
- [x] `booking_events` table is append-only (INSERT only, no UPDATE or DELETE allowed).
- [x] Querying `booking_events` for a `booking_id` returns the full state history in chronological order.

---

### 1.4 E01-S04 — Atomic Booking Creation with Serialization Retry `[Must]` · 13 pts

- [x] **Complete**

**As a** developer, **I want to** have database functions for atomic slot-locking and booking creation with automatic retry on serialization failure **so that** double-bookings are impossible even under concurrent requests, and transient contention is handled gracefully.

**Acceptance Criteria:**

- [x] A `create_booking()` Postgres function accepts `provider_id`, `event_type_id`, `starts_at`, `ends_at`, `customer_email`, `customer_name` and returns the new booking row.
- [x] The function runs inside a `SERIALIZABLE` transaction.
- [x] If the EXCLUDE constraint is violated (overlapping booking), the function raises a descriptive error with `SQLSTATE 23P01`.
- [x] A server-side wrapper (Next.js API route) catches `SQLSTATE 40001` (serialization_failure) and automatically retries the transaction up to 3 times with jittered exponential backoff (base 50ms).
- [x] The retry wrapper is provided as a reusable utility: `withSerializableRetry(fn, { maxRetries: 3 })` exported from `@slotkit/core`.
- [x] If all retries are exhausted, a typed `BookingConflictError` is thrown with a user-friendly message (not a raw Postgres error).
- [x] Two simultaneous calls for the same slot result in exactly one success; the other receives either a constraint violation (slot taken) or succeeds after retry (different slot).
- [x] Load test: 50 concurrent booking attempts for the same slot yields exactly 1 confirmed booking, 0 unhandled serialization errors, and all other callers receive a clear conflict response within 2 seconds.

---

### 1.5 E01-S05 — Seed Data `[Should]` · 3 pts

- [x] **Complete**

**As a** developer, **I want to** have seed data for local development and testing **so that** I can immediately see the schema in action with realistic sample data.

**Acceptance Criteria:**

- [x] Seed script creates 2 sample providers with different timezones.
- [x] Each provider has `availability_rules` for a standard work week (Mon–Fri, 9–5).
- [x] One provider has 2 `availability_overrides` (one blocked day, one extra-hours day).
- [x] 5 sample bookings exist across both providers in various statuses (confirmed, pending, cancelled).
- [x] Seed script is idempotent and safe to run multiple times.

---

### 1.6 E01-S06 — Generated TypeScript Types `[Must]` · 5 pts

- [x] **Complete**

**As a** developer, **I want to** have generated TypeScript types from the Drizzle ORM schema **so that** I get full type safety when querying tables from my Next.js app.

**Acceptance Criteria:**

- [x] Drizzle ORM schema produces auto-inferred types covering all tables.
- [x] Types are exported and usable in the `@slotkit/core` package.
- [x] Types include table row types, insert types, and update types for each table.
- [x] A documented script or npm command generates fresh types after schema changes.

---

### 1.7 E01-S07 — GDPR Data Anonymization `[Must]` · 5 pts

- [x] **Complete**

**As a** developer, **I want to** have a GDPR-compliant data anonymization function for customer PII **so that** I can fulfill Right to be Forgotten requests without breaking referential integrity or audit trails.

**Acceptance Criteria:**

- [x] An `anonymize_customer(customer_email)` Postgres function replaces PII across all tables where the email appears.
- [x] Anonymization replaces `customer_email` with a hashed placeholder (e.g., `'redacted-<sha256_prefix>@anonymized.local'`), `customer_name` with `'Anonymized Customer'`, and `customer_phone` with `null`.
- [x] The function updates `bookings`, `booking_seats`, `booking_questions_responses`, and `routing_submissions` tables in a single transaction.
- [x] `booking_events` audit records are preserved but the metadata field has PII values replaced with `'[REDACTED]'` — the `event_type` and timestamps remain intact for audit integrity.
- [x] `payments` table records are preserved (required for financial compliance) but customer-identifying metadata is redacted.
- [x] The function returns a summary: `{ tables_affected: number, rows_updated: number }`.
- [x] A corresponding API endpoint (`DELETE /api/customers/:email/pii`) calls the function and returns a confirmation.
- [x] Documentation includes a GDPR compliance guide explaining the anonymization strategy, retention policies, and the developer's responsibilities as data controller.
