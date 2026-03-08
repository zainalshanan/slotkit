import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getInitialBookingStatus,
  getAutoRejectDeadline,
  isPendingBookingOverdue,
  CONFIRMATION_TIMEOUT_HOURS,
} from "../confirmation-mode.js";

describe("getInitialBookingStatus", () => {
  it("returns confirmed when requiresConfirmation is false", () => {
    expect(getInitialBookingStatus(false)).toBe("confirmed");
  });

  it("returns pending when requiresConfirmation is true", () => {
    expect(getInitialBookingStatus(true)).toBe("pending");
  });
});

describe("CONFIRMATION_TIMEOUT_HOURS", () => {
  it("defaults to 24 hours", () => {
    expect(CONFIRMATION_TIMEOUT_HOURS).toBe(24);
  });
});

describe("getAutoRejectDeadline", () => {
  it("calculates deadline 24 hours after creation by default", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const deadline = getAutoRejectDeadline(createdAt);
    expect(deadline.toISOString()).toBe("2026-03-09T10:00:00.000Z");
  });

  it("respects custom timeout hours", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const deadline = getAutoRejectDeadline(createdAt, 48);
    expect(deadline.toISOString()).toBe("2026-03-10T10:00:00.000Z");
  });

  it("calculates deadline for 2-hour timeout", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const deadline = getAutoRejectDeadline(createdAt, 2);
    expect(deadline.toISOString()).toBe("2026-03-08T12:00:00.000Z");
  });
});

describe("isPendingBookingOverdue", () => {
  it("returns false when booking is within the timeout window", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const now = new Date("2026-03-08T20:00:00Z"); // 10 hours later
    expect(isPendingBookingOverdue(createdAt, now)).toBe(false);
  });

  it("returns true when booking has exceeded the timeout", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const now = new Date("2026-03-09T11:00:00Z"); // 25 hours later
    expect(isPendingBookingOverdue(createdAt, now)).toBe(true);
  });

  it("returns true at exactly the deadline", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const now = new Date("2026-03-09T10:00:00Z"); // exactly 24 hours
    expect(isPendingBookingOverdue(createdAt, now)).toBe(true);
  });

  it("respects custom timeout hours", () => {
    const createdAt = new Date("2026-03-08T10:00:00Z");
    const now = new Date("2026-03-08T13:00:00Z"); // 3 hours later
    expect(isPendingBookingOverdue(createdAt, now, 2)).toBe(true);
    expect(isPendingBookingOverdue(createdAt, now, 4)).toBe(false);
  });

  it("uses current time by default", () => {
    const ancient = new Date("2020-01-01T00:00:00Z");
    // A booking from 2020 is definitely overdue
    expect(isPendingBookingOverdue(ancient)).toBe(true);
  });

  it("pending booking created just now is not overdue", () => {
    const justNow = new Date();
    const slightlyAfter = new Date(justNow.getTime() + 1000); // 1 second later
    expect(isPendingBookingOverdue(justNow, slightlyAfter)).toBe(false);
  });
});
