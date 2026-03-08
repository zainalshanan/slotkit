import { describe, it, expect } from "vitest";
import {
  findLegacyRows,
  migrateRowDates,
  buildMigrationSql,
  BOOKING_LOCKS_DDL,
  type MigrationColumn,
} from "../migration.js";

const DATE_COLUMNS: MigrationColumn[] = [
  { name: "starts_at" },
  { name: "ends_at" },
];

// ---------------------------------------------------------------------------
// findLegacyRows()
// ---------------------------------------------------------------------------

describe("findLegacyRows()", () => {
  it("identifies rows with local-ISO date strings as legacy", () => {
    const rows = [
      { id: "1", starts_at: "2026-03-09T14:00:00", ends_at: "2026-03-09T14:30:00" },
      { id: "2", starts_at: "2026-03-09T14:00:00.000Z", ends_at: "2026-03-09T14:30:00.000Z" },
    ];

    const legacy = findLegacyRows(rows, DATE_COLUMNS);
    expect(legacy).toHaveLength(1);
    expect(legacy[0].id).toBe("1");
  });

  it("returns empty array when no legacy rows exist", () => {
    const rows = [
      { id: "1", starts_at: "2026-03-09T14:00:00.000Z", ends_at: "2026-03-09T14:30:00.000Z" },
    ];

    expect(findLegacyRows(rows, DATE_COLUMNS)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(findLegacyRows([], DATE_COLUMNS)).toHaveLength(0);
  });

  it("detects legacy in any of the specified columns", () => {
    // starts_at is canonical but ends_at is legacy
    const rows = [
      { id: "1", starts_at: "2026-03-09T14:00:00.000Z", ends_at: "2026-03-09T14:30:00" },
    ];

    const legacy = findLegacyRows(rows, DATE_COLUMNS);
    expect(legacy).toHaveLength(1);
  });

  it("ignores null/non-string values in columns", () => {
    const rows = [
      { id: "1", starts_at: null, ends_at: "2026-03-09T14:30:00.000Z" },
    ];

    expect(findLegacyRows(rows, DATE_COLUMNS)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// migrateRowDates()
// ---------------------------------------------------------------------------

describe("migrateRowDates()", () => {
  it("re-encodes legacy local-ISO columns as UTC-Z (default utc interpretation)", () => {
    const row = { id: "1", starts_at: "2026-03-09T14:00:00", ends_at: "2026-03-09T14:30:00" };

    const updates = migrateRowDates(row, DATE_COLUMNS);

    expect(updates.starts_at).toBe("2026-03-09T14:00:00.000Z");
    expect(updates.ends_at).toBe("2026-03-09T14:30:00.000Z");
  });

  it("re-encodes with tz interpretation when legacyInterpretation is 'tz'", () => {
    // 14:00 Sydney AEDT (UTC+11) in January = 03:00 UTC
    const row = { id: "1", starts_at: "2026-01-09T14:00:00", ends_at: "2026-01-09T14:30:00" };

    const cols: MigrationColumn[] = [
      { name: "starts_at", legacyInterpretation: "tz", timezone: "Australia/Sydney" },
      { name: "ends_at",   legacyInterpretation: "tz", timezone: "Australia/Sydney" },
    ];

    const updates = migrateRowDates(row, cols);

    expect(updates.starts_at).toBe("2026-01-09T03:00:00.000Z");
    expect(updates.ends_at).toBe("2026-01-09T03:30:00.000Z");
  });

  it("returns empty object when no columns need migration", () => {
    const row = {
      id: "1",
      starts_at: "2026-03-09T14:00:00.000Z",
      ends_at: "2026-03-09T14:30:00.000Z",
    };

    const updates = migrateRowDates(row, DATE_COLUMNS);
    expect(updates).toEqual({});
  });

  it("only includes changed columns in the updates object", () => {
    // starts_at is legacy, ends_at is already canonical
    const row = {
      id: "1",
      starts_at: "2026-03-09T14:00:00",
      ends_at: "2026-03-09T14:30:00.000Z",
    };

    const updates = migrateRowDates(row, DATE_COLUMNS);
    expect(Object.keys(updates)).toEqual(["starts_at"]);
  });

  it("ignores non-string column values", () => {
    const row = { id: "1", starts_at: null, ends_at: 123456 };
    const updates = migrateRowDates(row as Record<string, unknown>, DATE_COLUMNS);
    expect(updates).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// buildMigrationSql()
// ---------------------------------------------------------------------------

describe("buildMigrationSql()", () => {
  it("generates a correct UPDATE statement for one column", () => {
    const { sql, params } = buildMigrationSql("bookings", "id", "row-1", {
      starts_at: "2026-03-09T14:00:00.000Z",
    });

    expect(sql).toBe("UPDATE bookings SET starts_at = ? WHERE id = ?");
    expect(params).toEqual(["2026-03-09T14:00:00.000Z", "row-1"]);
  });

  it("generates a correct UPDATE statement for multiple columns", () => {
    const { sql, params } = buildMigrationSql("bookings", "id", "row-2", {
      starts_at: "2026-03-09T14:00:00.000Z",
      ends_at: "2026-03-09T14:30:00.000Z",
    });

    expect(sql).toContain("starts_at = ?");
    expect(sql).toContain("ends_at = ?");
    expect(sql).toContain("WHERE id = ?");
    expect(params).toHaveLength(3);
    expect(params[params.length - 1]).toBe("row-2");
  });

  it("throws when updates object is empty", () => {
    expect(() => buildMigrationSql("bookings", "id", "row-1", {})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// BOOKING_LOCKS_DDL
// ---------------------------------------------------------------------------

describe("BOOKING_LOCKS_DDL", () => {
  it("is a non-empty string", () => {
    expect(typeof BOOKING_LOCKS_DDL).toBe("string");
    expect(BOOKING_LOCKS_DDL.length).toBeGreaterThan(0);
  });

  it("creates a booking_locks table with the required columns", () => {
    expect(BOOKING_LOCKS_DDL).toContain("booking_locks");
    expect(BOOKING_LOCKS_DDL).toContain("lock_key");
    expect(BOOKING_LOCKS_DDL).toContain("expires_at");
    expect(BOOKING_LOCKS_DDL).toContain("created_at");
    expect(BOOKING_LOCKS_DDL).toContain("PRIMARY KEY");
    expect(BOOKING_LOCKS_DDL).toContain("IF NOT EXISTS");
  });
});
