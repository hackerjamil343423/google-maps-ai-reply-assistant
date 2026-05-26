import { and, eq, inArray, isNull, notExists } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  DEFAULT_AI_PROMPT,
  type PostApprovalMode,
  TONE_OPTIONS,
} from "@/lib/ai/default-settings";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { aiSettings, businesses, reviewReplies, reviews } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/queue";
import { ensureWorkspaceForUser } from "@/lib/workspace";

const toneValues = TONE_OPTIONS.map((item) => item.value);

const updateSettingsSchema = z.object({
  prompt: z.string().trim().min(50).max(4000),
  tone: z.enum(toneValues as [string, ...string[]]),
  postType: z.enum(["auto", "review"]),
});

function getDefaultSettings() {
  return {
    prompt: DEFAULT_AI_PROMPT,
    tone: "Professional",
    postType: "auto" as PostApprovalMode,
  };
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(getDefaultSettings());
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );

  if (!workspaceId) {
    return NextResponse.json(getDefaultSettings());
  }

  const existing = await db.query.aiSettings.findFirst({
    where: eq(aiSettings.workspaceId, workspaceId),
  });

  if (!existing) {
    const defaults = getDefaultSettings();
    await db.insert(aiSettings).values({
      workspaceId,
      prompt: defaults.prompt,
      tone: defaults.tone,
      approvalMode: defaults.postType,
    });
    return NextResponse.json(defaults);
  }

  return NextResponse.json({
    prompt: existing.prompt,
    tone: existing.tone,
    postType: existing.approvalMode,
  });
}

export async function PUT(req: NextRequest) {
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
  const parsed = updateSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unable to initialize workspace." },
      { status: 500 }
    );
  }

  const data = parsed.data;

  // Read previous mode so we can detect a review→auto transition
  const previous = await db.query.aiSettings.findFirst({
    where: eq(aiSettings.workspaceId, workspaceId),
    columns: { approvalMode: true },
  });

  await db
    .insert(aiSettings)
    .values({
      workspaceId,
      prompt: data.prompt,
      tone: data.tone,
      approvalMode: data.postType,
    })
    .onConflictDoUpdate({
      target: aiSettings.workspaceId,
      set: {
        prompt: data.prompt,
        tone: data.tone,
        approvalMode: data.postType,
        updatedAt: new Date(),
      },
    });

  // When switching from review → auto, enqueue generate_reply for all
  // pending reviews that have no draft/posted reply yet.
  const switchingToAuto =
    data.postType === "auto" &&
    (previous?.approvalMode === "review" || !previous);

  if (switchingToAuto) {
    const activeBusinesses = await db.query.businesses.findMany({
      where: and(
        eq(businesses.workspaceId, workspaceId),
        eq(businesses.status, "active")
      ),
      columns: { id: true },
    });

    if (activeBusinesses.length > 0) {
      const businessIds = activeBusinesses.map((b) => b.id);

      // Find reviews with no reply at all
      const pendingReviews = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            inArray(reviews.businessId, businessIds),
            notExists(
              db
                .select({ id: reviewReplies.id })
                .from(reviewReplies)
                .where(eq(reviewReplies.reviewId, reviews.id))
            )
          )
        );

      for (const review of pendingReviews) {
        await enqueueJob({
          workspaceId,
          type: "generate_reply",
          payload: { reviewId: review.id },
        });
      }
    }
  }

  return NextResponse.json({
    prompt: data.prompt,
    tone: data.tone,
    postType: data.postType,
  });
}
