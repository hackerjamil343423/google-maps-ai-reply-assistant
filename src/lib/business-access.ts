import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  businesses,
  teamInvitationBusinessAssignments,
  teamInvitations,
  workspaceMemberBusinessAssignments,
  workspaceMembers,
} from "@/lib/db/schema";

export type BusinessAccessMode = "all" | "selected";

export async function getWorkspaceBusinesses(workspaceId: string) {
  if (!db) return [];

  return db.query.businesses.findMany({
    where: eq(businesses.workspaceId, workspaceId),
    columns: { id: true, name: true, status: true, connectedAt: true, googleLocationId: true },
  });
}

export async function getWorkspaceMemberAccess(
  workspaceId: string,
  userId: string
): Promise<{ role: string; accessMode: BusinessAccessMode; businessIds: string[] } | null> {
  if (!db) return null;

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
    columns: { role: true, accessAllBusinesses: true },
  });

  if (!membership) return null;

  if (membership.accessAllBusinesses) {
    return { role: membership.role, accessMode: "all", businessIds: [] };
  }

  const assignments = await db.query.workspaceMemberBusinessAssignments.findMany({
    where: and(
      eq(workspaceMemberBusinessAssignments.workspaceId, workspaceId),
      eq(workspaceMemberBusinessAssignments.userId, userId)
    ),
    columns: { businessId: true },
  });

  return {
    role: membership.role,
    accessMode: "selected",
    businessIds: assignments.map((item) => item.businessId),
  };
}

export async function getAccessibleBusinessIds(
  workspaceId: string,
  userId: string
): Promise<string[]> {
  const access = await getWorkspaceMemberAccess(workspaceId, userId);
  if (!access) return [];

  const workspaceBusinessList = await getWorkspaceBusinesses(workspaceId);
  const allIds = workspaceBusinessList.map((item) => item.id);

  if (access.accessMode === "all") {
    return allIds;
  }

  return allIds.filter((id) => access.businessIds.includes(id));
}

export async function userCanAccessBusiness(
  workspaceId: string,
  userId: string,
  businessId: string
) {
  const businessIds = await getAccessibleBusinessIds(workspaceId, userId);
  return businessIds.includes(businessId);
}

export async function userCanAccessBusinesses(
  workspaceId: string,
  userId: string,
  businessIds: string[]
) {
  if (businessIds.length === 0) return false;

  const accessibleBusinessIds = new Set(
    await getAccessibleBusinessIds(workspaceId, userId)
  );

  return businessIds.every((businessId) => accessibleBusinessIds.has(businessId));
}

export async function getInvitationAccess(
  invitationId: string
): Promise<{ accessMode: BusinessAccessMode; businessIds: string[] }> {
  if (!db) {
    return { accessMode: "all", businessIds: [] };
  }

  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.id, invitationId),
    columns: { accessAllBusinesses: true },
  });

  if (!invitation || invitation.accessAllBusinesses) {
    return { accessMode: "all", businessIds: [] };
  }

  const assignments = await db.query.teamInvitationBusinessAssignments.findMany({
    where: eq(teamInvitationBusinessAssignments.invitationId, invitationId),
    columns: { businessId: true },
  });

  return {
    accessMode: "selected",
    businessIds: assignments.map((item) => item.businessId),
  };
}

export async function replaceWorkspaceMemberBusinessAssignments(args: {
  workspaceId: string;
  userId: string;
  businessIds: string[];
  accessMode: BusinessAccessMode;
}) {
  if (!db) return;

  await db
    .update(workspaceMembers)
    .set({ accessAllBusinesses: args.accessMode === "all" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.userId, args.userId)
      )
    );

  await db
    .delete(workspaceMemberBusinessAssignments)
    .where(
      and(
        eq(workspaceMemberBusinessAssignments.workspaceId, args.workspaceId),
        eq(workspaceMemberBusinessAssignments.userId, args.userId)
      )
    );

  if (args.accessMode === "selected" && args.businessIds.length > 0) {
    await db.insert(workspaceMemberBusinessAssignments).values(
      args.businessIds.map((businessId) => ({
        workspaceId: args.workspaceId,
        userId: args.userId,
        businessId,
      }))
    );
  }
}

export async function replaceInvitationBusinessAssignments(args: {
  invitationId: string;
  businessIds: string[];
  accessMode: BusinessAccessMode;
}) {
  if (!db) return;

  await db
    .update(teamInvitations)
    .set({ accessAllBusinesses: args.accessMode === "all" })
    .where(eq(teamInvitations.id, args.invitationId));

  await db
    .delete(teamInvitationBusinessAssignments)
    .where(eq(teamInvitationBusinessAssignments.invitationId, args.invitationId));

  if (args.accessMode === "selected" && args.businessIds.length > 0) {
    await db.insert(teamInvitationBusinessAssignments).values(
      args.businessIds.map((businessId) => ({
        invitationId: args.invitationId,
        businessId,
      }))
    );
  }
}

export async function validateBusinessIdsForWorkspace(
  workspaceId: string,
  businessIds: string[]
) {
  if (!db) return [];

  const normalizedIds = [...new Set(businessIds.filter(Boolean))];
  if (normalizedIds.length === 0) return [];

  const rows = await db.query.businesses.findMany({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      inArray(businesses.id, normalizedIds)
    ),
    columns: { id: true },
  });

  const foundIds = rows.map((row) => row.id);
  if (foundIds.length !== normalizedIds.length) {
    throw new Error("One or more selected profiles do not belong to this workspace.");
  }

  return normalizedIds;
}
