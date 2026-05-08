import { db } from "@/lib/db";
import {
  sql,
  eq,
  desc,
  count,
  and,
  inArray,
  type SQL,
} from "drizzle-orm";
import {
  user,
  workspaces,
  userProfiles,
  workspaceMembers,
  businesses,
  reviews,
  reviewReplies,
  subscriptions,
  usageCounters,
  teamInvitations,
  adminAuditLogs,
} from "@/lib/db/schema";

export async function getPlatformStats() {
  if (!db) return { totalUsers: 0, activeSubscriptions: 0, totalBusinesses: 0, totalReviews: 0 };

  const [userCount] = await db.select({ count: count() }).from(user);
  const [activeSubs] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(sql`${subscriptions.status} IN ('active', 'trialing')`);
  const [businessCount] = await db.select({ count: count() }).from(businesses);
  const [reviewCount] = await db.select({ count: count() }).from(reviews);

  return {
    totalUsers: userCount?.count ?? 0,
    activeSubscriptions: activeSubs?.count ?? 0,
    totalBusinesses: businessCount?.count ?? 0,
    totalReviews: reviewCount?.count ?? 0,
  };
}

export async function getMonthlyUserGrowth(months = 12) {
  if (!db) return [];
  return db
    .select({
      month: sql<string>`to_char(${user.createdAt}, 'YYYY-MM')`,
      count: count(),
    })
    .from(user)
    .where(sql`${user.createdAt} >= now() - interval '${sql.raw(String(months))} months'`)
    .groupBy(sql`to_char(${user.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${user.createdAt}, 'YYYY-MM')`);
}

export async function getPlanDistribution() {
  if (!db) return [];
  return db
    .select({
      plan: subscriptions.plan,
      count: count(),
    })
    .from(subscriptions)
    .groupBy(subscriptions.plan);
}

export async function getRecentSignups(limit = 10) {
  if (!db) return [];
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

export async function getUsersPage(params: {
  search?: string;
  plan?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  if (!db) return { users: [], total: 0 };

  const { search, plan, status, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${user.name} ILIKE ${`%${search}%`} OR ${user.email} ILIKE ${`%${search}%`})`
    );
  }
  if (status === "suspended") {
    conditions.push(eq(user.suspended, true));
  } else if (status === "active") {
    conditions.push(eq(user.suspended, false));
  }

  const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const usersQuery = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      suspended: user.suspended,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(pageSize)
    .offset(offset);

  const filteredUsers = whereClause
    ? await usersQuery.where(whereClause)
    : await usersQuery;

  const [totalResult] = await db
    .select({ count: count() })
    .from(user)
    .where(whereClause ?? sql`true`);

  return {
    users: filteredUsers,
    total: totalResult?.count ?? 0,
  };
}

export async function getUserDetail(userId: string) {
  if (!db) return null;

  const [userData] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userData) return null;

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const userWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  const plan = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(workspaces, eq(subscriptions.workspaceId, workspaces.id))
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return { ...userData, profile, workspaces: userWorkspaces, plan };
}

export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  if (!db) return;
  await db.insert(adminAuditLogs).values({
    adminUserId,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    metaJson: meta ? JSON.stringify(meta) : null,
  });
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function getWorkspacesPage(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  if (!db) return { workspaces: [], total: 0 };

  const { search, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const searchFilter: SQL = search
    ? sql`( ${workspaces.name} ILIKE ${`%${search}%`} OR ${user.name} ILIKE ${`%${search}%`} OR ${user.email} ILIKE ${`%${search}%`} )`
    : sql`true`;

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
      ownerId: workspaces.ownerUserId,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(workspaces)
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .where(searchFilter)
    .orderBy(desc(workspaces.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(workspaces)
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .where(searchFilter);

  const [memberCounts, businessCounts, subResults] = await Promise.all([
    db
      .select({ workspaceId: workspaceMembers.workspaceId, count: count() })
      .from(workspaceMembers)
      .where(inArray(workspaceMembers.workspaceId, rows.map((r) => r.id)))
      .groupBy(workspaceMembers.workspaceId),
    db
      .select({ workspaceId: businesses.workspaceId, count: count() })
      .from(businesses)
      .where(inArray(businesses.workspaceId, rows.map((r) => r.id)))
      .groupBy(businesses.workspaceId),
    db
      .select({ workspaceId: subscriptions.workspaceId, plan: subscriptions.plan, status: subscriptions.status })
      .from(subscriptions)
      .where(inArray(subscriptions.workspaceId, rows.map((r) => r.id))),
  ]);

  const memberMap = new Map(memberCounts.map((r) => [r.workspaceId, r.count]));
  const businessMap = new Map(businessCounts.map((r) => [r.workspaceId, r.count]));
  const subMap = new Map(subResults.map((r) => [r.workspaceId, r]));

  const workspacesList = rows.map((r) => ({
    ...r,
    memberCount: memberMap.get(r.id) ?? 0,
    businessCount: businessMap.get(r.id) ?? 0,
    plan: subMap.get(r.id)?.plan ?? "free",
    subscriptionStatus: subMap.get(r.id)?.status ?? "trialing",
  }));

  return { workspaces: workspacesList, total: totalResult?.count ?? 0 };
}

export async function getWorkspaceDetail(workspaceId: string) {
  if (!db) return null;

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) return null;

  const owner = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, ws.ownerUserId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const members = await db
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      accessAllBusinesses: workspaceMembers.accessAllBusinesses,
      createdAt: workspaceMembers.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const workspaceBusinesses = await db
    .select()
    .from(businesses)
    .where(eq(businesses.workspaceId, workspaceId))
    .orderBy(desc(businesses.createdAt));

  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const usage = await db
    .select()
    .from(usageCounters)
    .where(eq(usageCounters.workspaceId, workspaceId))
    .orderBy(desc(usageCounters.month))
    .limit(12);

  return { ...ws, owner, members, businesses: workspaceBusinesses, subscription: sub, usage };
}

export async function getGlobalUsageStats() {
  if (!db) return { totalReviewsManaged: 0, totalAiReplies: 0, totalManualReplies: 0 };

  const [reviewsManaged] = await db.select({ count: count() }).from(reviews);
  const [aiReplies] = await db
    .select({ count: count() })
    .from(reviewReplies)
    .where(eq(reviewReplies.source, "ai"));
  const [manualReplies] = await db
    .select({ count: count() })
    .from(reviewReplies)
    .where(eq(reviewReplies.source, "manual"));

  return {
    totalReviewsManaged: reviewsManaged?.count ?? 0,
    totalAiReplies: aiReplies?.count ?? 0,
    totalManualReplies: manualReplies?.count ?? 0,
  };
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export async function getAllPlatformSettings() {
  if (!db) return [];
  const { platformSettings } = await import("@/lib/db/schema");
  return db.select().from(platformSettings);
}

export async function upsertPlatformSetting(key: string, value: string, description?: string) {
  if (!db) return;
  const { platformSettings } = await import("@/lib/db/schema");
  await db
    .insert(platformSettings)
    .values({ key, value, description })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
}

export async function deletePlatformSetting(key: string) {
  if (!db) return;
  const { platformSettings } = await import("@/lib/db/schema");
  await db.delete(platformSettings).where(eq(platformSettings.key, key));
}
