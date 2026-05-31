import { NextResponse } from "next/server";

import { getDisplayPlanPrices } from "@/lib/subscription/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await getDisplayPlanPrices();
  return NextResponse.json({ plans });
}
