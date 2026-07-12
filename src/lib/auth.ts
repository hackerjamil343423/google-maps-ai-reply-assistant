import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "better-auth/adapters/memory";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendWelcomeEmail } from "@/lib/emails";

const DEV_AUTH_SECRET =
  "dev-only-secret-change-before-production-1234567890";

const isProductionRuntime =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build";

if (isProductionRuntime && !env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set in production. Refusing to start with the dev fallback secret."
  );
}

const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          accessType: "offline" as const,
          prompt: "consent" as const,
        },
      }
    : undefined;

const database = env.DATABASE_URL
  ? drizzleAdapter(drizzle(env.DATABASE_URL, { schema }), {
      provider: "pg",
      schema,
    })
  : memoryAdapter({});

export const auth = betterAuth({
  database,
  baseURL:
    env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await sendWelcomeEmail({
            toEmail: user.email,
            name: user.name ?? user.email,
          }).catch(() => {
            // Do not block sign-up if the welcome email fails
          });
        },
      },
    },
  },
});
