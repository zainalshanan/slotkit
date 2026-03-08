import { describe, it, expect, vi, beforeEach } from "vitest";
import { D1BookingLock, LockAcquisitionError } from "../lock.js";
import type { LockDb } from "../lock.js";

// ---------------------------------------------------------------------------
// Mock DB helper
// ---------------------------------------------------------------------------

/**
 * Creates a mock LockDb that simulates D1's INSERT UNIQUE constraint behaviour.
 * The first call to INSERT succeeds; concurrent (simultaneous) inserts for the
 * same key throw an error until the first caller releases.
 */
function createMockLockDb() {
  const held = new Set<string>();
  const runCalls: Array<{ sql: string; params: unknown[] }> = [];

  const db: LockDb = {
    async run(sql: string, params: unknown[] = []) {
      runCalls.push({ sql, params });

      if (sql.includes("INSERT INTO")) {
        const lockKey = params[0] as string;
        if (held.has(lockKey)) {
          throw new Error("UNIQUE constraint failed: booking_locks.lock_key");
        }
        held.add(lockKey);
      } else if (sql.includes("DELETE FROM") && sql.includes("lock_key = ?")) {
        // Release or stale cleanup
        const lockKey = params[0] as string;
        held.delete(lockKey);
      }
      return {};
    },
  };

  return { db, held, runCalls };
}

// ---------------------------------------------------------------------------
// D1BookingLock.withLock()
// ---------------------------------------------------------------------------

describe("D1BookingLock.withLock()", () => {
  it("executes the callback and returns its value", async () => {
    const { db } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0 });

    const result = await lock.withLock("barber-1:2026-03-09", async () => {
      return "booking-id-123";
    });

    expect(result).toBe("booking-id-123");
  });

  it("acquires then releases the lock (INSERT then DELETE called)", async () => {
    const { db, runCalls } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0 });

    await lock.withLock("barber-1:2026-03-09", async () => "ok");

    const insertCalls = runCalls.filter((c) => c.sql.includes("INSERT INTO"));
    // Two DELETE calls: one stale-lock cleanup before acquire, one release after
    const deleteCalls = runCalls.filter(
      (c) => c.sql.includes("DELETE FROM") && c.sql.includes("lock_key = ?"),
    );

    expect(insertCalls).toHaveLength(1);
    expect(deleteCalls).toHaveLength(2); // cleanup + release
    expect(insertCalls[0].params[0]).toBe("barber-1:2026-03-09");
    // The release DELETE has the lock key as the first (and only) param
    const releaseCalls = deleteCalls.filter((c) => c.params.length === 1);
    expect(releaseCalls).toHaveLength(1);
    expect(releaseCalls[0].params[0]).toBe("barber-1:2026-03-09");
  });

  it("releases the lock even when the callback throws", async () => {
    const { db, held } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0 });

    await expect(
      lock.withLock("barber-1:2026-03-09", async () => {
        throw new Error("Booking conflict!");
      }),
    ).rejects.toThrow("Booking conflict!");

    // Lock should be released after the throw
    expect(held.has("barber-1:2026-03-09")).toBe(false);
  });

  it("allows a second lock with a different key concurrently", async () => {
    const { db } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0 });

    const results = await Promise.all([
      lock.withLock("barber-1:2026-03-09", async () => "a"),
      lock.withLock("barber-2:2026-03-09", async () => "b"),
    ]);

    expect(results).toContain("a");
    expect(results).toContain("b");
  });

  it("retries and succeeds after the lock is released", async () => {
    // Simulate a lock that is held for 2 attempts then released
    let insertAttempts = 0;
    let released = false;

    const db: LockDb = {
      async run(sql: string, params: unknown[] = []) {
        if (sql.includes("INSERT INTO")) {
          insertAttempts++;
          if (!released) {
            released = insertAttempts >= 2; // release after 2nd attempt
            if (insertAttempts < 2) {
              throw new Error("UNIQUE constraint failed: booking_locks.lock_key");
            }
          }
        }
        return {};
      },
    };

    const lock = new D1BookingLock(db, {
      baseDelayMs: 1, // very short delay for tests
      maxRetries: 5,
    });

    const result = await lock.withLock("key", async () => "success");
    expect(result).toBe("success");
    expect(insertAttempts).toBe(2);
  });

  it("throws LockAcquisitionError when maxRetries is exhausted", async () => {
    const db: LockDb = {
      async run(sql: string) {
        if (sql.includes("INSERT INTO")) {
          throw new Error("UNIQUE constraint failed: booking_locks.lock_key");
        }
        return {};
      },
    };

    const lock = new D1BookingLock(db, {
      baseDelayMs: 1,
      maxRetries: 3,
    });

    await expect(lock.withLock("locked-key", async () => "never")).rejects.toThrow(
      LockAcquisitionError,
    );
  });

  it("LockAcquisitionError contains the lock key and retry count", async () => {
    const db: LockDb = {
      async run(sql: string) {
        if (sql.includes("INSERT INTO")) {
          throw new Error("UNIQUE constraint failed");
        }
        return {};
      },
    };

    const lock = new D1BookingLock(db, { baseDelayMs: 1, maxRetries: 2 });

    try {
      await lock.withLock("provider-123:2026-03-09", async () => "x");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LockAcquisitionError);
      const e = err as LockAcquisitionError;
      expect(e.message).toContain("provider-123:2026-03-09");
      expect(e.message).toContain("2");
      expect(e.code).toBe("LOCK_ACQUISITION_EXHAUSTED");
    }
  });

  it("cleans up stale locks before each acquire attempt", async () => {
    const { db, runCalls } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0, lockTtlMs: 5000 });

    await lock.withLock("stale-key", async () => "ok");

    // There should be a DELETE for stale cleanup (WHERE expires_at < ?)
    const staleCleanupcalls = runCalls.filter(
      (c) => c.sql.includes("DELETE") && c.sql.includes("expires_at <"),
    );
    expect(staleCleanupcalls.length).toBeGreaterThanOrEqual(1);
  });

  it("sets an expiry time on the lock row", async () => {
    const { db, runCalls } = createMockLockDb();
    const lock = new D1BookingLock(db, { baseDelayMs: 0, lockTtlMs: 10_000 });

    await lock.withLock("ttl-key", async () => "ok");

    const insert = runCalls.find((c) => c.sql.includes("INSERT INTO"));
    expect(insert).toBeDefined();
    // params[1] is the expires_at value — should be a future UTC-Z string
    const expiresAt = insert!.params[1] as string;
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(expiresAt).toMatch(/Z$/);
  });
});

