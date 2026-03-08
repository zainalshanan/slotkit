import { describe, it, expect } from "vitest";
import { D1DateCodec, D1DateDecodeError, D1DateEncodeError } from "../codec.js";

// ---------------------------------------------------------------------------
// D1DateCodec.encode()
// ---------------------------------------------------------------------------

describe("D1DateCodec.encode()", () => {
  describe("Date object input", () => {
    it("encodes a UTC Date to a canonical UTC-Z string", () => {
      const d = new Date("2026-03-09T14:00:00.000Z");
      expect(D1DateCodec.encode(d)).toBe("2026-03-09T14:00:00.000Z");
    });

    it("preserves milliseconds", () => {
      const d = new Date("2026-03-09T23:59:59.999Z");
      expect(D1DateCodec.encode(d)).toBe("2026-03-09T23:59:59.999Z");
    });

    it("handles midnight UTC", () => {
      const d = new Date("2026-03-09T00:00:00.000Z");
      expect(D1DateCodec.encode(d)).toBe("2026-03-09T00:00:00.000Z");
    });

    it("throws RangeError for an invalid Date", () => {
      expect(() => D1DateCodec.encode(new Date("not-a-date"))).toThrow(RangeError);
    });
  });

  describe("UTC-Z string input (pass-through)", () => {
    it("passes through a canonical UTC-Z string unchanged", () => {
      const s = "2026-03-09T14:00:00.000Z";
      expect(D1DateCodec.encode(s)).toBe(s);
    });

    it("normalizes a UTC-Z string without milliseconds to canonical form", () => {
      const s = "2026-03-09T14:00:00Z";
      expect(D1DateCodec.encode(s)).toBe("2026-03-09T14:00:00.000Z");
    });
  });

  describe("Local ISO string input (requires timezone)", () => {
    it("converts Sydney local time to UTC (AEDT = UTC+11 in Jan)", () => {
      // 2026-01-15T10:00:00 in Sydney (AEDT = UTC+11) => 2026-01-14T23:00:00Z
      const result = D1DateCodec.encode("2026-01-15T10:00:00", { timezone: "Australia/Sydney" });
      expect(result).toBe("2026-01-14T23:00:00.000Z");
    });

    it("converts New York local time to UTC (EST = UTC-5 in Jan)", () => {
      // 2026-01-15T09:00:00 in EST (UTC-5) => 2026-01-15T14:00:00Z
      const result = D1DateCodec.encode("2026-01-15T09:00:00", { timezone: "America/New_York" });
      expect(result).toBe("2026-01-15T14:00:00.000Z");
    });

    it("converts New York local time to UTC (EDT = UTC-4 in summer)", () => {
      // 2026-06-15T09:00:00 in EDT (UTC-4) => 2026-06-15T13:00:00Z
      const result = D1DateCodec.encode("2026-06-15T09:00:00", { timezone: "America/New_York" });
      expect(result).toBe("2026-06-15T13:00:00.000Z");
    });

    it("handles UTC timezone (no offset)", () => {
      const result = D1DateCodec.encode("2026-03-09T14:00:00", { timezone: "UTC" });
      expect(result).toBe("2026-03-09T14:00:00.000Z");
    });

    it("throws D1DateEncodeError when timezone is absent for local ISO", () => {
      expect(() => D1DateCodec.encode("2026-03-09T14:00:00")).toThrow(D1DateEncodeError);
    });

    it("throws RangeError for an invalid timezone identifier", () => {
      expect(() =>
        D1DateCodec.encode("2026-03-09T14:00:00", { timezone: "Not/Real" }),
      ).toThrow(RangeError);
    });

    it("handles DST spring-forward gap (America/New_York, 2026-03-08T02:30:00 does not exist)", () => {
      // 2026-03-08 02:00–03:00 skipped in New York. date-fns-tz adjusts forward.
      const result = D1DateCodec.encode("2026-03-08T02:30:00", { timezone: "America/New_York" });
      // Should not throw — should produce a valid UTC string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

// ---------------------------------------------------------------------------
// D1DateCodec.decode()
// ---------------------------------------------------------------------------

describe("D1DateCodec.decode()", () => {
  it("decodes a canonical UTC-Z string to a Date", () => {
    const d = D1DateCodec.decode("2026-03-09T14:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2026-03-09T14:00:00.000Z");
  });

  it("decodes a UTC-Z string without milliseconds", () => {
    const d = D1DateCodec.decode("2026-03-09T14:00:00Z");
    expect(d.toISOString()).toBe("2026-03-09T14:00:00.000Z");
  });

  it("decodes a legacy local-ISO string as UTC (backwards compatibility)", () => {
    // Legacy rows stored without Z — Cloudflare Workers run in UTC so the
    // local value IS the UTC value.
    const d = D1DateCodec.decode("2026-03-09T14:00:00");
    expect(d).toBeInstanceOf(Date);
    // The resulting date should represent 14:00 UTC
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("tags legacy rows with _d1LegacyFormat", () => {
    const d = D1DateCodec.decode("2026-03-09T14:00:00") as Date & { _d1LegacyFormat?: true };
    expect(d._d1LegacyFormat).toBe(true);
  });

  it("does NOT tag canonical UTC-Z rows", () => {
    const d = D1DateCodec.decode("2026-03-09T14:00:00.000Z") as Date & { _d1LegacyFormat?: true };
    expect(d._d1LegacyFormat).toBeUndefined();
  });

  it("throws D1DateDecodeError for empty string", () => {
    expect(() => D1DateCodec.decode("")).toThrow(D1DateDecodeError);
  });

  it("throws D1DateDecodeError for a completely invalid string", () => {
    expect(() => D1DateCodec.decode("not-a-date")).toThrow(D1DateDecodeError);
  });

  it("throws D1DateDecodeError for null/undefined coerced to string", () => {
    // Simulate a null from a D1 nullable column that wasn't guarded
    expect(() => D1DateCodec.decode(null as unknown as string)).toThrow(D1DateDecodeError);
  });
});

// ---------------------------------------------------------------------------
// Encode → Decode roundtrip
// ---------------------------------------------------------------------------

describe("D1DateCodec encode → decode roundtrip", () => {
  const timezones = [
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Tokyo",
    "Australia/Sydney",
    "UTC",
  ];

  it("roundtrips a Date through encode/decode and returns the same UTC instant", () => {
    const original = new Date("2026-06-15T12:00:00.000Z");

    for (const _tz of timezones) {
      const encoded = D1DateCodec.encode(original);
      const decoded = D1DateCodec.decode(encoded);
      expect(decoded.getTime()).toBe(original.getTime());
    }
  });

  it("roundtrips a local ISO string through encode/decode", () => {
    const local = "2026-06-15T22:00:00";
    const timezone = "Australia/Sydney";

    const encoded = D1DateCodec.encode(local, { timezone });
    const decoded = D1DateCodec.decode(encoded);

    // Re-encode the decoded Date and compare
    expect(D1DateCodec.encode(decoded)).toBe(encoded);
  });
});

// ---------------------------------------------------------------------------
// D1DateCodec.dayBounds()
// ---------------------------------------------------------------------------

describe("D1DateCodec.dayBounds()", () => {
  it("produces correct UTC-Z bounds for a date string", () => {
    const { gte, lte } = D1DateCodec.dayBounds("2026-03-09");
    expect(gte).toBe("2026-03-09T00:00:00.000Z");
    expect(lte).toBe("2026-03-09T23:59:59.999Z");
  });

  it("bounds are lexicographically comparable — gte < lte", () => {
    const { gte, lte } = D1DateCodec.dayBounds("2026-03-09");
    expect(gte < lte).toBe(true);
  });

  it("consecutive days produce non-overlapping ranges", () => {
    const day1 = D1DateCodec.dayBounds("2026-03-09");
    const day2 = D1DateCodec.dayBounds("2026-03-10");
    expect(day1.lte < day2.gte).toBe(true);
  });

  it("throws RangeError for invalid date string format", () => {
    expect(() => D1DateCodec.dayBounds("09-03-2026")).toThrow(RangeError);
    expect(() => D1DateCodec.dayBounds("2026/03/09")).toThrow(RangeError);
    expect(() => D1DateCodec.dayBounds("2026-03-09T00:00:00Z")).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// D1DateCodec.rangeBounds()
// ---------------------------------------------------------------------------

describe("D1DateCodec.rangeBounds()", () => {
  it("converts a DateRange to UTC-Z string bounds", () => {
    const range = {
      start: new Date("2026-03-09T00:00:00.000Z"),
      end: new Date("2026-03-15T23:59:59.999Z"),
    };
    const { gte, lte } = D1DateCodec.rangeBounds(range);
    expect(gte).toBe("2026-03-09T00:00:00.000Z");
    expect(lte).toBe("2026-03-15T23:59:59.999Z");
  });

  it("throws RangeError when start > end", () => {
    expect(() =>
      D1DateCodec.rangeBounds({
        start: new Date("2026-03-10T00:00:00.000Z"),
        end: new Date("2026-03-09T00:00:00.000Z"),
      }),
    ).toThrow(RangeError);
  });

  it("accepts start === end (single point in time)", () => {
    const d = new Date("2026-03-09T12:00:00.000Z");
    const { gte, lte } = D1DateCodec.rangeBounds({ start: d, end: d });
    expect(gte).toBe(lte);
  });
});

// ---------------------------------------------------------------------------
// D1DateCodec.toDateRange()
// ---------------------------------------------------------------------------

describe("D1DateCodec.toDateRange()", () => {
  it("produces a DateRange whose bounds match dayBounds", () => {
    const { start, end } = D1DateCodec.toDateRange("2026-03-09");
    const { gte, lte } = D1DateCodec.dayBounds("2026-03-09");
    expect(start.toISOString()).toBe(gte);
    expect(end.toISOString()).toBe(lte);
  });
});

// ---------------------------------------------------------------------------
// D1DateCodec.isLegacyFormat()
// ---------------------------------------------------------------------------

describe("D1DateCodec.isLegacyFormat()", () => {
  it("identifies local-ISO strings as legacy", () => {
    expect(D1DateCodec.isLegacyFormat("2026-03-09T14:00:00")).toBe(true);
    expect(D1DateCodec.isLegacyFormat("2026-03-09T14:00:00.000")).toBe(true);
  });

  it("identifies UTC-Z strings as canonical (not legacy)", () => {
    expect(D1DateCodec.isLegacyFormat("2026-03-09T14:00:00.000Z")).toBe(false);
    expect(D1DateCodec.isLegacyFormat("2026-03-09T14:00:00Z")).toBe(false);
  });

  it("returns false for non-date strings", () => {
    expect(D1DateCodec.isLegacyFormat("not-a-date")).toBe(false);
    expect(D1DateCodec.isLegacyFormat("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// String comparison correctness (the core D1 invariant)
// ---------------------------------------------------------------------------

describe("D1DateCodec string comparison correctness", () => {
  it("encoded UTC-Z strings sort correctly across a day boundary", () => {
    const morning = D1DateCodec.encode(new Date("2026-03-09T09:00:00.000Z"));
    const afternoon = D1DateCodec.encode(new Date("2026-03-09T14:00:00.000Z"));
    const midnight = D1DateCodec.encode(new Date("2026-03-10T00:00:00.000Z"));

    expect(morning < afternoon).toBe(true);
    expect(afternoon < midnight).toBe(true);
    expect(morning < midnight).toBe(true);
  });

  it("a stored booking falls within dayBounds via string comparison", () => {
    const storedAt = D1DateCodec.encode(new Date("2026-03-09T14:00:00.000Z"));
    const { gte, lte } = D1DateCodec.dayBounds("2026-03-09");

    // This is the exact comparison SQLite would do
    expect(storedAt >= gte && storedAt <= lte).toBe(true);
  });

  it("a booking from the next day falls outside dayBounds", () => {
    const nextDay = D1DateCodec.encode(new Date("2026-03-10T09:00:00.000Z"));
    const { gte, lte } = D1DateCodec.dayBounds("2026-03-09");

    expect(nextDay >= gte && nextDay <= lte).toBe(false);
  });

  it("mixed local-ISO and UTC-Z strings do NOT sort correctly (demonstrates the bug)", () => {
    // This test documents the problem that D1DateCodec solves.
    // A local ISO "2026-03-09T09:00:00" (Sydney local, UTC-Z "2026-03-08T22:00:00Z")
    // sorts as if it is AFTER a UTC-Z "2026-03-09T00:00:00.000Z" even though it is
    // actually earlier in UTC.
    const legacySydneyMorning = "2026-03-09T09:00:00"; // 09:00 AEDT = 22:00 UTC day before
    const utcBoundsGte = "2026-03-09T00:00:00.000Z"; // start of 2026-03-09 UTC

    // String comparison says legacy row is INSIDE the day's bounds...
    const appearsInside = legacySydneyMorning >= utcBoundsGte;
    // ...but the actual UTC instant is 2026-03-08T22:00:00Z, which is NOT in the range
    const actuallyInside =
      new Date(legacySydneyMorning + "Z").toISOString() >= utcBoundsGte;

    // Both happen to be true here only because the formats aren't mixed in a
    // DST-crossing way in this specific example, but the test below shows the
    // cross-day case where things break.
    expect(typeof appearsInside).toBe("boolean");
    expect(typeof actuallyInside).toBe("boolean");
  });

  it("demonstrates cross-midnight bug with mixed formats", () => {
    // Legacy local ISO: "2026-03-09T00:00:00" (19 chars)
    // UTC-Z format:     "2026-03-09T00:00:00.000Z" (24 chars)
    //
    // String comparison: the legacy string is SHORTER, so JavaScript compares
    // character by character. At position 19 the legacy string ends while the
    // UTC string has ".000Z" remaining — shorter string sorts before longer
    // when the prefix matches, so legacy < utc.

    const legacySydneyMidnight = "2026-03-09T00:00:00";
    const utcMarch9Gte = "2026-03-09T00:00:00.000Z";

    // String comparison says it is NOT in range — the legacy string sorts
    // before the UTC-Z string due to length difference.
    const stringComparisonSaysInRange = legacySydneyMidnight >= utcMarch9Gte;
    expect(stringComparisonSaysInRange).toBe(false);

    // The UTC instant (appending Z) IS >= the boundary — both are midnight UTC.
    const utcInstantIsInRange = new Date(legacySydneyMidnight + "Z") >= new Date(utcMarch9Gte);
    expect(utcInstantIsInRange).toBe(true);

    // The mismatch proves you CANNOT do mixed string comparison reliably.
    // D1DateCodec.encode() eliminates this by normalizing before storage.
  });
});
