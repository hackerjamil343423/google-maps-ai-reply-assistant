import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";

const SESSION_CACHE_TTL_MS = 60_000; // 1 minute

const cache = new Map<string, { session: Awaited<ReturnType<typeof auth.api.getSession>>; expiresAt: number }>();

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}

export async function getRequestSession(req: NextRequest) {
  const token = req.cookies.get("better-auth.session_token")?.value ?? req.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    const cached = cache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session;
    }
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (token && session) {
    if (cache.size > 500) evictExpired();
    cache.set(token, { session, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  }

  return session;
}

export function invalidateSessionCache(token: string) {
  cache.delete(token);
}
