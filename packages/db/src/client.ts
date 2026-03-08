import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

/**
 * Create a database client connected to the given Postgres URL.
 * Uses postgres.js as the driver with Drizzle ORM.
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}

/** Database instance type */
export type Database = ReturnType<typeof createDb>;
