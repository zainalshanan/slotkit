# E-03 — Event Types & Booking Configuration

> **Priority:** MVP · **Sprints:** 2–3 · **Story Points:** 26 · **Release:** R1

Implement the `event_types` system: named bookable services with configurable duration, buffer time, booking limits, custom booking questions, and confirmation mode. This is the configuration layer providers use to define what can be booked.

---

## User Stories

### 3.1 E03-S01 — Event Type CRUD `[Must]` · 5 pts

- [x] **Complete**

**As a** provider, **I want to** create an event type with a name, duration, and description **so that** my customers can book a specific service rather than a generic time slot.

**Acceptance Criteria:**

- [x] Provider can create an `event_type` with: `title`, `slug` (auto-generated from title, editable), `description`, `duration_minutes` (15/30/45/60/90/120), and `location_type` (in_person, phone, video).
- [x] Slug must be unique per provider.
- [x] Duration is validated (minimum 5 minutes, maximum 480 minutes).
- [x] Event type is linked to the provider via `provider_id`.
- [x] Created event type is returned with all fields and a generated UUID.

---

### 3.2 E03-S02 — Buffer Time Configuration `[Must]` · 3 pts

- [x] **Complete**

**As a** provider, **I want to** configure buffer time before and after each appointment **so that** I have cleanup/prep time between bookings automatically built in.

**Acceptance Criteria:**

- [x] Event types support `buffer_before` (minutes) and `buffer_after` (minutes) fields.
- [x] Default values are 0 for both.
- [x] When `getAvailableSlots` runs for this event type, buffer time is subtracted from available windows around existing bookings.
- [x] A 30-minute event with 5-minute `buffer_after` at 10:00 blocks slots until 10:35.
- [x] Buffer is applied per-event-type, not globally.

---

### 3.3 E03-S03 — Booking Limits `[Must]` · 5 pts

- [x] **Complete**

**As a** provider, **I want to** set booking limits on my event types **so that** I don't get overbooked and can control my schedule boundaries.

**Acceptance Criteria:**

- [x] Event type supports: `max_bookings_per_day`, `max_bookings_per_week`, `min_notice_minutes` (minimum lead time), `max_future_days` (how far ahead bookings are allowed).
- [x] `getAvailableSlots` respects all limits: slots beyond `max_future_days` are excluded, slots within `min_notice_minutes` of now are excluded.
- [x] When `max_bookings_per_day` is reached for a given day, that day shows as fully booked.
- [x] All limits default to `null` (unlimited) when not configured.
- [x] `computeBookingLimits(providerId, eventTypeId, date)` returns current counts and remaining capacity.

---

### 3.4 E03-S04 — Custom Booking Questions `[Must]` · 5 pts

- [x] **Complete**

**As a** provider, **I want to** add custom booking questions to an event type **so that** I collect the information I need from customers at booking time.

**Acceptance Criteria:**

- [x] Event type supports a `custom_questions` JSON field containing an array of question definitions.
- [x] Each question has: `key` (unique), `label`, `type` (text, textarea, select, checkbox, email, phone, number), `options` (for select), and `is_required` (boolean).
- [x] Questions are stored on the `event_type`, not globally.
- [x] Responses are stored in `booking_questions_responses` with `booking_id` and `question_key`.
- [x] Maximum 10 custom questions per event type.

---

### 3.5 E03-S05 — Confirmation Mode `[Should]` · 5 pts

- [x] **Complete**

**As a** provider, **I want to** require manual confirmation for certain event types **so that** I can review booking requests before they're confirmed for high-value appointments.

**Acceptance Criteria:**

- [x] Event type supports a `requires_confirmation` boolean field (default: `false`).
- [x] When `true`, new bookings are created with status `'pending'` instead of `'confirmed'`.
- [x] Pending bookings still block the time slot (preventing double-booking).
- [x] Provider can confirm (status → `confirmed`) or reject (status → `rejected`, slot freed).
- [x] If not acted upon within a configurable timeout (default 24h), the booking is auto-rejected and the slot is freed.
- [x] A `booking_event` is logged for each transition.

---

### 3.6 E03-S06 — Per-Event-Type Availability `[Should]` · 3 pts

- [x] **Complete**

**As a** provider, **I want to** assign a specific availability schedule to an event type **so that** different services can have different available hours.

**Acceptance Criteria:**

- [x] Event types can optionally reference a specific `availability_rule` set via `event_type_id` on `availability_rules`.
- [x] If an event type has specific rules, those are used instead of the provider's default availability.
- [x] If no event-type-specific rules exist, the provider's default rules are used as fallback.
- [x] The slot engine checks for event-type-specific availability first, then falls back to provider default.
