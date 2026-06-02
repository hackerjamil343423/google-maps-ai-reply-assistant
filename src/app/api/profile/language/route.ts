import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { getRequestSession } from "@/lib/api/session";

const schema = z.object({ language: z.enum(["en", "ar"]) });

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid language" }, { status: 400 });

    if (!db) return NextResponse.json({ ok: true });

    await db
      .update(userProfiles)
      .set({ language: parsed.data.language, updatedAt: new Date() })
      .where(eq(userProfiles.userId, session.user.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile/language] failed to save language", error);
    return NextResponse.json(
      { error: "Failed to save language preference" },
      { status: 500 }
    );
  }
}
