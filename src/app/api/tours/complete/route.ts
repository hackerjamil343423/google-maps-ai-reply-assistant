import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { appendTourId, TOUR_IDS } from "@/lib/tours";

export const tourCompleteSchema = z.object({ tourId: z.enum(TOUR_IDS) });

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = tourCompleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown tour id." }, { status: 400 });
  if (!db) return NextResponse.json({ success: true, toursCompleted: [parsed.data.tourId] });
  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.user.id), columns: { toursCompleted: true } });
  const toursCompleted = appendTourId(profile?.toursCompleted, parsed.data.tourId);
  await db.insert(userProfiles).values({ userId: session.user.id, toursCompleted }).onConflictDoUpdate({ target: userProfiles.userId, set: { toursCompleted, updatedAt: new Date() } });
  return NextResponse.json({ success: true, toursCompleted });
}
