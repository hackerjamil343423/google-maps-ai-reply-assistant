import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getPlanDistribution } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const plans = await getPlanDistribution();
  return NextResponse.json({ plans });
});
