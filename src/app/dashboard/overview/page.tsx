"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

/* ─── Types ──────────────────────────────────────────────── */
interface Review {
  id: number;
  author: string;
  initials: string;
  rating: number;
  date: string;
  text: string;
  reply: string | null;
  avatarColor: string;
}

/* ─── Mock data ──────────────────────────────────────────── */
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    author: "Sarah Mitchell",
    initials: "SM",
    rating: 5,
    date: "2 days ago",
    text: "Absolutely fantastic service! The team was incredibly professional and responsive. I've been coming here for over a year and they never disappoint. Highly recommend to anyone looking for quality and reliability.",
    reply: "Thank you so much for your kind words, Sarah! We truly appreciate your loyalty and it's always a pleasure serving you. Looking forward to seeing you again soon!",
    avatarColor: "#7C3AED",
  },
  {
    id: 2,
    author: "James Thornton",
    initials: "JT",
    rating: 4,
    date: "5 days ago",
    text: "Great experience overall. The staff were friendly and the quality was excellent. Only minor thing was the wait time was a bit longer than expected, but completely worth it in the end.",
    reply: null,
    avatarColor: "#0284C7",
  },
  {
    id: 3,
    author: "Maria Gonzalez",
    initials: "MG",
    rating: 2,
    date: "1 week ago",
    text: "I was really disappointed with my visit. The service was slow and when I asked for help the staff seemed disinterested. I've had much better experiences elsewhere. I hope they can improve.",
    reply: "Dear Maria, we sincerely apologize for the experience you had. This is not the standard we hold ourselves to and we take your feedback very seriously. Please reach out to us directly so we can make this right for you.",
    avatarColor: "#DC2626",
  },
  {
    id: 4,
    author: "Tom Becker",
    initials: "TB",
    rating: 5,
    date: "1 week ago",
    text: "Outstanding from start to finish. Everything was exactly as described and the team went above and beyond to make sure I was happy. Will definitely be back and recommending to all my friends.",
    reply: null,
    avatarColor: "#059669",
  },
  {
    id: 5,
    author: "Linda Park",
    initials: "LP",
    rating: 3,
    date: "2 weeks ago",
    text: "Decent service but nothing that really stood out. It was just okay. The price point is reasonable but I think there is room to improve on the overall experience and attention to detail.",
    reply: "Thank you for your honest feedback, Linda. We appreciate you taking the time to share your thoughts. We are always looking to improve and your comments help us do that. We hope to give you a five-star experience next time!",
    avatarColor: "#D97706",
  },
  {
    id: 6,
    author: "Alex Chen",
    initials: "AC",
    rating: 5,
    date: "2 weeks ago",
    text: "One of the best experiences I've had in a long time. The attention to detail was impressive and the whole team made me feel valued as a customer. This is now my go-to place without question.",
    reply: null,
    avatarColor: "#0891B2",
  },
  {
    id: 7,
    author: "Rachel Simmons",
    initials: "RS",
    rating: 1,
    date: "3 weeks ago",
    text: "Very poor experience. I had to wait almost an hour and when I finally got seen, the issue wasn't even properly resolved. I left more frustrated than when I arrived. Would not return.",
    reply: "Dear Rachel, we are truly sorry to hear about your experience and we completely understand your frustration. This falls far below our standards. Please contact us directly and we will do everything we can to make this right.",
    avatarColor: "#BE123C",
  },
  {
    id: 8,
    author: "David Kumar",
    initials: "DK",
    rating: 4,
    date: "3 weeks ago",
    text: "Really good service and the team was knowledgeable and helpful. The whole process was smooth and efficient. A small suggestion would be to improve the parking situation as it was a bit tricky.",
    reply: null,
    avatarColor: "#7C3AED",
  },
];

const PAGE_SIZE = 5;