// ---------------------------------------------------------------------------
// Simulated booking race condition
// ---------------------------------------------------------------------------

describe("D1BookingLock — race condition simulation", () => {
  it("prevents double booking when two requests arrive simultaneously", async () => {
    // Shared state: slot is available initially
    let slotBooked = false;
    const bookingIds: string[] = [];

    // Real UNIQUE constraint behaviour: first INSERT wins, second throws
    const held = new Set<string>();
    const db: LockDb = {
      async run(sql: string, params: unknown[] = []) {
        if (sql.includes("INSERT INTO")) {
          const key = params[0] as string;
          if (held.has(key)) throw new Error("UNIQUE constraint failed");
          held.add(key);
        } else if (sql.includes("DELETE FROM") && sql.includes("lock_key = ?")) {
          held.delete(params[0] as string);
        }
        return {};
      },
    };

    const lock = new D1BookingLock(db, { baseDelayMs: 5, maxRetries: 10 });

    const attemptBooking = async (requestId: string): Promise<string | null> => {
      try {
        return await lock.withLock("barber-1:2026-03-09-14:00", async () => {
          // Read phase: check availability
          if (slotBooked) {
            return null; // Slot already taken
          }
          // Write phase: book it
          slotBooked = true;
          bookingIds.push(requestId);
          return requestId;
        });
      } catch {
        return null;
      }
    };

    // Fire two "simultaneous" requests
    const [r1, r2] = await Promise.all([
      attemptBooking("request-1"),
      attemptBooking("request-2"),
    ]);

    // Exactly one should succeed, one should see the slot as taken
    const successes = [r1, r2].filter(Boolean);
    expect(successes).toHaveLength(1);
    expect(bookingIds).toHaveLength(1);
  });
});
