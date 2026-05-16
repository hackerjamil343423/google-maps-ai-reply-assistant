import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getAllBlogCategories, createBlogCategory } from "@/lib/admin-queries";

export const GET = adminGuard(async () => {
  const categories = await getAllBlogCategories();
  return NextResponse.json({ categories });
});

export const POST = adminGuard(async (req) => {
  const body = await req.json();
  const { name, slug, description } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const category = await createBlogCategory({ name, slug, description });
  return NextResponse.json({ category });
});
