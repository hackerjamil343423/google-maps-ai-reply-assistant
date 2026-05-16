import { db } from "@/lib/db";
import {
  sql,
  eq,
  desc,
  count,
  and,
  inArray,
  ilike,
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
  blogPosts,
  blogCategories,
  blogTags,
  blogPostTags,
  blogSeoSettings,
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

// ─── Blog Posts ────────────────────────────────────────────────────────────────

export async function getBlogPostsPage(params: {
  search?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}) {
  if (!db) return { posts: [], total: 0 };

  const { search, status, categoryId, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(
      sql`(${blogPosts.title} ILIKE ${`%${search}%`} OR ${blogPosts.excerpt} ILIKE ${`%${search}%`})`
    );
  }
  if (status) {
    conditions.push(eq(blogPosts.status, status as "draft" | "published" | "archived"));
  }
  if (categoryId) {
    conditions.push(eq(blogPosts.categoryId, categoryId));
  }

  const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const rows = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      coverImage: blogPosts.coverImage,
      status: blogPosts.status,
      categoryId: blogPosts.categoryId,
      authorId: blogPosts.authorId,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      authorName: user.name,
      categoryName: blogCategories.name,
    })
    .from(blogPosts)
    .leftJoin(user, eq(blogPosts.authorId, user.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(whereClause ?? sql`true`)
    .orderBy(desc(blogPosts.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(blogPosts)
    .where(whereClause ?? sql`true`);

  return { posts: rows, total: totalResult?.count ?? 0 };
}

export async function getBlogPostById(id: string) {
  if (!db) return null;

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!post) return null;

  const tags = await db
    .select({ id: blogTags.id, name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, id));

  return { ...post, tags };
}

export async function createBlogPost(data: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  categoryId?: string;
  authorId: string;
  status?: "draft" | "published";
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  tagIds?: string[];
}) {
  if (!db) return null;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt ?? null,
      coverImage: data.coverImage ?? null,
      categoryId: data.categoryId ?? null,
      authorId: data.authorId,
      status: data.status ?? "draft",
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      ogImage: data.ogImage ?? null,
      publishedAt: data.status === "published" ? new Date() : null,
    })
    .returning();

  if (data.tagIds && data.tagIds.length > 0 && post) {
    await db.insert(blogPostTags).values(
      data.tagIds.map((tagId) => ({ postId: post.id, tagId }))
    );
  }

  return post;
}

export async function updateBlogPost(
  id: string,
  data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    coverImage?: string;
    categoryId?: string | null;
    status?: "draft" | "published" | "archived";
    seoTitle?: string;
    seoDescription?: string;
    ogImage?: string;
    tagIds?: string[];
  }
) {
  if (!db) return null;

  const [post] = await db
    .update(blogPosts)
    .set({
      ...data,
      categoryId: data.categoryId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id))
    .returning();

  if (data.tagIds !== undefined) {
    await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
    if (data.tagIds.length > 0) {
      await db.insert(blogPostTags).values(
        data.tagIds.map((tagId) => ({ postId: id, tagId }))
      );
    }
  }

  return post;
}

export async function toggleBlogPostPublish(id: string) {
  if (!db) return null;

  const [current] = await db
    .select({ status: blogPosts.status })
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!current) return null;

  const newStatus = current.status === "published" ? "draft" : "published";

  const [post] = await db
    .update(blogPosts)
    .set({
      status: newStatus,
      publishedAt: newStatus === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id))
    .returning();

  return post;
}

export async function deleteBlogPost(id: string) {
  if (!db) return;
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

// ─── Blog Categories ───────────────────────────────────────────────────────────

export async function getAllBlogCategories() {
  if (!db) return [];

  const cats = await db
    .select({
      id: blogCategories.id,
      name: blogCategories.name,
      slug: blogCategories.slug,
      description: blogCategories.description,
      createdAt: blogCategories.createdAt,
    })
    .from(blogCategories)
    .orderBy(blogCategories.name);

  const counts = await db
    .select({ categoryId: blogPosts.categoryId, count: count() })
    .from(blogPosts)
    .where(eq(blogPosts.categoryId, sql`${blogPosts.categoryId}`))
    .groupBy(blogPosts.categoryId);

  const countMap = new Map(counts.map((r) => [r.categoryId, r.count]));

  return cats.map((c) => ({ ...c, postCount: countMap.get(c.id) ?? 0 }));
}

export async function createBlogCategory(data: { name: string; slug: string; description?: string }) {
  if (!db) return null;
  const [cat] = await db
    .insert(blogCategories)
    .values({ name: data.name, slug: data.slug, description: data.description ?? null })
    .returning();
  return cat;
}

export async function updateBlogCategory(id: string, data: { name?: string; slug?: string; description?: string }) {
  if (!db) return null;
  const [cat] = await db
    .update(blogCategories)
    .set(data)
    .where(eq(blogCategories.id, id))
    .returning();
  return cat;
}

export async function deleteBlogCategory(id: string) {
  if (!db) return;
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
}

// ─── Blog Tags ─────────────────────────────────────────────────────────────────

export async function getAllBlogTags() {
  if (!db) return [];

  const tags = await db
    .select({
      id: blogTags.id,
      name: blogTags.name,
      slug: blogTags.slug,
      createdAt: blogTags.createdAt,
    })
    .from(blogTags)
    .orderBy(blogTags.name);

  const counts = await db
    .select({ tagId: blogPostTags.tagId, count: count() })
    .from(blogPostTags)
    .groupBy(blogPostTags.tagId);

  const countMap = new Map(counts.map((r) => [r.tagId, r.count]));

  return tags.map((t) => ({ ...t, postCount: countMap.get(t.id) ?? 0 }));
}

export async function createBlogTag(data: { name: string; slug: string }) {
  if (!db) return null;
  const [tag] = await db
    .insert(blogTags)
    .values({ name: data.name, slug: data.slug })
    .returning();
  return tag;
}

export async function updateBlogTag(id: string, data: { name?: string; slug?: string }) {
  if (!db) return null;
  const [tag] = await db
    .update(blogTags)
    .set(data)
    .where(eq(blogTags.id, id))
    .returning();
  return tag;
}

export async function deleteBlogTag(id: string) {
  if (!db) return;
  await db.delete(blogPostTags).where(eq(blogPostTags.tagId, id));
  await db.delete(blogTags).where(eq(blogTags.id, id));
}

// ─── Blog SEO Settings ─────────────────────────────────────────────────────────

export async function getBlogSeoSettings() {
  if (!db) return null;
  const [settings] = await db
    .select()
    .from(blogSeoSettings)
    .where(eq(blogSeoSettings.id, "1"))
    .limit(1);
  return settings ?? null;
}

export async function upsertBlogSeoSettings(data: {
  siteTitle?: string;
  siteDescription?: string;
  ogImage?: string;
  twitterHandle?: string;
  googleAnalyticsId?: string;
  robotsTxt?: string;
  structuredDataJson?: string;
}) {
  if (!db) return null;
  const [settings] = await db
    .insert(blogSeoSettings)
    .values({ id: "1", ...data })
    .onConflictDoUpdate({
      target: blogSeoSettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return settings;
}