/* ─── Star renderer ──────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14"
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

/* ─── Review card ────────────────────────────────────────── */
function ReviewCard({ review }: { review: Review }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.reply ?? "");
  const [saved, setSaved] = useState(!!review.reply);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: review.text, reviewerName: review.author, starRating: review.rating }),
      });
      const data = await res.json();
      if (data.reply) setReplyText(data.reply);
    } catch {
      // fallback – keep existing
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    setSaved(true);
    setReplyOpen(false);
  }

  return (
    <div className="rounded-2xl border border-[#ffffff15] p-5 md:p-6 transition-all"
      style={{ background: "rgba(11,9,10,0.4)" }}>
      {/* Top row */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ background: review.avatarColor }}>
          {review.initials}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-white">{review.author}</span>
            <span className="text-gray-500 text-xs">{review.date}</span>
          </div>
          <Stars rating={review.rating} />
        </div>

        {/* Reply status badge */}
        <div className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
          saved
            ? "bg-[#00FFE920] text-[#00FFE9] border border-[#00FFE930]"
            : "bg-[#ffffff10] text-gray-400 border border-[#ffffff15]"
        }`}>
          {saved ? "Replied" : "Pending"}
        </div>
      </div>

      {/* Review text */}
      <p className="text-gray-300 text-sm leading-relaxed mt-4">{review.text}</p>

      {/* Existing reply */}
      {saved && replyText && !replyOpen && (
        <div className="mt-4 pl-4 border-l-2 border-[#00FFE940]">
          <p className="text-xs text-[#00FFE9] font-medium mb-1">Your reply</p>
          <p className="text-gray-400 text-sm leading-relaxed">{replyText}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => setReplyOpen(!replyOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#ffffff20] text-gray-300 hover:text-[#00FFE9] hover:border-[#00FFE930] transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {saved ? "Edit Reply" : "Reply"}
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00FFE930] text-[#00FFE9] hover:bg-[#00FFE910] transition-colors cursor-pointer disabled:opacity-50">
          {generating ? (
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="13" height="13"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
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
            style={{ background: "rgba(11,9,10,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setReplyOpen(false)}
              className="px-4 py-1.5 rounded-full text-xs font-medium border border-[#ffffff20] text-gray-400 hover:text-white transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!replyText.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-black transition-colors cursor-pointer disabled:opacity-40"
              style={{ background: "linear-gradient(to right, #00FFE9, #00B4D8)" }}>
              Post Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function OverviewPage() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [sortBy, setSortBy] = useState("relevant");
  const [page, setPage] = useState(1);

  /* filter + sort */
  const filtered = useMemo(() => {
    let list = [...MOCK_REVIEWS];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.author.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q)
      );
    }

    // star filter
    const maxRating = parseInt(ratingFilter);
    if (maxRating > 0) {
      list = list.filter((r) => r.rating <= maxRating);
    }

    // sort
    if (sortBy === "newest") {
      // already ordered newest-first in mock data
    } else if (sortBy === "lowest") {
      list.sort((a, b) => a.rating - b.rating);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [search, ratingFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  /* summary stats */
  const total = MOCK_REVIEWS.length;
  const avgRating = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const replied = MOCK_REVIEWS.filter((r) => r.reply).length;
  const pending = total - replied;

  return (
    <DashboardShell activeHref="/dashboard/overview">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#1f1f1f] p-6 md:p-10 h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(11,9,10,0.2)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          {/* ── Header row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <h2 className="text-xl md:text-2xl font-medium">Overview (Owner)</h2>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-[#00FFE9] text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity self-start sm:self-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
              Connect Business Profile
            </Link>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Reviews", value: total, color: "text-white" },
              { label: "Avg Rating", value: `${avgRating} ★`, color: "text-yellow-400" },
              { label: "Replied", value: replied, color: "text-[#00FFE9]" },
              { label: "Pending", value: pending, color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#ffffff10] p-4"
                style={{ background: "rgba(11,9,10,0.4)" }}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Filters row ── */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
            {/* Search */}
            <div className="flex items-center bg-[#0B090A33] border border-[#2A2A2A] rounded-full px-4 py-2.5 flex-1 gap-2">
              <input
                placeholder="Search reviews…"
                className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none"
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-gray-400 flex-shrink-0" aria-hidden="true">
                <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
              </svg>
            </div>

            {/* Rating filter */}
            <div className="relative flex-1 md:flex-none">
              <select
                value={ratingFilter}
                onChange={handleFilterChange(setRatingFilter)}
                className="w-full md:w-[160px] px-4 py-3 pr-10 rounded-lg border border-[#2A2A2A] text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-[#00FFE9]/50 appearance-none cursor-pointer transition-all hover:border-[#00FFE9]/30"
                style={{ background: "rgba(11,9,10,0.2)", backdropFilter: "blur(8px)" }}
              >
                <option value="0" className="bg-[#0B090A]">All Ratings</option>
                <option value="1" className="bg-[#0B090A]">1 Star and below</option>
                <option value="2" className="bg-[#0B090A]">2 Stars and below</option>
                <option value="3" className="bg-[#0B090A]">3 Stars and below</option>
                <option value="4" className="bg-[#0B090A]">4 Stars and below</option>
                <option value="5" className="bg-[#0B090A]">5 Stars and below</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {/* Sort */}
            <div className="relative flex-1 md:flex-none">
              <select
                value={sortBy}
                onChange={handleFilterChange(setSortBy)}
                className="w-full md:w-[160px] px-4 py-3 pr-10 rounded-lg border border-[#2A2A2A] text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-[#00FFE9]/50 appearance-none cursor-pointer transition-all hover:border-[#00FFE9]/30"
                style={{ background: "rgba(11,9,10,0.2)", backdropFilter: "blur(8px)" }}
              >
                <option value="relevant" className="bg-[#0B090A]">Most Relevant</option>
                <option value="newest" className="bg-[#0B090A]">Most Recent</option>
                <option value="lowest" className="bg-[#0B090A]">Lowest Rating</option>
                <option value="rating" className="bg-[#0B090A]">Highest Rating</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* ── Review list ── */}
          <div className="space-y-4">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-gray-600 mb-4" aria-hidden="true">
                  <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-gray-400 text-lg">No reviews match your filters</p>
                <button onClick={() => { setSearch(""); setRatingFilter("0"); setSortBy("relevant"); setPage(1); }}
                  className="mt-3 text-sm text-[#00FFE9] hover:underline cursor-pointer">
                  Clear filters
                </button>
              </div>
            ) : (
              paginated.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </div>

          {/* ── Pagination ── */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#1f1f1f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                style={{ background: "rgba(11,9,10,0.2)" }}
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      page === i + 1
                        ? "bg-[#00FFE9] text-black"
                        : "text-gray-400 hover:bg-[#1f1f1f] border border-[#2A2A2A]"
                    }`}
                    style={page !== i + 1 ? { background: "rgba(11,9,10,0.2)" } : {}}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#1f1f1f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                style={{ background: "rgba(11,9,10,0.2)" }}
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
