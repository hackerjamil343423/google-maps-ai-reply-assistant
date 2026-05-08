import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getMonthlyUserGrowth } from "@/lib/admin-queries";

export const GET = adminGuard(async (req) => {
  const url = new URL(req.url);
  const months = parseInt(url.searchParams.get("months") ?? "12");
  const data = await getMonthlyUserGrowth(months);
  return NextResponse.json({ data });
});
