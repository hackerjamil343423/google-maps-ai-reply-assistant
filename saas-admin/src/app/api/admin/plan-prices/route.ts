import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import {
  getEffectivePlanPrices,
  normalizePlanPrices,
  savePlanPrices,
  toPlanPriceResponse,
} from "@/lib/plan-prices";

export const GET = adminGuard(async () => {
  const prices = await getEffectivePlanPrices();
  return NextResponse.json({ plans: toPlanPriceResponse(prices) });
});

export const PUT = adminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const prices = normalizePlanPrices(body?.prices);

  if (!prices) {
    return NextResponse.json(
      { error: "Provide positive whole-number monthly and yearly SAR prices for every paid plan." },
      { status: 400 }
    );
  }

  await savePlanPrices(prices);
  return NextResponse.json({ success: true, plans: toPlanPriceResponse(prices) });
});
