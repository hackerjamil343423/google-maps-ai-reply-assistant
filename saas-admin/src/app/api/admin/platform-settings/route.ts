import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getAllPlatformSettings, upsertPlatformSetting, deletePlatformSetting } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const settings = await getAllPlatformSettings();
  return NextResponse.json({ settings });
});

export const PUT = adminGuard(async (req) => {
  const body = await req.json();
  const { key, value, description } = body;

  if (!key || typeof key !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "key and value (strings) are required" }, { status: 400 });
  }

  await upsertPlatformSetting(key, value, description);
  return NextResponse.json({ success: true });
});

export const DELETE = adminGuard(async (req) => {
  const body = await req.json();
  const { key } = body;

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  await deletePlatformSetting(key);
  return NextResponse.json({ success: true });
});
