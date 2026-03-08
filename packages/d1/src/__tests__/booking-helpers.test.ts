import { describe, it, expect } from "vitest";
import {
  d1BookingRowsToInputs,
  d1OverrideRowsToInputs,
  encodeD1Date,
  d1DayBounds,
  d1DayQuery,
} from "../booking-helpers.js";
import type { D1BookingRow, D1AvailabilityOverrideRow } from "../booking-helpers.js";

// ---------------------------------------------------------------------------
// d1BookingRowsToInputs()
// ---------------------------------------------------------------------------

describe("d1BookingRowsToInputs()", () => {
  it("converts canonical UTC-Z rows to BookingInput[]", () => {
    const rows: D1BookingRow[] = [
      {
        startsAt: "2026-03-09T14:00:00.000Z",
        endsAt: "2026-03-09T14:30:00.000Z",
        status: "confirmed",
      },
    ];

    const inputs = d1BookingRowsToInputs(rows);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].startsAt).toBeInstanceOf(Date);
    expect(inputs[0].startsAt.toISOString()).toBe("2026-03-09T14:00:00.000Z");
    expect(inputs[0].endsAt.toISOString()).toBe("2026-03-09T14:30:00.000Z");
    expect(inputs[0].status).toBe("confirmed");
  });

  it("converts legacy local-ISO rows to BookingInput[] (backwards compatibility)", () => {
    const rows: D1BookingRow[] = [
      {
        startsAt: "2026-03-09T14:00:00",
        endsAt: "2026-03-09T14:30:00",
        status: "confirmed",
      },
    ];

    const inputs = d1BookingRowsToInputs(rows);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].startsAt).toBeInstanceOf(Date);
    // Legacy format decoded as UTC
    expect(inputs[0].startsAt.getUTCHours()).toBe(14);
  });

  it("handles mixed canonical and legacy rows in the same batch", () => {
    const rows: D1BookingRow[] = [
      { startsAt: "2026-03-09T09:00:00.000Z", endsAt: "2026-03-09T09:30:00.000Z", status: "confirmed" },
      { startsAt: "2026-03-09T10:00:00", endsAt: "2026-03-09T10:30:00", status: "confirmed" },
    ];

    const inputs = d1BookingRowsToInputs(rows);
    expect(inputs).toHaveLength(2);
    expect(inputs[0].startsAt.toISOString()).toBe("2026-03-09T09:00:00.000Z");
    expect(inputs[1].startsAt.getUTCHours()).toBe(10);
  });

  it("preserves all booking statuses", () => {
    const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"];
    const rows: D1BookingRow[] = statuses.map((status) => ({
      startsAt: "2026-03-09T14:00:00.000Z",
      endsAt: "2026-03-09T14:30:00.000Z",
      status,
    }));

    const inputs = d1BookingRowsToInputs(rows);
    expect(inputs.map((i) => i.status)).toEqual(statuses);
  });

  it("returns empty array for empty input", () => {
    expect(d1BookingRowsToInputs([])).toEqual([]);
  });

  it("correctly feeds into the slot engine for conflict detection", () => {
    // A booking at 14:00–14:30 UTC should block that slot
    const existingRows: D1BookingRow[] = [
      {
        startsAt: "2026-03-09T14:00:00.000Z",
        endsAt: "2026-03-09T14:30:00.000Z",
        status: "confirmed",
      },
    ];

    const inputs = d1BookingRowsToInputs(existingRows);
    const bookingStart = new Date("2026-03-09T14:00:00.000Z");
    const bookingEnd = new Date("2026-03-09T14:30:00.000Z");

    // Manually check: there should be an overlapping booking
    const overlaps = inputs.some(
      (b) =>
        b.status !== "cancelled" &&
        b.startsAt < bookingEnd &&
        b.endsAt > bookingStart,
    );
    expect(overlaps).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// d1OverrideRowsToInputs()
// ---------------------------------------------------------------------------

describe("d1OverrideRowsToInputs()", () => {
  it("converts override rows with boolean isUnavailable", () => {
    const rows: D1AvailabilityOverrideRow[] = [
      {
        date: "2026-03-10T00:00:00.000Z",
        startTime: null,
        endTime: null,
        isUnavailable: true,
      },
    ];

    const inputs = d1OverrideRowsToInputs(rows);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].date).toBeInstanceOf(Date);
    expect(inputs[0].isUnavailable).toBe(true);
    expect(inputs[0].startTime).toBeNull();
    expect(inputs[0].endTime).toBeNull();
  });

  it("converts override rows with integer isUnavailable (SQLite stores booleans as 0/1)", () => {
    const rows: D1AvailabilityOverrideRow[] = [
      {
        date: "2026-03-10T00:00:00.000Z",
        startTime: "10:00",
        endTime: "15:00",
        isUnavailable: 0, // SQLite false
      },
    ];

    const inputs = d1OverrideRowsToInputs(rows);
    expect(inputs[0].isUnavailable).toBe(false);
    expect(inputs[0].startTime).toBe("10:00");
    expect(inputs[0].endTime).toBe("15:00");
  });
});

