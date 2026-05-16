import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getBlogSeoSettings, upsertBlogSeoSettings } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const settings = await getBlogSeoSettings();
  return NextResponse.json({ settings });
});

export const PATCH = adminGuard(async (req) => {
  const body = await req.json();
  const settings = await upsertBlogSeoSettings(body);
  return NextResponse.json({ settings });
});
