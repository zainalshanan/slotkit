/**
 * Seats / Group bookings logic.
 *
 * Manages seat capacity for group events, classes, and workshops.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A seat attendee record */
export interface SeatAttendee {
  id: string;
  bookingId: string;
  attendeeEmail: string;
  attendeeName: string;
  status: "confirmed" | "cancelled";
}

/** Seat availability for a time slot */
export interface SeatAvailability {
  /** Total capacity */
  maxSeats: number;
  /** Number of confirmed seats */
  bookedSeats: number;
  /** Number of available seats */
  availableSeats: number;
  /** Whether the slot is fully booked */
  isFull: boolean;
}

/** Group event summary for admin dashboard */
export interface GroupEventSummary {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  maxSeats: number;
  attendees: SeatAttendee[];
  confirmedCount: number;
  cancelledCount: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Error thrown when seat operations fail */
export class SeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatError";
  }
}

// ---------------------------------------------------------------------------
// Seat Availability
// ---------------------------------------------------------------------------

/**
 * Compute seat availability for a time slot.
 *
 * @param maxSeats - Total seat capacity
 * @param attendees - Current attendees for this slot
 * @returns Seat availability breakdown
 */
export function computeSeatAvailability(
  maxSeats: number,
  attendees: SeatAttendee[],
): SeatAvailability {
  const bookedSeats = attendees.filter(
    (a) => a.status === "confirmed",
  ).length;
  const availableSeats = Math.max(0, maxSeats - bookedSeats);

  return {
    maxSeats,
    bookedSeats,
    availableSeats,
    isFull: availableSeats === 0,
  };
}

/**
 * Check if a seat can be reserved.
 *
 * @param maxSeats - Total seat capacity
 * @param attendees - Current attendees
 * @param requestedSeats - Number of seats to reserve (default: 1)
 * @returns Whether the reservation is possible
 */
export function canReserveSeat(
  maxSeats: number,
  attendees: SeatAttendee[],
  requestedSeats: number = 1,
): boolean {
  if (requestedSeats < 1) return false;
  const { availableSeats } = computeSeatAvailability(maxSeats, attendees);
  return requestedSeats <= availableSeats;
}

/**
 * Check if a slot is a group event (has multiple seats).
 *
 * @param maxSeats - The max_seats value from the event type
 * @returns Whether this is a group event
 */
export function isGroupEvent(maxSeats: number | null | undefined): boolean {
  return typeof maxSeats === "number" && maxSeats > 1;
}

// ---------------------------------------------------------------------------
// Group Event Summary
// ---------------------------------------------------------------------------

/**
 * Compute a group event summary for the admin dashboard.
 *
 * @param bookingId - The booking/slot ID
 * @param startsAt - Start time
 * @param endsAt - End time
 * @param maxSeats - Total capacity
 * @param attendees - Current attendees
 * @returns Group event summary
 */
export function computeGroupEventSummary(
  bookingId: string,
  startsAt: Date,
  endsAt: Date,
  maxSeats: number,
  attendees: SeatAttendee[],
): GroupEventSummary {
  return {
    bookingId,
    startsAt,
    endsAt,
    maxSeats,
    attendees,
    confirmedCount: attendees.filter((a) => a.status === "confirmed").length,
    cancelledCount: attendees.filter((a) => a.status === "cancelled").length,
  };
}

/**
 * Format seat count for display (e.g., "4/10 seats").
 *
 * @param bookedSeats - Number of confirmed seats
 * @param maxSeats - Total capacity
 * @returns Formatted string
 */
export function formatSeatCount(
  bookedSeats: number,
  maxSeats: number,
): string {
  return `${bookedSeats}/${maxSeats} seats`;
}

/**
 * Validate a seat reservation request.
 *
 * @param maxSeats - Total capacity
 * @param attendees - Current attendees
 * @param attendeeEmail - New attendee email
 * @throws {SeatError} If the reservation is invalid
 */
export function validateSeatReservation(
  maxSeats: number,
  attendees: SeatAttendee[],
  attendeeEmail: string,
): void {
  // Check capacity
  if (!canReserveSeat(maxSeats, attendees)) {
    throw new SeatError("No seats available");
  }

  // Check for duplicate
  const alreadyBooked = attendees.some(
    (a) =>
      a.attendeeEmail === attendeeEmail && a.status === "confirmed",
  );
  if (alreadyBooked) {
    throw new SeatError("Attendee already has a confirmed seat");
  }
}
