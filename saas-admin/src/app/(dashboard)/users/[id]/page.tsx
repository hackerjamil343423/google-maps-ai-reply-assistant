"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  suspended: boolean;
  isAdmin: boolean;
  createdAt: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  workspaces: {
    id: string;
    name: string;
    role: string;
    createdAt: string;
  }[];
  plan: {
    plan: string;
    status: string;
    createdAt: string;
  } | null;
};

type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: string;
  businessName: string;
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workspaces" | "reviews" | "delete">("workspaces");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  function fetchReviews() {
    fetch(`/api/admin/users/${userId}/reviews`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews ?? []));
  }

  async function toggleSuspend() {
    if (!user) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !user.suspended }),
    });
    setUser({ ...user, suspended: !user.suspended });
  }

  async function toggleAdmin() {
    if (!user) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !user.isAdmin }),
    });
    setUser({ ...user, isAdmin: !user.isAdmin });
  }

  async function handleDelete() {
    if (!user || deleteConfirmValue !== user.email) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    router.push("/users");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <div className="py-20 text-center text-[#9490A8]">User not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-[#5F30EB] hover:underline cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Users
      </button>

      {/* Tab bar */}
      <div className="mb-6 flex gap-2 border-b border-[#E6E1FA]">
        {(["workspaces", "reviews", "delete"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "reviews") fetchReviews();
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#5F30EB] text-[#5F30EB]"
                : "border-transparent text-[#9490A8] hover:text-[#6B6487]"
            }`}
          >
            {tab === "workspaces" ? "Workspaces" : tab === "reviews" ? "Reviews" : "Danger Zone"}
          </button>
        ))}
      </div>

      {activeTab === "delete" ? (
        <div className="max-w-md">
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-red-600">Delete User</h2>
            <p className="mb-4 text-sm text-[#9490A8]">
              This will permanently delete the account for <strong>{user.name}</strong> ({user.email}). All associated data will be removed. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              Delete User
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#130F1D]/40 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-red-600">Confirm Deletion</h3>
                <p className="mb-4 text-sm text-[#9490A8]">
                  Type <strong>{user?.email}</strong> to confirm.
                </p>
                <input
                  type="text"
                  id="delete-confirm-input"
                  className="mb-4 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm outline-none focus:border-red-400"
                  onChange={(e) => setDeleteConfirmValue(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-xl border border-[#E6E1FA] px-4 py-2.5 text-sm font-medium text-[#6B6487] hover:bg-[#F8F7FF] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmValue !== user.email || deleteLoading}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {deleteLoading ? "Deleting..." : "Delete User"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "reviews" ? (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Review</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Business</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Rating</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-[#F4F2FC] last:border-0">
                  <td className="px-5 py-3.5 text-[#040404] max-w-xs truncate">{r.text}</td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{r.businessName}</td>
                  <td className="px-5 py-3.5 text-amber-500">{"★".repeat(r.rating)}</td>
                  <td className="px-5 py-3.5 text-[#9490A8]">{new Date(r.reviewedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#9490A8]">No reviews found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* User Info Card */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0EBFF] text-xl font-bold text-[#5F30EB]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-[#040404]">{user.name}</h2>
              <p className="text-sm text-[#9490A8]">{user.email}</p>
              <div className="mt-3 flex gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  user.suspended ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                }`}>
                  {user.suspended ? "Suspended" : "Active"}
                </span>
                {user.isAdmin && (
                  <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium text-[#5F30EB]">Admin</span>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-[#F0EBFF] pt-4">
              {user.profile?.company && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9490A8]">Company</span>
                  <span className="font-medium text-[#040404]">{user.profile.company}</span>
                </div>
              )}
              {user.profile?.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9490A8]">Phone</span>
                  <span className="font-medium text-[#040404]">{user.profile.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#9490A8]">Joined</span>
                <span className="font-medium text-[#040404]">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9490A8]">Plan</span>
                <span className="font-medium capitalize text-[#040404]">{user.plan?.plan ?? "free"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-[#F0EBFF] pt-4">
              <button
                onClick={toggleSuspend}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  user.suspended
                    ? "bg-green-50 text-green-600 hover:bg-green-100"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                {user.suspended ? "Activate User" : "Suspend User"}
              </button>
              <button
                onClick={toggleAdmin}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  user.isAdmin
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA]"
                }`}
              >
                {user.isAdmin ? "Remove Admin" : "Make Admin"}
              </button>
            </div>
          </div>

          {/* Workspaces */}
          <div className="lg:col-span-2 rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[#040404]">Workspaces</h3>
            {user.workspaces.length === 0 ? (
              <p className="text-sm text-[#9490A8]">No workspaces</p>
            ) : (
              <div className="space-y-3">
                {user.workspaces.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl border border-[#F0EBFF] bg-[#F8F7FF] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">{w.name}</p>
                      <p className="text-xs text-[#9490A8]">Created {new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium capitalize text-[#5F30EB]">
                      {w.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
