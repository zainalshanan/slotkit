import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import {
  providers,
  eventTypes,
  availabilityRules,
  availabilityOverrides,
  bookings,
} from "./schema/index.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // Check if seed data already exists (idempotent)
  const existingProviders = await db.select().from(providers).limit(1);
  if (existingProviders.length > 0) {
    console.log("Seed data already exists. Skipping.");
    process.exit(0);
  }

  // --- Provider 1: Alice (New York) ---
  const [alice] = await db
    .insert(providers)
    .values({
      userId: "user_alice_001",
      displayName: "Alice Johnson",
      email: "alice@example.com",
      timezone: "America/New_York",
    })
    .returning();

  // --- Provider 2: Bob (Los Angeles) ---
  const [bob] = await db
    .insert(providers)
    .values({
      userId: "user_bob_002",
      displayName: "Bob Smith",
      email: "bob@example.com",
      timezone: "America/Los_Angeles",
    })
    .returning();

  console.log(`  Created providers: ${alice.displayName}, ${bob.displayName}`);

  // --- Event Types ---
  const [aliceConsultation] = await db
    .insert(eventTypes)
    .values({
      providerId: alice.id,
      title: "30-Minute Consultation",
      slug: "consultation-30",
      description: "A standard 30-minute consultation session.",
      durationMinutes: 30,
      bufferAfter: 5,
      locationType: "video",
    })
    .returning();

  const [bobHaircut] = await db
    .insert(eventTypes)
    .values({
      providerId: bob.id,
      title: "Haircut",
      slug: "haircut",
      description: "Standard haircut service.",
      durationMinutes: 30,
      bufferBefore: 5,
      bufferAfter: 5,
      priceCents: 2500,
      locationType: "in_person",
    })
    .returning();

  console.log(`  Created event types: ${aliceConsultation.title}, ${bobHaircut.title}`);

  // --- Availability Rules (Mon-Fri, 9 AM - 5 PM) ---
  // RRULE: Every weekday
  const weekdayRrule = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";

  await db.insert(availabilityRules).values([
    {
      providerId: alice.id,
      rrule: weekdayRrule,
      startTime: "09:00",
      endTime: "17:00",
      timezone: "America/New_York",
    },
    {
      providerId: bob.id,
      rrule: weekdayRrule,
      startTime: "09:00",
      endTime: "17:00",
      timezone: "America/Los_Angeles",
    },
  ]);

  console.log("  Created availability rules (Mon-Fri 9-5 for both providers)");

  // --- Availability Overrides for Alice ---
  // Override 1: Blocked day (vacation)
  await db.insert(availabilityOverrides).values({
    providerId: alice.id,
    date: new Date("2026-04-15"),
    isUnavailable: true,
    reason: "Personal day off",
  });

  // Override 2: Extended hours on a Saturday
  await db.insert(availabilityOverrides).values({
    providerId: alice.id,
    date: new Date("2026-04-18"),
    startTime: "10:00",
    endTime: "14:00",
    isUnavailable: false,
    reason: "Extra Saturday hours",
  });

  console.log("  Created 2 availability overrides for Alice");

  // --- Sample Bookings ---
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(11, 0, 0, 0);

  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 3);
  lastWeek.setHours(9, 0, 0, 0);

  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(15, 0, 0, 0);

  await db.insert(bookings).values([
    {
      eventTypeId: aliceConsultation.id,
      providerId: alice.id,
      customerEmail: "customer1@example.com",
      customerName: "Charlie Brown",
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 30 * 60000),
      status: "confirmed",
    },
    {
      eventTypeId: aliceConsultation.id,
      providerId: alice.id,
      customerEmail: "customer2@example.com",
      customerName: "Diana Prince",
      startsAt: dayAfter,
      endsAt: new Date(dayAfter.getTime() + 30 * 60000),
      status: "pending",
    },
    {
      eventTypeId: bobHaircut.id,
      providerId: bob.id,
      customerEmail: "customer3@example.com",
      customerName: "Eve Wilson",
      startsAt: nextWeek,
      endsAt: new Date(nextWeek.getTime() + 30 * 60000),
      status: "confirmed",
    },
    {
      eventTypeId: aliceConsultation.id,
      providerId: alice.id,
      customerEmail: "customer4@example.com",
      customerName: "Frank Castle",
      startsAt: lastWeek,
      endsAt: new Date(lastWeek.getTime() + 30 * 60000),
      status: "cancelled",
    },
    {
      eventTypeId: bobHaircut.id,
      providerId: bob.id,
      customerEmail: "customer5@example.com",
      customerName: "Grace Hopper",
      startsAt: twoWeeksAgo,
      endsAt: new Date(twoWeeksAgo.getTime() + 30 * 60000),
      status: "completed",
    },
  ]);

  console.log("  Created 5 sample bookings (confirmed, pending, cancelled, completed)");

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
