import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { updateBlogTag, deleteBlogTag } from "@/lib/admin-queries";

export const PATCH = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const tag = await updateBlogTag(id, body);
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  return NextResponse.json({ tag });
});

export const DELETE = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  await deleteBlogTag(id);
  return NextResponse.json({ success: true });
});
