import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "better-auth/adapters/memory";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

const DEV_SECRET = "admin-dev-secret-change-in-production-9876543210";

const database = env.DATABASE_URL
  ? drizzleAdapter(drizzle(env.DATABASE_URL, { schema }), {
      provider: "pg",
      schema,
    })
  : memoryAdapter({});

export const adminAuth = betterAuth({
  database,
  baseURL:
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  basePath: "/api/admin/auth",
  secret: env.ADMIN_BETTER_AUTH_SECRET ?? DEV_SECRET,
  emailAndPassword: {
    enabled: true,
  },
});
