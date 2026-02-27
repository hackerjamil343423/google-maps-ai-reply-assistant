import { and, eq } from "drizzle-orm";

import { DEFAULT_AI_PROMPT } from "@/lib/ai/default-settings";
import { db } from "@/lib/db";
import {
  aiSettings,
  subscriptions,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

export async function ensureWorkspaceForUser(
  userId: string,
  name?: string | null
): Promise<string | null> {
  if (!db) return null;

  const member = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
    columns: { workspaceId: true },
  });

  if (member?.workspaceId) {
    return member.workspaceId;
  }

  const workspaceName = `${name?.trim() || "My"} Workspace`;
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      ownerUserId: userId,
    })
    .returning({ id: workspaces.id });

  const workspaceId = workspace?.id;
  if (!workspaceId) return null;

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId,
    role: "owner",
  });

  await db.insert(aiSettings).values({
    workspaceId,
    prompt: DEFAULT_AI_PROMPT,
    tone: "Professional",
    approvalMode: "auto",
  });

  await db.insert(subscriptions).values({
    workspaceId,
    plan: "free",
    status: "trialing",
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return workspaceId;
}

export async function getWorkspaceIdForUser(userId: string) {
  if (!db) return null;

  const member = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
    columns: { workspaceId: true },
  });
  return member?.workspaceId ?? null;
}

export async function isWorkspaceOwner(workspaceId: string, userId: string) {
  if (!db) return false;
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.role, "owner")
    ),
    columns: { userId: true },
  });
  return Boolean(member);
}
