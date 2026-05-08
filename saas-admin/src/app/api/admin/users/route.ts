import { NextResponse } from "next/server";

import { adminGuard } from "@/lib/auth/admin-session";
import { getUsersPage } from "@/lib/admin-queries";

export const GET = adminGuard(async (req) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const plan = url.searchParams.get("plan") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20");

  const result = await getUsersPage({ search, plan, status, page, pageSize });
  return NextResponse.json(result);
});
