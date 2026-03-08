import { describe, it, expect } from "vitest";
import {
  computeSeatAvailability,
  canReserveSeat,
  isGroupEvent,
  computeGroupEventSummary,
  formatSeatCount,
  validateSeatReservation,
  SeatError,
  type SeatAttendee,
} from "../seats.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAttendee(
  overrides?: Partial<SeatAttendee>,
): SeatAttendee {
  return {
    id: "seat-1",
    bookingId: "bk-1",
    attendeeEmail: "test@example.com",
    attendeeName: "Test User",
    status: "confirmed",
    ...overrides,
  };
}

const twoConfirmed: SeatAttendee[] = [
  makeAttendee({ id: "s1", attendeeEmail: "a@test.com" }),
  makeAttendee({ id: "s2", attendeeEmail: "b@test.com" }),
];

// ---------------------------------------------------------------------------
// computeSeatAvailability
// ---------------------------------------------------------------------------

describe("computeSeatAvailability", () => {
  it("computes available seats correctly", () => {
    const result = computeSeatAvailability(10, twoConfirmed);
    expect(result.maxSeats).toBe(10);
    expect(result.bookedSeats).toBe(2);
    expect(result.availableSeats).toBe(8);
    expect(result.isFull).toBe(false);
  });

  it("returns full when all seats taken", () => {
    const fullAttendees = Array.from({ length: 5 }, (_, i) =>
      makeAttendee({ id: `s${i}`, attendeeEmail: `user${i}@test.com` }),
    );
    const result = computeSeatAvailability(5, fullAttendees);
    expect(result.isFull).toBe(true);
    expect(result.availableSeats).toBe(0);
  });

  it("ignores cancelled attendees", () => {
    const attendees = [
      makeAttendee({ id: "s1", attendeeEmail: "a@test.com" }),
      makeAttendee({
        id: "s2",
        attendeeEmail: "b@test.com",
        status: "cancelled",
      }),
    ];
    const result = computeSeatAvailability(5, attendees);
    expect(result.bookedSeats).toBe(1);
    expect(result.availableSeats).toBe(4);
  });

  it("handles no attendees", () => {
    const result = computeSeatAvailability(10, []);
    expect(result.bookedSeats).toBe(0);
    expect(result.availableSeats).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// canReserveSeat
// ---------------------------------------------------------------------------

describe("canReserveSeat", () => {
  it("returns true when seats available", () => {
    expect(canReserveSeat(10, twoConfirmed)).toBe(true);
  });

  it("returns false when full", () => {
    expect(canReserveSeat(2, twoConfirmed)).toBe(false);
  });

  it("returns true for requesting multiple seats within capacity", () => {
    expect(canReserveSeat(10, twoConfirmed, 3)).toBe(true);
  });

  it("returns false for requesting more seats than available", () => {
    expect(canReserveSeat(10, twoConfirmed, 9)).toBe(false);
  });

  it("returns false for zero requested seats", () => {
    expect(canReserveSeat(10, [], 0)).toBe(false);
  });

  it("returns false for negative requested seats", () => {
    expect(canReserveSeat(10, [], -1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGroupEvent
// ---------------------------------------------------------------------------

describe("isGroupEvent", () => {
  it("returns true for maxSeats > 1", () => {
    expect(isGroupEvent(5)).toBe(true);
  });

  it("returns false for maxSeats = 1", () => {
    expect(isGroupEvent(1)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isGroupEvent(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isGroupEvent(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeGroupEventSummary
// ---------------------------------------------------------------------------

describe("computeGroupEventSummary", () => {
  it("computes summary correctly", () => {
    const attendees = [
      makeAttendee({ id: "s1", status: "confirmed" }),
      makeAttendee({ id: "s2", status: "confirmed" }),
      makeAttendee({ id: "s3", status: "cancelled" }),
    ];

    const summary = computeGroupEventSummary(
      "bk-1",
      new Date("2026-03-15T14:00:00Z"),
      new Date("2026-03-15T15:00:00Z"),
      10,
      attendees,
    );

    expect(summary.confirmedCount).toBe(2);
    expect(summary.cancelledCount).toBe(1);
    expect(summary.maxSeats).toBe(10);
    expect(summary.attendees).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// formatSeatCount
// ---------------------------------------------------------------------------

describe("formatSeatCount", () => {
  it("formats correctly", () => {
    expect(formatSeatCount(4, 10)).toBe("4/10 seats");
  });

  it("formats zero bookings", () => {
    expect(formatSeatCount(0, 5)).toBe("0/5 seats");
  });

  it("formats full capacity", () => {
    expect(formatSeatCount(8, 8)).toBe("8/8 seats");
  });
});

// ---------------------------------------------------------------------------
// validateSeatReservation
// ---------------------------------------------------------------------------

describe("validateSeatReservation", () => {
  it("accepts valid reservation", () => {
    expect(() =>
      validateSeatReservation(10, twoConfirmed, "new@test.com"),
    ).not.toThrow();
  });

  it("throws when no seats available", () => {
    expect(() =>
      validateSeatReservation(2, twoConfirmed, "new@test.com"),
    ).toThrow(SeatError);
    expect(() =>
      validateSeatReservation(2, twoConfirmed, "new@test.com"),
    ).toThrow("No seats available");
  });

  it("throws for duplicate attendee", () => {
    expect(() =>
      validateSeatReservation(10, twoConfirmed, "a@test.com"),
    ).toThrow("already has a confirmed seat");
  });

  it("allows re-booking after cancellation", () => {
    const attendees = [
      makeAttendee({
        id: "s1",
        attendeeEmail: "a@test.com",
        status: "cancelled",
      }),
    ];
    expect(() =>
      validateSeatReservation(10, attendees, "a@test.com"),
    ).not.toThrow();
  });
});
