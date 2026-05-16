import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { uploadToR2, isR2Configured } from "@/lib/r2-client";

export const POST = adminGuard(async (req) => {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 storage is not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) ?? "blog/content";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(buffer, folder, file.type);

  return NextResponse.json({ url });
});
