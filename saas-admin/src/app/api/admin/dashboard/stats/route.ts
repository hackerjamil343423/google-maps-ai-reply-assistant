import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getPlatformStats } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const stats = await getPlatformStats();
  return NextResponse.json(stats);
});
