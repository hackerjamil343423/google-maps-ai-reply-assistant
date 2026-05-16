import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import {
  getBlogPostsPage,
  createBlogPost,
} from "@/lib/admin-queries";

export const GET = adminGuard(async (req) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20");

  const result = await getBlogPostsPage({ search, status, categoryId, page, pageSize });
  return NextResponse.json(result);
});

export const POST = adminGuard(async (req) => {
  const body = await req.json();
  const { title, slug, content, excerpt, coverImage, categoryId, authorId, status, seoTitle, seoDescription, ogImage, tagIds } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  const post = await createBlogPost({
    title,
    slug,
    content: content ?? "",
    excerpt,
    coverImage,
    categoryId,
    authorId: authorId ?? "admin",
    status,
    seoTitle,
    seoDescription,
    ogImage,
    tagIds,
  });

  return NextResponse.json({ post });
});
