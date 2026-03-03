"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DashboardShell from "@/components/DashboardShell";

type ReviewStatus = "pending" | "auto" | "manual";

type ReviewItem = {
  id: string;
  authorName: string;
  initials: string;
  rating: number;
  text: string;
  reviewedAt: string;
  status: ReviewStatus;
  reply: {
    id: string;
    content: string;
    source: "ai" | "manual";
    status: "draft" | "approved" | "posted" | "failed";
    postedAt: string | null;
  } | null;
};

type ReviewsApiResponse = {
  reviews: ReviewItem[];
  summary: {
    total: number;
    avgRating: number;
    replied: number;
    pending: number;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  googleConnected: boolean;
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill={star <= rating ? "#FFD700" : "none"}
          stroke={star <= rating ? "#FFD700" : "#555"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onRefresh,
}: {
  review: ReviewItem;
  onRefresh: () => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.reply?.content ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setReplyText(review.reply?.content ?? "");
  }, [review.reply?.content]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { reply?: string };
      if (res.ok && json.reply) {
        setReplyText(json.reply);
        setReplyOpen(true);
        await onRefresh();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!replyText.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          source: review.reply?.source ?? "manual",
        }),
      });

      if (res.ok) {
        setReplyOpen(false);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePost() {
    if (!replyText.trim()) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          source: review.reply?.source ?? "manual",
        }),
      });

      if (res.ok) {
        setReplyOpen(false);
        await onRefresh();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-[#5F30EB26] p-5 md:p-6 transition-all"
      style={{ background: "rgba(255,255,255,0.92)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#040404] font-semibold text-sm flex-shrink-0"
          style={{ background: "#1f3a44" }}
        >
          {review.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-[#040404]">{review.authorName}</span>
            <span className="text-[#8A8AA0] text-xs">{formatDate(review.reviewedAt)}</span>
          </div>
          <Stars rating={review.rating} />
        </div>

        <div
          className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
            review.reply?.status === "posted"
              ? "bg-[#5F30EB20] text-[#5F30EB] border border-[#5F30EB30]"
              : "bg-[#5F30EB18] text-[#6A6A82] border border-[#5F30EB26]"
          }`}
        >
          {review.reply?.status === "posted" ? "Replied" : "Pending"}
        </div>
      </div>

      <p className="text-[#4F4F63] text-sm leading-relaxed mt-4">{review.text}</p>

      {review.reply && !replyOpen && (
        <div className="mt-4 pl-4 border-l-2 border-[#5F30EB40]">
          <p className="text-xs text-[#5F30EB] font-medium mb-1">
            {review.reply.status === "posted" ? "Posted reply" : "Draft reply"}
          </p>
          <p className="text-[#6A6A82] text-sm leading-relaxed">{review.reply.content}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => setReplyOpen((prev) => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5F30EB20] text-[#4F4F63] hover:text-[#5F30EB] hover:border-[#5F30EB30] transition-colors cursor-pointer"
        >
          {review.reply ? "Edit Reply" : "Write Reply"}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5F30EB30] text-[#5F30EB] hover:bg-[#5F30EB10] transition-colors cursor-pointer disabled:opacity-50"
        >
          {generating ? "Generating..." : "AI Generate"}
        </button>

        <button
          onClick={handlePost}
          disabled={posting || !replyText.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#5F30EB20] border border-[#5F30EB40] text-[#5F30EB] hover:bg-[#5F30EB30] transition-colors cursor-pointer disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post Reply"}
        </button>
      </div>

      {replyOpen && (
        <div className="mt-4 space-y-2">
          <textarea
            rows={4}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="Write your reply here..."
            className="w-full rounded-xl p-3 text-sm text-[#3E3E52] placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#5F30EB]"
            style={{
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReplyOpen(false)}
              className="px-4 py-1.5 rounded-full text-xs font-medium border border-[#5F30EB20] text-[#6A6A82] hover:text-[#040404] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !replyText.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-black transition-colors cursor-pointer disabled:opacity-40"
              style={{ background: "linear-gradient(to right, #5F30EB, #00E0FF)" }}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [sortBy, setSortBy] = useState<"relevant" | "newest" | "lowest" | "rating">("relevant");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReviewsApiResponse | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", "all");
    params.set("page", String(page));
    params.set("per_page", "5");
    params.set("sort", sortBy);

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (ratingFilter !== "0") {
      params.set("rating_lte", ratingFilter);
    }

    return params.toString();
  }, [page, sortBy, search, ratingFilter]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/reviews?${queryString}`, {
      cache: "no-store",
    });

    const json = (await res.json()) as ReviewsApiResponse;

    if (!res.ok) {
      setError(json.error || "Failed to load reviews.");
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadReviews]);

  return (
    <DashboardShell activeHref="/dashboard/overview">
      <div className="h-full">
        <div
          className="brand-scrollbar rounded-3xl border border-[#E6E9F8] p-6 md:p-10 h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(255,255,255,0.82)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <h2 className="text-xl md:text-2xl font-medium">Overview</h2>
            {!data?.googleConnected && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-[#5F30EB] text-[#F6F4FF] text-sm font-medium rounded-full hover:opacity-90 transition-opacity self-start sm:self-auto"
              >
                Connect Business Profile
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Reviews", value: data?.summary.total ?? 0, color: "text-[#040404]" },
              { label: "Avg Rating", value: `${data?.summary.avgRating ?? 0} *`, color: "text-yellow-400" },
              { label: "Replied", value: data?.summary.replied ?? 0, color: "text-[#5F30EB]" },
              { label: "Pending", value: data?.summary.pending ?? 0, color: "text-orange-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#5F30EB20] p-4"
                style={{ background: "rgba(255,255,255,0.92)" }}
              >
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[#8A8AA0] text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
            <div className="flex items-center bg-[#F6F4FF33] border border-[#E6E9F8] rounded-full px-4 py-2.5 flex-1 gap-2">
              <input
                placeholder="Search reviews..."
                className="flex-1 bg-transparent text-sm text-[#4F4F63] placeholder-gray-500 focus:outline-none"
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="relative flex-1 md:flex-none">
              <select
                value={ratingFilter}
                onChange={(event) => {
                  setRatingFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full md:w-[160px] px-4 py-3 pr-10 rounded-lg border border-[#E6E9F8] text-[#4F4F63] font-medium focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 appearance-none cursor-pointer transition-all hover:border-[#5F30EB]/30"
                style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)" }}
              >
                <option value="0" className="bg-[#F6F4FF]">All Ratings</option>
                <option value="1" className="bg-[#F6F4FF]">1 Star and below</option>
                <option value="2" className="bg-[#F6F4FF]">2 Stars and below</option>
                <option value="3" className="bg-[#F6F4FF]">3 Stars and below</option>
                <option value="4" className="bg-[#F6F4FF]">4 Stars and below</option>
                <option value="5" className="bg-[#F6F4FF]">5 Stars and below</option>
              </select>
            </div>

            <div className="relative flex-1 md:flex-none">
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as "relevant" | "newest" | "lowest" | "rating");
                  setPage(1);
                }}
                className="w-full md:w-[160px] px-4 py-3 pr-10 rounded-lg border border-[#E6E9F8] text-[#4F4F63] font-medium focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 appearance-none cursor-pointer transition-all hover:border-[#5F30EB]/30"
                style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)" }}
              >
                <option value="relevant" className="bg-[#F6F4FF]">Most Relevant</option>
                <option value="newest" className="bg-[#F6F4FF]">Most Recent</option>
                <option value="lowest" className="bg-[#F6F4FF]">Lowest Rating</option>
                <option value="rating" className="bg-[#F6F4FF]">Highest Rating</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          {loading ? (
            <p className="text-[#6A6A82] text-sm">Loading reviews...</p>
          ) : data && data.reviews.length > 0 ? (
            <div className="space-y-4">
              {data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onRefresh={loadReviews} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-[#6A6A82] text-lg">No reviews match your filters</p>
              <button
                onClick={() => {
                  setSearch("");
                  setRatingFilter("0");
                  setSortBy("relevant");
                  setPage(1);
                }}
                className="mt-3 text-sm text-[#5F30EB] hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                disabled={data.pagination.page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="px-4 py-2 border border-[#E6E9F8] text-[#4F4F63] rounded-lg hover:bg-[#E6E9F8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                style={{ background: "rgba(255,255,255,0.82)" }}
              >
                Previous
              </button>

              <div className="text-xs text-[#6A6A82]">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </div>

              <button
                disabled={data.pagination.page === data.pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-4 py-2 border border-[#E6E9F8] text-[#4F4F63] rounded-lg hover:bg-[#E6E9F8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                style={{ background: "rgba(255,255,255,0.82)" }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

