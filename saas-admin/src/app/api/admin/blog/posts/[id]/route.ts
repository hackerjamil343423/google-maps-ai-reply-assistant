import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import {
  getBlogPostById,
  updateBlogPost,
  deleteBlogPost,
} from "@/lib/admin-queries";

export const GET = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  const post = await getBlogPostById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
});

export const PATCH = adminGuard(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const post = await updateBlogPost(id, body);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
});

export const DELETE = adminGuard(async (_req, ctx) => {
  const { id } = await ctx.params;
  await deleteBlogPost(id);
  return NextResponse.json({ success: true });
});
