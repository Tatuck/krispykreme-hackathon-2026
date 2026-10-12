import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { kkClient?: ReturnType<typeof createClient> };

const client =
  globalForDb.kkClient ??
  createClient({
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.kkClient = client;

export const db = drizzle(client, { schema });
export { schema };
