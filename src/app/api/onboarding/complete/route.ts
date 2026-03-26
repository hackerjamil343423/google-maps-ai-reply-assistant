import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  await db
    .insert(userProfiles)
    .values({
      userId: session.user.id,
      onboardingCompleted: true,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}
