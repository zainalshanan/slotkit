# E-04 — Customer Booking Flow (UI Components)

> **Priority:** MVP · **Sprints:** 3–4 · **Story Points:** 34 · **Release:** R1

Build the customer-facing booking experience: date selection calendar, time slot picker, booking questions form, and confirmation view. All components follow shadcn/ui conventions and are fully customizable.

---

## User Stories

### 4.1 E04-S01 — Booking Calendar `[Must]` · 8 pts

- [x] **Complete**

**As a** customer, **I want to** see a calendar showing only available dates for the selected event type **so that** I don't waste time clicking on dates that have no open slots.

**Acceptance Criteria:**

- [x] `<BookingCalendar />` component renders a month-view calendar using `react-day-picker`.
- [x] Dates with zero available slots are visually disabled (greyed out, not clickable).
- [x] Past dates are disabled.
- [x] Dates beyond the event type's `max_future_days` are disabled.
- [x] The current month is shown by default; user can navigate to next/previous months.
- [x] The component accepts `className` and `style` props for full CSS customization.
- [x] The customer's timezone is auto-detected and displayed with a manual override option.

---

### 4.2 E04-S02 — Time Slot Picker `[Must]` · 5 pts

- [x] **Complete**

**As a** customer, **I want to** see available time slots when I select a date **so that** I can quickly pick a convenient time.

**Acceptance Criteria:**

- [x] `<TimeSlotPicker />` component receives the selected date and renders available slots.
- [x] Slots are fetched using the `useAvailability` hook.
- [x] Slots are displayed as buttons, optionally grouped by period (Morning, Afternoon, Evening).
- [x] Each slot shows the time in the customer's local timezone in their preferred format (12h or 24h).
- [x] A loading skeleton is shown while slots are being computed.
- [x] If no slots are available, a friendly "No times available" message is displayed.
- [x] Selecting a slot highlights it and triggers an `onSelect` callback.

---

### 4.3 E04-S03 — Booking Questions Form `[Must]` · 5 pts

- [x] **Complete**

**As a** customer, **I want to** fill out booking questions and my contact details before confirming **so that** the provider has the information they need for my appointment.

**Acceptance Criteria:**

- [x] `<BookingQuestions />` component dynamically renders the event type's `custom_questions`.
- [x] Standard fields are always present: name (required), email (required).
- [x] Custom questions render the correct input type (text, textarea, select, checkbox, email, phone, number).
- [x] Required fields show validation errors on submit attempt.
- [x] Form uses `react-hook-form` for validation and state management.
- [x] Phone fields use basic format validation; email fields validate format.
- [x] The component exposes an `onSubmit` callback with the collected data.

---

### 4.4 E04-S04 — Booking Confirmation View `[Must]` · 5 pts

- [x] **Complete**

**As a** customer, **I want to** see a confirmation summary before finalizing my booking **so that** I can verify all details are correct and avoid mistakes.

**Acceptance Criteria:**

- [x] `<BookingConfirmation />` component displays: event type name, date, time (in customer timezone), duration, provider name, and location.
- [x] Customer's responses to booking questions are shown in a review section.
- [x] A "Confirm Booking" button triggers the `create_booking` database function.
- [x] On success: a confirmation screen shows the booking ID and details.
- [x] On conflict (slot taken): a clear error message is shown with an option to select a different time.
- [x] On network error: a retry option is displayed.

---

### 4.5 E04-S05 — Booking Management Link `[Must]` · 8 pts

- [x] **Complete**

**As a** customer, **I want to** view, reschedule, or cancel my booking via a unique link **so that** I can manage my appointment without creating an account.

**Acceptance Criteria:**

- [x] Each confirmed booking generates a unique, signed management URL.
- [x] The management page shows: booking details, status, and action buttons.
- [x] Cancel button prompts for confirmation, then sets status to `'cancelled'` and logs a `booking_event`.
- [x] Reschedule button opens a new date/time selection flow for the same event type.
- [x] Rescheduling atomically cancels the old booking and creates a new one.
- [x] The management link expires after the booking end time + 24 hours.
- [x] Cancelled bookings show a "Booking Cancelled" status and no action buttons.

---

### 4.6 E04-S06 — Timezone Auto-Detection & Selector `[Should]` · 3 pts

- [x] **Complete**

**As a** customer, **I want to** have my timezone auto-detected with the option to change it **so that** all times I see are accurate for my location.

**Acceptance Criteria:**

- [x] Timezone is auto-detected using `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- [x] A timezone selector dropdown is shown below the calendar.
- [x] Changing the timezone re-renders all slot times in the new timezone.
- [x] The selected timezone is persisted in the booking record.
- [x] The timezone selector searches by city name and UTC offset.
