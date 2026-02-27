import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";

export async function getRequestSession(req: NextRequest) {
  return auth.api.getSession({
    headers: req.headers,
  });
}
