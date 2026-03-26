"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardShell from "@/components/DashboardShell";

type Status = "pending" | "auto" | "manual";

type ReviewItem = {
  id: string;
  authorName: string;
  initials: string;
  rating: number;
  text: string;
  reviewedAt: string;
  status: Status;
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
    counts: {
      pending: number;
      auto: number;
      manual: number;
    };
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "Pending approval" },
  { key: "auto", label: "Auto posted" },
  { key: "manual", label: "Replied manually" },
];

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
          width="13"
          height="13"
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

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
    },
    auto: {
      label: "Auto posted",
      className: "bg-[#5F30EB]/15 text-[#5F30EB] border border-[#5F30EB]/25",
    },
    manual: {
      label: "Replied manually",
      className: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    },
  };

  const item = map[status];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${item.className}`}>
      {item.label}
    </span>
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
  const [loadingAction, setLoadingAction] = useState<"generate" | "save" | "post" | "dismiss" | null>(null);

  useEffect(() => {
    setReplyText(review.reply?.content ?? "");
  }, [review.reply?.content]);

  async function handleGenerate() {
    setLoadingAction("generate");
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
      setLoadingAction(null);
    }
  }

  async function handleSave() {
    if (!replyText.trim()) return;

    setLoadingAction("save");
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
      setLoadingAction(null);
    }
  }

  async function handlePost() {
    if (!replyText.trim()) return;

    setLoadingAction("post");
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
      setLoadingAction(null);
    }
  }

  async function handleDismiss() {
    setLoadingAction("dismiss");
    try {
      const res = await fetch(`/api/reviews/${review.id}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        await onRefresh();
      }
    } finally {
      setLoadingAction(null);
    }
  }

  const busy = loadingAction !== null;

  return (
    <div
      className="rounded-2xl border border-[#5F30EB20] p-5 md:p-6 transition-all"
      style={{ background: "rgba(255,255,255,0.94)" }}
    >
      <div className="flex items-start gap-3">
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

        <StatusBadge status={review.status} />
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
        {review.status === "pending" && (
          <>
            <button
              onClick={handlePost}
              disabled={busy || !replyText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#5F30EB20] border border-[#5F30EB40] text-[#5F30EB] hover:bg-[#5F30EB30] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "post" ? "Posting..." : "Approve & Post"}
            </button>
            <button
              onClick={handleDismiss}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "dismiss" ? "Dismissing..." : "Dismiss"}
            </button>
          </>
        )}

        <button
          onClick={() => setReplyOpen((prev) => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5F30EB20] text-[#4F4F63] hover:text-[#5F30EB] hover:border-[#5F30EB30] transition-colors cursor-pointer"
        >
          {review.reply ? "Edit reply" : "Write reply"}
        </button>

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5F30EB30] text-[#5F30EB] hover:bg-[#5F30EB10] transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingAction === "generate" ? "Generating..." : "AI Generate"}
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
              border: "1px solid rgba(255,255,255,0.12)",
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
              disabled={busy || !replyText.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-black transition-colors cursor-pointer disabled:opacity-40"
              style={{ background: "linear-gradient(to right, #5F30EB, #00E0FF)" }}
            >
              {loadingAction === "save" ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReviewsApiResponse | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", activeTab);
    params.set("page", "1");
    params.set("per_page", "50");

    if (search.trim()) {
      params.set("search", search.trim());
    }

    return params.toString();
  }, [activeTab, search]);

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

  async function handleApproveAll() {
    const pendingIds = (data?.reviews ?? []).map((item) => item.id);
    if (pendingIds.length === 0) return;

    setLoading(true);
    try {
      await fetch("/api/reviews/bulk/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewIds: pendingIds }),
      });
      await loadReviews();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const counts = data?.summary.counts ?? { pending: 0, auto: 0, manual: 0 };

  return (
    <DashboardShell activeHref="/dashboard/reviews">
      <div className="brand-scrollbar min-h-[70vh] max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Reviews</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">Reply Workflow</h2>
          <p className="mt-2 text-sm text-[#6A6A82]">Review pending items, generated drafts, and posted replies in one wider workspace.</p>
        </div>

        <div
          className="flex items-center rounded-full px-4 py-2.5 mb-6 gap-2 border border-[#E6E9F8] bg-white/80 shadow-sm"
        >
            <input
              placeholder="Search"
              className="flex-1 bg-transparent text-sm text-[#4F4F63] placeholder-gray-500 focus:outline-none"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSearch("");
                  }}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-[#5F30EB]/20 text-[#5F30EB]"
                      : "bg-[#F6F4FF] text-[#6A6A82] border border-[#E6E9F8] hover:text-[#040404]"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#5F30EB]/20 text-[#5F30EB]"
                        : "bg-[#E6E9F8] text-[#8A8AA0]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-[#6A6A82]">Loading reviews...</p>
            ) : data && data.reviews.length > 0 ? (
              data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onRefresh={loadReviews} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[#8A8AA0] text-sm">
                  {search
                    ? `No ${activeTab} reviews match "${search}"`
                    : "No reviews found."}
                </p>
              </div>
            )}
        </div>

        {activeTab === "pending" && (data?.reviews.length ?? 0) > 0 && (
          <div className="pt-4 mt-6 border-t border-[#5F30EB14] flex items-center justify-between text-xs text-[#8A8AA0]">
              <span>
                Showing {data?.reviews.length ?? 0} pending review{(data?.reviews.length ?? 0) !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleApproveAll}
                disabled={loading}
                className="px-3 py-1 rounded-full text-xs font-medium bg-[#5F30EB20] border border-[#5F30EB40] text-[#5F30EB] hover:bg-[#5F30EB30] transition-colors cursor-pointer disabled:opacity-50"
              >
                Approve All
              </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

