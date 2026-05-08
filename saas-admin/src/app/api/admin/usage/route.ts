import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getGlobalUsageStats } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const stats = await getGlobalUsageStats();
  return NextResponse.json(stats);
});
