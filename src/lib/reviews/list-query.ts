import { sql, type SQL } from "drizzle-orm";

type DbLike = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ReviewUiStatus = "pending" | "auto" | "manual";
export type SortBy = "relevant" | "newest" | "lowest" | "rating";
export type StatusFilter = "all" | ReviewUiStatus;

export type ReviewPageRow = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: Date;
  replyId: string | null;
  replyContent: string | null;
  replySource: "ai" | "manual" | null;
  replyStatus: "draft" | "approved" | "posted" | "failed" | null;
  replyPostedAt: Date | null;
  status: ReviewUiStatus;
  totalCount: number;
};

export type ReviewSummary = {
  total: number;
  avgRating: number;
  counts: { pending: number; auto: number; manual: number };
  monthly: Array<{ total: number; replied: number }>;
  ratingDist: Array<{ stars: number; count: number; pct: number }>;
  fiveStarPct: number;
};

function rowsFromResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function businessIdList(businessIds: string[]) {
  return sql.join(
    businessIds.map((id) => sql`${id}`),
    sql`, `
  );
}

export function escapeSearchTerm(term: string) {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function buildStatusCondition(status: StatusFilter) {
  switch (status) {
    case "pending":
      return sql`(latest.id IS NULL OR latest.status <> 'posted')`;
    case "auto":
      return sql`(latest.status = 'posted' AND latest.source = 'ai')`;
    case "manual":
      return sql`(latest.status = 'posted' AND latest.source = 'manual')`;
    default:
      return sql`true`;
  }
}

export function buildOrderBy(sortBy: SortBy) {
  switch (sortBy) {
    case "lowest":
      return sql`r.rating ASC, r.reviewed_at DESC`;
    case "rating":
      return sql`r.rating DESC, r.reviewed_at DESC`;
    case "newest":
    case "relevant":
    default:
      return sql`r.reviewed_at DESC`;
  }
}

export function buildMonthKeys(now = new Date()) {
  return Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(now);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (11 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function latestReplyJoin() {
  return sql`
    LEFT JOIN LATERAL (
      SELECT rr.id, rr.content, rr.source, rr.status, rr.posted_at, rr.created_at
      FROM review_replies rr
      WHERE rr.review_id = r.id
      ORDER BY rr.created_at DESC
      LIMIT 1
    ) latest ON true
  `;
}

function baseConditions(args: {
  businessIds: string[];
  status?: StatusFilter;
  search?: string;
  ratingLte?: number | null;
}) {
  const conditions: SQL[] = [
    sql`r.business_id IN (${businessIdList(args.businessIds)})`,
    sql`r.dismissed_at IS NULL`,
  ];

  if (args.status && args.status !== "all") {
    conditions.push(buildStatusCondition(args.status));
  }
  if (args.ratingLte) {
    conditions.push(sql`r.rating <= ${args.ratingLte}`);
  }
  if (args.search) {
    const term = `%${escapeSearchTerm(args.search)}%`;
    conditions.push(sql`(
      r.author_name ILIKE ${term} ESCAPE '\\'
      OR r.text ILIKE ${term} ESCAPE '\\'
      OR coalesce(latest.content, '') ILIKE ${term} ESCAPE '\\'
    )`);
  }

  return sql.join(conditions, sql` AND `);
}

export async function fetchReviewPage(
  dbClient: DbLike,
  args: {
    businessIds: string[];
    status: StatusFilter;
    search: string;
    ratingLte: number | null;
    sortBy: SortBy;
    page: number;
    perPage: number;
  }
) {
  const offset = (args.page - 1) * args.perPage;
  const where = baseConditions(args);
  const orderBy = buildOrderBy(args.sortBy);

  const result = await dbClient.execute(sql`
    SELECT
      r.id,
      r.author_name AS "authorName",
      r.rating,
      r.text,
      r.reviewed_at AS "reviewedAt",
      latest.id AS "replyId",
      latest.content AS "replyContent",
      latest.source AS "replySource",
      latest.status AS "replyStatus",
      latest.posted_at AS "replyPostedAt",
      CASE
        WHEN latest.id IS NULL OR latest.status <> 'posted' THEN 'pending'
        WHEN latest.source = 'ai' THEN 'auto'
        ELSE 'manual'
      END AS status,
      count(*) OVER ()::int AS "totalCount"
    FROM reviews r
    ${latestReplyJoin()}
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${args.perPage}
    OFFSET ${offset}
  `);

  return rowsFromResult<ReviewPageRow>(result);
}

export async function fetchReviewSummary(
  dbClient: DbLike,
  args: { businessIds: string[]; now?: Date }
): Promise<ReviewSummary> {
  const where = sql`r.business_id IN (${businessIdList(args.businessIds)}) AND r.dismissed_at IS NULL`;
  const summaryResult = await dbClient.execute(sql`
    SELECT
      count(*)::int AS total,
      coalesce(avg(r.rating), 0)::float AS "avgRating",
      count(*) FILTER (WHERE latest.id IS NULL OR latest.status <> 'posted')::int AS pending,
      count(*) FILTER (WHERE latest.status = 'posted' AND latest.source = 'ai')::int AS auto,
      count(*) FILTER (WHERE latest.status = 'posted' AND latest.source = 'manual')::int AS manual,
      count(*) FILTER (WHERE r.rating = 5)::int AS "fiveStar"
    FROM reviews r
    ${latestReplyJoin()}
    WHERE ${where}
  `);
  const summaryRow = rowsFromResult<{
    total: number;
    avgRating: number;
    pending: number;
    auto: number;
    manual: number;
    fiveStar: number;
  }>(summaryResult)[0] ?? {
    total: 0,
    avgRating: 0,
    pending: 0,
    auto: 0,
    manual: 0,
    fiveStar: 0,
  };

  const monthKeys = buildMonthKeys(args.now);
  const firstMonth = `${monthKeys[0]}-01`;
  const monthlyResult = await dbClient.execute(sql`
    SELECT
      to_char(date_trunc('month', r.reviewed_at), 'YYYY-MM') AS month,
      count(*)::int AS total,
      count(*) FILTER (WHERE latest.status = 'posted')::int AS replied
    FROM reviews r
    ${latestReplyJoin()}
    WHERE ${where} AND r.reviewed_at >= ${firstMonth}::date
    GROUP BY 1
  `);
  const monthlyRows = rowsFromResult<{ month: string; total: number; replied: number }>(
    monthlyResult
  );
  const monthlyByKey = new Map(monthlyRows.map((row) => [row.month, row]));

  const ratingResult = await dbClient.execute(sql`
    SELECT r.rating AS stars, count(*)::int AS count
    FROM reviews r
    WHERE ${where}
    GROUP BY r.rating
  `);
  const ratingRows = rowsFromResult<{ stars: number; count: number }>(ratingResult);
  const ratingByStars = new Map(ratingRows.map((row) => [Number(row.stars), Number(row.count)]));
  const total = Number(summaryRow.total);

  return {
    total,
    avgRating: total ? Number(Number(summaryRow.avgRating).toFixed(1)) : 0,
    counts: {
      pending: Number(summaryRow.pending),
      auto: Number(summaryRow.auto),
      manual: Number(summaryRow.manual),
    },
    fiveStarPct: total ? Math.round((Number(summaryRow.fiveStar) / total) * 100) : 0,
    monthly: monthKeys.map((key) => ({
      total: Number(monthlyByKey.get(key)?.total ?? 0),
      replied: Number(monthlyByKey.get(key)?.replied ?? 0),
    })),
    ratingDist: [5, 4, 3, 2, 1].map((stars) => {
      const count = ratingByStars.get(stars) ?? 0;
      return {
        stars,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      };
    }),
  };
}
