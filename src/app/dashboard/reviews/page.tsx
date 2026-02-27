"use client";

import { useState, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";

/* ─── Types ──────────────────────────────────────────────── */
type Status = "pending" | "auto" | "manual";

interface Review {
  id: number;
  author: string;
  initials: string;
  avatarColor: string;
  rating: number;
  date: string;
  text: string;
  reply: string | null;
  status: Status;
}

/* ─── Mock data ──────────────────────────────────────────── */
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    author: "Sarah Mitchell",
    initials: "SM",
    avatarColor: "#7C3AED",
    rating: 5,
    date: "2 days ago",
    text: "Absolutely fantastic service! The team was incredibly professional and responsive. I've been coming here for over a year and they never disappoint. Highly recommend to anyone looking for quality.",
    reply: null,
    status: "pending",
  },
  {
    id: 2,
    author: "James Thornton",
    initials: "JT",
    avatarColor: "#0284C7",
    rating: 4,
    date: "5 days ago",
    text: "Great experience overall. The staff were friendly and the quality was excellent. Only minor thing was the wait time was a bit longer than expected, but completely worth it.",
    reply: "Thank you for your kind words, James! We appreciate the feedback on wait times and are always working to improve. Hope to see you again soon!",
    status: "auto",
  },
  {
    id: 3,
    author: "Maria Gonzalez",
    initials: "MG",
    avatarColor: "#DC2626",
    rating: 2,
    date: "1 week ago",
    text: "I was really disappointed with my visit. The service was slow and when I asked for help the staff seemed disinterested. I've had much better experiences elsewhere.",
    reply: null,
    status: "pending",
  },
  {
    id: 4,
    author: "Tom Becker",
    initials: "TB",
    avatarColor: "#059669",
    rating: 5,
    date: "1 week ago",
    text: "Outstanding from start to finish. Everything was exactly as described and the team went above and beyond to make sure I was happy. Will definitely be back.",
    reply: "Tom, thank you so much! Your kind words mean everything to us. We look forward to seeing you again!",
    status: "manual",
  },
  {
    id: 5,
    author: "Linda Park",
    initials: "LP",
    avatarColor: "#D97706",
    rating: 3,
    date: "2 weeks ago",
    text: "Decent service but nothing that really stood out. The price point is reasonable but I think there is room to improve on the overall experience and attention to detail.",
    reply: "Thank you for your honest feedback, Linda! We are always looking to improve and your input helps us do exactly that. We hope to give you a five-star experience next time!",
    status: "auto",
  },
  {
    id: 6,
    author: "Alex Chen",
    initials: "AC",
    avatarColor: "#0891B2",
    rating: 5,
    date: "2 weeks ago",
    text: "One of the best experiences I've had in a long time. The attention to detail was impressive and the whole team made me feel valued as a customer.",
    reply: null,
    status: "pending",
  },
  {
    id: 7,
    author: "Rachel Simmons",
    initials: "RS",
    avatarColor: "#BE123C",
    rating: 1,
    date: "3 weeks ago",
    text: "Very poor experience. I had to wait almost an hour and when I finally got seen, the issue wasn't even properly resolved. I left more frustrated than when I arrived.",
    reply: "Dear Rachel, we are truly sorry to hear about your experience. Please contact us directly and we will do everything we can to make this right.",
    status: "manual",
  },
  {
    id: 8,
    author: "David Kumar",
    initials: "DK",
    avatarColor: "#7C3AED",
    rating: 4,
    date: "3 weeks ago",
    text: "Really good service and the team was knowledgeable and helpful. The whole process was smooth and efficient. A small suggestion would be to improve the parking situation.",
    reply: null,
    status: "pending",
  },
];

const STATUS_TABS: { key: Status | "all"; label: string }[] = [
  { key: "pending", label: "Pending approval" },
  { key: "auto",    label: "Auto posted" },
  { key: "manual",  label: "Replied Manually" },
];

