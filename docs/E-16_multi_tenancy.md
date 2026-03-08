# E-16 — Multi-Tenancy & Organizations

> **Priority:** Post-MVP · **Sprints:** 16–18 · **Story Points:** 26 · **Release:** R5

Organization-level scoping for SaaS builders who embed booking into multi-tenant platforms. Adds `organizations` table, tenant-scoped authorization, and org admin management.

---

## User Stories

### 16.1 E16-S01 — Organization Data Isolation `[Must]` · 8 pts

- [x] **Complete**

**As a** SaaS builder, **I want to** create organizations that isolate providers and teams **so that** each of my customers has their own booking namespace with no data leakage.

**Acceptance Criteria:**

- [x] `organizations` table with: `id`, `name`, `slug`, `settings` (JSON), `created_at`.
- [x] All existing tables gain an optional `organization_id` column (nullable for single-tenant deploys).
- [x] Authorization middleware is extended: when `org_id` is present, all queries are scoped to the user's org.
- [x] Organization slug provides a namespace for public booking URLs (e.g., `/org-slug/provider/event-type`).

---

### 16.2 E16-S02 — Organization Member Roles `[Must]` · 5 pts

- [x] **Complete**

**As a** SaaS builder, **I want to** manage organization members with admin and member roles **so that** I can delegate scheduling administration within each tenant.

**Acceptance Criteria:**

- [x] An `org_members` table links users to organizations with role (`owner`, `admin`, `member`).
- [x] Org owners can: manage members, manage teams, view all bookings and analytics.
- [x] Org admins can: manage teams, manage event types, view bookings.
- [x] Org members can: manage their own availability and view their own bookings.
- [x] Role-based access is enforced via middleware authorization.

---

### 16.3 E16-S03 — Cascading Organization Settings `[Should]` · 8 pts

- [x] **Complete**

**As a** SaaS builder, **I want to** configure organization-level settings that cascade to all providers **so that** I can set global defaults for branding, timezone, and booking behavior.

**Acceptance Criteria:**

- [x] Organization settings include: `default_timezone`, `default_currency`, `branding` (`logo_url`, `primary_color`, `accent_color`), `default_buffer_minutes`, `default_booking_limits`.
- [x] Provider settings inherit from organization defaults but can be overridden.
- [x] Event type settings inherit from provider settings (which inherit from org).
- [x] A cascading resolution function resolves effective settings: `event_type > provider > organization > global defaults`.

---

### 16.4 E16-S04 — Organization Provisioning API `[Should]` · 5 pts

- [x] **Complete**

**As a** SaaS builder, **I want to** provision organizations and providers via API **so that** I can automate tenant onboarding from my own application's signup flow.

**Acceptance Criteria:**

- [x] `POST /api/organizations` creates a new org and returns the `org_id`.
- [x] `POST /api/organizations/:id/providers` creates a provider within the org.
- [x] `POST /api/organizations/:id/teams` creates a team within the org.
- [x] API key scoping: org-level API keys can manage all resources within the org.
- [x] A webhook fires on organization creation for external onboarding workflows.
