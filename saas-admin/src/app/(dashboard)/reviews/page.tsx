"use client";

import { useEffect, useState } from "react";

type ReviewStats = {
  totalReviews: number;
  totalReplies: number;
  aiReplies: number;
  manualReplies: number;
  avgRating: number;
};

export default function ReviewsPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reviews/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Review Analytics</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#9490A8]">Total Reviews</p>
            <p className="mt-1 text-2xl font-bold text-[#040404]">{stats.totalReviews}</p>
          </div>
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#9490A8]">Total Replies</p>
            <p className="mt-1 text-2xl font-bold text-[#040404]">{stats.totalReplies}</p>
          </div>
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#9490A8]">AI Replies</p>
            <p className="mt-1 text-2xl font-bold text-[#5F30EB]">{stats.aiReplies}</p>
          </div>
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#9490A8]">Manual Replies</p>
            <p className="mt-1 text-2xl font-bold text-[#040404]">{stats.manualReplies}</p>
          </div>
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#9490A8]">Avg Rating</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{stats.avgRating.toFixed(1)}</p>
          </div>
        </div>
      ) : (
        <p className="text-[#9490A8]">Unable to load review stats</p>
      )}
    </div>
  );
}