/* ─── Star renderer ──────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" width="13" height="13"
          viewBox="0 0 24 24" aria-hidden="true"
          fill={s <= rating ? "#FFD700" : "none"}
          stroke={s <= rating ? "#FFD700" : "#555"}
          strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
    },
    auto: {
      label: "Auto Posted",
      className: "bg-[#00FFE9]/15 text-[#00FFE9] border border-[#00FFE9]/25",
    },
    manual: {
      label: "Replied Manually",
      className: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    },
  };
  const { label, className } = map[status];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${className}`}>
      {label}
    </span>
  );
}

/* ─── Review card ────────────────────────────────────────── */
function ReviewCard({
  review,
  onApprove,
  onReject,
}: {
  review: Review;
  onApprove: (id: number, reply: string) => void;
  onReject: (id: number) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.reply ?? "");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review: review.text,
          reviewerName: review.author,
          starRating: review.rating,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplyText(data.reply);
        setReplyOpen(true);
      }
    } catch {
      /* silent */
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-[#ffffff10] p-5 md:p-6 transition-all"
      style={{ background: "rgba(11,9,10,0.45)" }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ background: review.avatarColor }}
        >
          {review.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-white">{review.author}</span>
            <span className="text-gray-500 text-xs">{review.date}</span>
          </div>
          <Stars rating={review.rating} />
        </div>

        <StatusBadge status={review.status} />
      </div>

      {/* Review text */}
      <p className="text-gray-300 text-sm leading-relaxed mt-4">{review.text}</p>

      {/* Existing reply */}
      {review.reply && !replyOpen && (
        <div className="mt-4 pl-4 border-l-2 border-[#00FFE940]">
          <p className="text-xs text-[#00FFE9] font-medium mb-1">
            {review.status === "auto" ? "Auto reply" : "Your reply"}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">{review.reply}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {/* Pending-specific actions */}
        {review.status === "pending" && (
          <>
            <button
              onClick={() => onApprove(review.id, replyText)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00FFE920] border border-[#00FFE940] text-[#00FFE9] hover:bg-[#00FFE930] transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Approve & Post
            </button>
            <button
              onClick={() => onReject(review.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
              Dismiss
            </button>
          </>
        )}

        {/* Reply / Edit */}
        <button
          onClick={() => setReplyOpen(!replyOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#ffffff20] text-gray-300 hover:text-[#00FFE9] hover:border-[#00FFE930] transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {review.reply ? "Edit Reply" : "Write Reply"}
        </button>

        {/* AI generate */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00FFE930] text-[#00FFE9] hover:bg-[#00FFE910] transition-colors cursor-pointer disabled:opacity-50"
        >
          {generating ? (
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
            </svg>
          )}
          {generating ? "Generating…" : "AI Generate"}
        </button>
      </div>

      {/* Reply textarea */}
      {replyOpen && (
        <div className="mt-4 space-y-2">
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply here…"
            className="w-full rounded-xl p-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#00FFE9]"
            style={{
              background: "rgba(11,9,10,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReplyOpen(false)}
              className="px-4 py-1.5 rounded-full text-xs font-medium border border-[#ffffff20] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApprove(review.id, replyText);
                setReplyOpen(false);
              }}
              disabled={!replyText.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-black transition-colors cursor-pointer disabled:opacity-40"
              style={{ background: "linear-gradient(to right, #00FFE9, #00B4D8)" }}
            >
              Post Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const matchesTab = r.status === activeTab;
      const matchesSearch =
        !search.trim() ||
        r.author.toLowerCase().includes(search.toLowerCase()) ||
        r.text.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [reviews, activeTab, search]);

  /* counts per tab */
  const counts = useMemo(
    () => ({
      pending: reviews.filter((r) => r.status === "pending").length,
      auto:    reviews.filter((r) => r.status === "auto").length,
      manual:  reviews.filter((r) => r.status === "manual").length,
    }),
    [reviews]
  );

  function handleApprove(id: number, reply: string) {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "manual", reply: reply || r.reply } : r
      )
    );
  }

  function handleReject(id: number) {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <DashboardShell activeHref="/dashboard/reviews">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#1f1f1f] p-6 md:p-10 h-[calc(100vh-120px)] flex flex-col backdrop-blur-[80px]"
          style={{
            background: "rgba(11,9,10,0.2)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          {/* Heading */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-medium">Status Filters</h2>
          </div>

          {/* Search */}
          <div
            className="flex items-center rounded-full px-4 py-2.5 mb-6 gap-2"
            style={{
              background: "rgba(11,9,10,0.2)",
              border: "1px solid #2A2A2A",
            }}
          >
            <input
              placeholder="Search"
              className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-gray-400 flex-shrink-0" aria-hidden="true">
              <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
            </svg>
          </div>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-3 mb-8">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = counts[tab.key as Status];
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as Status); setSearch(""); }}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-[#00FFE9]/20 text-[#00FFE9]"
                      : "bg-[#0B090A] text-gray-400 border border-[#1f1f1f] hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#00FFE9]/20 text-[#00FFE9]"
                        : "bg-[#1f1f1f] text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reviews list — scrollable */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-gray-600 mb-4" aria-hidden="true">
                  <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-gray-500 text-sm">
                  {search
                    ? `No "${activeTab}" reviews match "${search}"`
                    : "No reviews found."}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-2 text-xs text-[#00FFE9] hover:underline cursor-pointer"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filtered.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>

          {/* Bottom summary */}
          {filtered.length > 0 && (
            <div className="pt-4 mt-2 border-t border-[#ffffff0a] flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {filtered.length} {activeTab === "pending" ? "pending" : activeTab === "auto" ? "auto-posted" : "manually replied"} review{filtered.length !== 1 ? "s" : ""}
              </span>
              {activeTab === "pending" && filtered.length > 0 && (
                <button
                  onClick={() => {
                    filtered.forEach((r) => handleApprove(r.id, r.reply ?? ""));
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[#00FFE920] border border-[#00FFE940] text-[#00FFE9] hover:bg-[#00FFE930] transition-colors cursor-pointer"
                >
                  Approve All
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
