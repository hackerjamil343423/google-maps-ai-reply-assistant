import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getRecentSignups } from "@/lib/admin-queries";

export const GET = adminGuard(async (req) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "10");
  const signups = await getRecentSignups(limit);
  return NextResponse.json({ signups });
});
