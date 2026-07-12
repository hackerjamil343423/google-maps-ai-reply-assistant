import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { getAccessibleBusinessIds } from "@/lib/business-access";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
  fetchReviewPage,
  fetchReviewSummary,
  type ReviewUiStatus,
  type SortBy,
  type StatusFilter,
} from "@/lib/reviews/list-query";
import { ensureWorkspaceForUser } from "@/lib/workspace";

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

function emptyResponse(args: {
  page: number;
  perPage: number;
  googleConnected: boolean;
}) {
  return {
    reviews: [],
    summary: {
      total: 0,
      avgRating: 0,
      replied: 0,
      pending: 0,
      counts: { pending: 0, auto: 0, manual: 0 },
    },
    pagination: {
      page: args.page,
      perPage: args.perPage,
      total: 0,
      totalPages: 1,
    },
    googleConnected: args.googleConnected,
  };
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(emptyResponse({ page: 1, perPage: 10, googleConnected: false }));
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
  const ratingLte = ratingLteParam
    ? Math.min(Math.max(Number.parseInt(ratingLteParam, 10), 1), 5)
    : null;

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
    return NextResponse.json(emptyResponse({ page, perPage, googleConnected }));
  }

  const firstPageRows = await fetchReviewPage(db, {
    businessIds,
    status,
    search,
    ratingLte,
    sortBy,
    page,
    perPage,
  });
  const total = Number(firstPageRows[0]?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const clampedPage = Math.min(page, totalPages);
  const pageRows =
    clampedPage === page
      ? firstPageRows
      : await fetchReviewPage(db, {
          businessIds,
          status,
          search,
          ratingLte,
          sortBy,
          page: clampedPage,
          perPage,
        });
  const summary = await fetchReviewSummary(db, { businessIds });

  return NextResponse.json({
    reviews: pageRows.map((item) => {
      const reply =
        item.replyId && item.replyContent && item.replySource && item.replyStatus
          ? {
              id: item.replyId,
              content: item.replyContent,
              source: item.replySource,
              status: item.replyStatus,
              postedAt: item.replyPostedAt
                ? new Date(item.replyPostedAt).toISOString()
                : null,
            }
          : null;
      return {
        id: item.id,
        authorName: item.authorName,
        initials: getInitials(item.authorName),
        rating: Number(item.rating),
        text: item.text,
        reviewedAt: new Date(item.reviewedAt).toISOString(),
        status: item.status as ReviewUiStatus,
        reply,
      };
    }),
    summary: {
      total: summary.total,
      avgRating: summary.avgRating,
      replied: summary.counts.auto + summary.counts.manual,
      pending: summary.counts.pending,
      counts: summary.counts,
    },
    pagination: {
      page: clampedPage,
      perPage,
      total,
      totalPages,
    },
    analytics: {
      fiveStarPct: summary.fiveStarPct,
      monthly: summary.monthly,
      ratingDist: summary.ratingDist,
    },
    googleConnected,
  });
}
