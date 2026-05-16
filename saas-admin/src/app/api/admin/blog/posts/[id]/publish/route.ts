import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { toggleBlogPostPublish } from "@/lib/admin-queries";

export const POST = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  const post = await toggleBlogPostPublish(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
});
