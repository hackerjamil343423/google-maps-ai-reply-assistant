import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  DEFAULT_AI_PROMPT,
  type PostApprovalMode,
  TONE_OPTIONS,
} from "@/lib/ai/default-settings";
import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
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

  return NextResponse.json({
    prompt: data.prompt,
    tone: data.tone,
    postType: data.postType,
  });
}
