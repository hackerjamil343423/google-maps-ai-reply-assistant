import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { updateBlogCategory, deleteBlogCategory } from "@/lib/admin-queries";

export const PATCH = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const category = await updateBlogCategory(id, body);
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json({ category });
});

export const DELETE = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  await deleteBlogCategory(id);
  return NextResponse.json({ success: true });
});
