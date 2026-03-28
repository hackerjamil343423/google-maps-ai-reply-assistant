import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().url().optional()
);

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional()
);

const optionalSecretString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(32).optional()
);

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  DATABASE_URL: optionalNonEmptyString,
  BETTER_AUTH_URL: optionalUrl,
  BETTER_AUTH_SECRET: optionalSecretString,
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  GOOGLE_MAPS_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: optionalNonEmptyString,
  STREAM_API_KEY: optionalNonEmptyString,
  STREAM_API_SECRET: optionalNonEmptyString,
  STREAM_PRODUCT_LOCAL_BUSINESS: optionalNonEmptyString,
  STREAM_PRODUCT_MULTI_LOCATION: optionalNonEmptyString,
  STREAM_PRODUCT_AGENCY_MAX: optionalNonEmptyString,
  MINIMAX_API_KEY: optionalNonEmptyString,
});

export const env = serverEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  STREAM_API_KEY: process.env.STREAM_API_KEY,
  STREAM_API_SECRET: process.env.STREAM_API_SECRET,
  STREAM_PRODUCT_LOCAL_BUSINESS: process.env.STREAM_PRODUCT_LOCAL_BUSINESS,
  STREAM_PRODUCT_MULTI_LOCATION: process.env.STREAM_PRODUCT_MULTI_LOCATION,
  STREAM_PRODUCT_AGENCY_MAX: process.env.STREAM_PRODUCT_AGENCY_MAX,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
});

export const isProduction = env.NODE_ENV === "production";
