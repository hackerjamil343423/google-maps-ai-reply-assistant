import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { user, userProfiles } from "@/lib/db/schema";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.string().trim().max(2048).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

function splitName(name: string | null | undefined) {
  const cleaned = name?.trim();
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fallbackName = splitName(session.user.name);

  if (!db) {
    return NextResponse.json({
      firstName: fallbackName.firstName,
      lastName: fallbackName.lastName,
      email: session.user.email,
      phone: "",
      company: "",
      website: "",
      bio: "",
      onboardingCompleted: false,
      toursCompleted: [],
    });
  }

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  return NextResponse.json({
    firstName: profile?.firstName ?? fallbackName.firstName,
    lastName: profile?.lastName ?? fallbackName.lastName,
    email: session.user.email,
    phone: profile?.phone ?? "",
    company: profile?.company ?? "",
    website: profile?.website ?? "",
    bio: profile?.bio ?? "",
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    toursCompleted: profile?.toursCompleted ?? [],
  });
}

export async function PATCH(req: NextRequest) {
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

  const payload = await req.json();
  const parsed = updateProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = parsed.data;
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  await db
    .update(user)
    .set({
      name: fullName,
      email: data.email,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  await db
    .insert(userProfiles)
    .values({
      userId: session.user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      company: data.company || null,
      website: data.website || null,
      bio: data.bio || null,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        company: data.company || null,
        website: data.website || null,
        bio: data.bio || null,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}
