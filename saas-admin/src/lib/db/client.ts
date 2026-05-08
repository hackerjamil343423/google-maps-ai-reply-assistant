import { drizzle } from "drizzle-orm/neon-http";

import { env, isProduction } from "@/lib/env";
import * as schema from "@/lib/db/schema";

function createDb() {
  if (!env.DATABASE_URL) return null;
  return drizzle(env.DATABASE_URL, { schema });
}

type DbClient = ReturnType<typeof createDb>;

declare global {
  var __adminDbClient: DbClient | undefined;
}

export const db = globalThis.__adminDbClient ?? createDb();

if (!isProduction) {
  globalThis.__adminDbClient = db;
}
