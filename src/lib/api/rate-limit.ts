import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

export async function consumeRateLimitDurable(
  key: string,
  maxRequests: number,
  windowMs: number
) {
  if (!db) {
    return consumeRateLimit(key, maxRequests, windowMs);
  }

  const resetAt = new Date(Date.now() + windowMs);
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limit_buckets AS b (key, count, reset_at)
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN b.reset_at <= now() THEN 1 ELSE b.count + 1 END,
        reset_at = CASE WHEN b.reset_at <= now() THEN ${resetAt} ELSE b.reset_at END
      RETURNING count, reset_at
    `);

    const rows = Array.isArray(result)
      ? result
      : "rows" in result
        ? result.rows
        : [];
    const row = rows[0] as { count: number | string; reset_at: Date | string } | undefined;
    const count = Number(row?.count ?? 1);
    const returnedResetAt = row?.reset_at ? new Date(row.reset_at) : resetAt;

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: returnedResetAt,
    };
  } catch (error) {
    console.error("[rate-limit] durable limiter failed:", error);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt,
    };
  }
}
