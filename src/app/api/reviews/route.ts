import { desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { getAccessibleBusinessIds } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses, reviewReplies, reviews } from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/workspace";

type ReviewUiStatus = "pending" | "auto" | "manual";
type SortBy = "relevant" | "newest" | "lowest" | "rating";
type StatusFilter = "all" | ReviewUiStatus;

interface LatestReplyRecord {
  id: string;
  reviewId: string;
  content: string;
  source: "ai" | "manual";
  status: "draft" | "approved" | "posted" | "failed";
  createdAt: Date;
  postedAt: Date | null;
}

function toUiStatus(reply: LatestReplyRecord | null): ReviewUiStatus {
  if (!reply || reply.status !== "posted") {
    return "pending";
  }
  if (reply.source === "ai") {
    return "auto";
  }
  return "manual";
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num) || num < 1) return fallback;
  return num;
}

function getInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "NA";
  const initials = cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return initials || "NA";
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({
      reviews: [],
      summary: {
        total: 0,
        avgRating: 0,
        replied: 0,
        pending: 0,
        counts: { pending: 0, auto: 0, manual: 0 },
      },
      pagination: {
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
      },
      googleConnected: false,
    });
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

  const searchParams = req.nextUrl.searchParams;
  const businessIdFilter = searchParams.get("businessId") || null;
  const statusParam = (searchParams.get("status") || "all").toLowerCase();
  const sortParam = (searchParams.get("sort") || "relevant").toLowerCase();

  const status = (["all", "pending", "auto", "manual"] as const).includes(
    statusParam as StatusFilter
  )
    ? (statusParam as StatusFilter)
    : "all";

  const sortBy = (["relevant", "newest", "lowest", "rating"] as const).includes(
    sortParam as SortBy
  )
    ? (sortParam as SortBy)
    : "relevant";

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const perPage = Math.min(parsePositiveInt(searchParams.get("per_page"), 10), 500);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const ratingLteParam = searchParams.get("rating_lte");
  const ratingLte = ratingLteParam ? Math.min(Math.max(Number.parseInt(ratingLteParam, 10), 1), 5) : null;

  const workspaceBusinesses = await db.query.businesses.findMany({
    where: eq(businesses.workspaceId, workspaceId),
    columns: { id: true, status: true, googleLocationId: true },
  });
  const accessibleBusinessIds = await getAccessibleBusinessIds(
    workspaceId,
    session.user.id
  );

  const activeWorkspaceBusinesses = workspaceBusinesses.filter(
    (item) =>
      item.status === "active" &&
      Boolean(item.googleLocationId) &&
      accessibleBusinessIds.includes(item.id)
  );
  const allBusinessIds = activeWorkspaceBusinesses.map((item) => item.id);
  const businessIds = businessIdFilter
    ? allBusinessIds.filter((id) => id === businessIdFilter)
    : allBusinessIds;
  const googleConnected = activeWorkspaceBusinesses.length > 0;

  if (businessIds.length === 0) {
    return NextResponse.json({
      reviews: [],
      summary: {
        total: 0,
        avgRating: 0,
        replied: 0,
        pending: 0,
        counts: { pending: 0, auto: 0, manual: 0 },
      },
      pagination: {
        page,
        perPage,
        total: 0,
        totalPages: 1,
      },
      googleConnected,
    });
  }

  const reviewRows = await db.query.reviews.findMany({
    where: inArray(reviews.businessId, businessIds),
    orderBy: [desc(reviews.reviewedAt)],
  });

  const reviewIds = reviewRows.map((item) => item.id);
  const latestReplies = new Map<string, LatestReplyRecord>();

  if (reviewIds.length > 0) {
    const replyRows = await db
      .select({
        id: reviewReplies.id,
        reviewId: reviewReplies.reviewId,
        content: reviewReplies.content,
        source: reviewReplies.source,
        status: reviewReplies.status,
        createdAt: reviewReplies.createdAt,
        postedAt: reviewReplies.postedAt,
      })
      .from(reviewReplies)
      .where(inArray(reviewReplies.reviewId, reviewIds))
      .orderBy(desc(reviewReplies.createdAt));

    for (const row of replyRows) {
      if (!latestReplies.has(row.reviewId)) {
        latestReplies.set(row.reviewId, row);
      }
    }
  }

  const normalized = reviewRows.map((item) => {
    const latestReply = latestReplies.get(item.id) ?? null;
    const statusValue = toUiStatus(latestReply);
    return {
      id: item.id,
      authorName: item.authorName,
      initials: getInitials(item.authorName),
      rating: item.rating,
      text: item.text,
      reviewedAt: item.reviewedAt,
      status: statusValue,
      reply: latestReply
        ? {
            id: latestReply.id,
            content: latestReply.content,
            source: latestReply.source,
            status: latestReply.status,
            postedAt: latestReply.postedAt,
          }
        : null,
    };
  });

  const counts = normalized.reduce(
    (acc, item) => {
      if (item.status === "pending") acc.pending += 1;
      if (item.status === "auto") acc.auto += 1;
      if (item.status === "manual") acc.manual += 1;
      return acc;
    },
    { pending: 0, auto: 0, manual: 0 }
  );

  let filtered = normalized.filter((item) => {
    if (status !== "all" && item.status !== status) {
      return false;
    }

    if (ratingLte && item.rating > ratingLte) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = `${item.authorName} ${item.text} ${item.reply?.content ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });

  filtered = filtered.sort((a, b) => {
    if (sortBy === "lowest") {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return b.reviewedAt.getTime() - a.reviewedAt.getTime();
    }

    if (sortBy === "rating") {
      if (a.rating !== b.rating) return b.rating - a.rating;
      return b.reviewedAt.getTime() - a.reviewedAt.getTime();
    }

    return b.reviewedAt.getTime() - a.reviewedAt.getTime();
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  const totalReviews = normalized.length;
  const ratingSum = normalized.reduce((sum, item) => sum + item.rating, 0);
  const avgRating = totalReviews ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

  // ── Analytics computations (over ALL reviews, not paginated subset) ──
  const fiveStarCount = normalized.filter((item) => item.rating === 5).length;
  const fiveStarPct = totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0;

  const monthMeta = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (11 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, total: 0, replied: 0 };
  });
  const monthIndexByKey = new Map(monthMeta.map((item, index) => [item.key, index]));

  for (const item of normalized) {
    const reviewedDate = new Date(item.reviewedAt);
    if (Number.isNaN(reviewedDate.getTime())) continue;
    const key = `${reviewedDate.getFullYear()}-${String(reviewedDate.getMonth() + 1).padStart(2, "0")}`;
    const monthIndex = monthIndexByKey.get(key);
    if (monthIndex === undefined) continue;
    monthMeta[monthIndex].total += 1;
    if (item.status === "auto" || item.status === "manual") {
      monthMeta[monthIndex].replied += 1;
    }
  }

  const ratingCounts = new Map<number, number>();
  for (const item of normalized) {
    ratingCounts.set(item.rating, (ratingCounts.get(item.rating) || 0) + 1);
  }

  return NextResponse.json({
    reviews: paginated.map((item) => ({
      id: item.id,
      authorName: item.authorName,
      initials: item.initials,
      rating: item.rating,
      text: item.text,
      reviewedAt: item.reviewedAt.toISOString(),
      status: item.status,
      reply: item.reply
        ? {
            id: item.reply.id,
            content: item.reply.content,
            source: item.reply.source,
            status: item.reply.status,
            postedAt: item.reply.postedAt ? item.reply.postedAt.toISOString() : null,
          }
        : null,
    })),
    summary: {
      total: totalReviews,
      avgRating,
      replied: counts.auto + counts.manual,
      pending: counts.pending,
      counts,
    },
    pagination: {
      page: clampedPage,
      perPage,
      total,
      totalPages,
    },
    analytics: {
      fiveStarPct,
      monthly: monthMeta.map((m) => ({ total: m.total, replied: m.replied })),
      ratingDist: [5, 4, 3, 2, 1].map((stars) => {
        const count = ratingCounts.get(stars) || 0;
        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        return { stars, count, pct };
      }),
    },
    googleConnected,
  });
}