// ---------------------------------------------------------------------------
// encodeD1Date()
// ---------------------------------------------------------------------------

describe("encodeD1Date()", () => {
  it("encodes a Date object", () => {
    const d = new Date("2026-03-09T14:00:00.000Z");
    expect(encodeD1Date(d)).toBe("2026-03-09T14:00:00.000Z");
  });

  it("encodes a UTC-Z string", () => {
    expect(encodeD1Date("2026-03-09T14:00:00.000Z")).toBe("2026-03-09T14:00:00.000Z");
  });

  it("encodes a local ISO string with a timezone", () => {
    // 09:00 Sydney AEDT (UTC+11) = 22:00 UTC day before
    const result = encodeD1Date("2026-01-09T09:00:00", "Australia/Sydney");
    expect(result).toBe("2026-01-08T22:00:00.000Z");
  });

  it("is suitable for INSERT into D1 startsAt text column", () => {
    // The result must be a string that satisfies string comparison requirements
    const encoded = encodeD1Date(new Date("2026-03-09T14:00:00.000Z"));
    expect(typeof encoded).toBe("string");
    expect(encoded).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

// ---------------------------------------------------------------------------
// d1DayBounds()
// ---------------------------------------------------------------------------

describe("d1DayBounds()", () => {
  it("returns UTC-Z gte/lte for a YYYY-MM-DD string", () => {
    const { gte, lte } = d1DayBounds("2026-03-09");
    expect(gte).toBe("2026-03-09T00:00:00.000Z");
    expect(lte).toBe("2026-03-09T23:59:59.999Z");
  });
});

// ---------------------------------------------------------------------------
// d1DayQuery() — the critical helper that prevents mixed-format bugs
// ---------------------------------------------------------------------------

describe("d1DayQuery()", () => {
  it("returns bounds and dateRange derived from the same source", () => {
    const { bounds, dateRange } = d1DayQuery("2026-03-09");

    expect(bounds.gte).toBe("2026-03-09T00:00:00.000Z");
    expect(bounds.lte).toBe("2026-03-09T23:59:59.999Z");
    expect(dateRange.start.toISOString()).toBe(bounds.gte);
    expect(dateRange.end.toISOString()).toBe(bounds.lte);
  });

  it("produces a dateRange whose start/end are valid UTC Dates", () => {
    const { dateRange } = d1DayQuery("2026-03-09");
    expect(dateRange.start).toBeInstanceOf(Date);
    expect(dateRange.end).toBeInstanceOf(Date);
    expect(isNaN(dateRange.start.getTime())).toBe(false);
    expect(isNaN(dateRange.end.getTime())).toBe(false);
  });

  it("bounds are consistent with encoded booking times for string comparison", () => {
    const { bounds } = d1DayQuery("2026-03-09");
    const bookingAt14h = encodeD1Date(new Date("2026-03-09T14:00:00.000Z"));

    // Simulate the SQLite WHERE startsAt >= gte AND startsAt <= lte
    expect(bookingAt14h >= bounds.gte && bookingAt14h <= bounds.lte).toBe(true);
  });

  it("a booking on the next day is correctly excluded from the bounds", () => {
    const { bounds } = d1DayQuery("2026-03-09");
    const nextDayBooking = encodeD1Date(new Date("2026-03-10T09:00:00.000Z"));

    expect(nextDayBooking >= bounds.gte && nextDayBooking <= bounds.lte).toBe(false);
  });

  it("a booking at midnight UTC (00:00:00.000Z) is included in that day's bounds", () => {
    const { bounds } = d1DayQuery("2026-03-09");
    const midnight = encodeD1Date(new Date("2026-03-09T00:00:00.000Z"));

    expect(midnight >= bounds.gte && midnight <= bounds.lte).toBe(true);
  });

  it("a booking at 23:59:59.999Z is included in that day's bounds", () => {
    const { bounds } = d1DayQuery("2026-03-09");
    const endOfDay = encodeD1Date(new Date("2026-03-09T23:59:59.999Z"));

    expect(endOfDay >= bounds.gte && endOfDay <= bounds.lte).toBe(true);
  });

  it("bounds dateRange start/end have the correct UTC instants", () => {
    const { dateRange } = d1DayQuery("2026-03-09");

    expect(dateRange.start.getUTCFullYear()).toBe(2026);
    expect(dateRange.start.getUTCMonth()).toBe(2); // 0-indexed
    expect(dateRange.start.getUTCDate()).toBe(9);
    expect(dateRange.start.getUTCHours()).toBe(0);
    expect(dateRange.start.getUTCMinutes()).toBe(0);

    expect(dateRange.end.getUTCHours()).toBe(23);
    expect(dateRange.end.getUTCMinutes()).toBe(59);
    expect(dateRange.end.getUTCSeconds()).toBe(59);
  });
});
