import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getAllBlogTags, createBlogTag } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const tags = await getAllBlogTags();
  return NextResponse.json({ tags });
});

export const POST = adminGuard(async (req) => {
  const body = await req.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const tag = await createBlogTag({ name, slug });
  return NextResponse.json({ tag });
});
