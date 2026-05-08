import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-session";
import { getWorkspacesPage } from "@/lib/admin-queries";

export const GET = adminGuard(async (req) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20");

  const result = await getWorkspacesPage({ search, page, pageSize });
  return NextResponse.json(result);
});
