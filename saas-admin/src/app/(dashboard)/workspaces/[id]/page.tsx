"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Member = {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  accessAllBusinesses: boolean;
  createdAt: string;
};

type Business = {
  id: string;
  name: string;
  status: string;
  connectedAt: string | null;
};

type Subscription = {
  plan: string;
  status: string;
  billingInterval: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type UsageRow = {
  month: string;
  reviewsManaged: number;
  aiRepliesGenerated: number;
};

type WorkspaceDetail = {
  id: string;
  name: string;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  members: Member[];
  businesses: Business[];
  subscription: Subscription | null;
  usage: UsageRow[];
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [ws, setWs] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  function fetchDetail() {
    setLoading(true);
    fetch(`/api/admin/workspaces/${id}`)
      .then((r) => r.json())
      .then((data) => setWs(data.workspace ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function handleDelete() {
    if (confirmName !== ws?.name) return;
    setDeleting(true);
    await fetch(`/api/admin/workspaces/${id}`, { method: "DELETE" });
    router.push("/workspaces");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
      </div>
    );
  }

  if (!ws) {
    return <div className="py-20 text-center text-[#9490A8]">Workspace not found</div>;
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
        Back to Workspaces
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">{ws.name}</h1>
        <span className="text-sm text-[#9490A8]">
          Created {new Date(ws.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Owner + Subscription */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Owner</h2>
            {ws.owner ? (
              <div className="space-y-2">
                <p className="font-medium text-[#040404]">{ws.owner.name}</p>
                <p className="text-sm text-[#9490A8]">{ws.owner.email}</p>
                <a
                  href={`/users/${ws.owner.id}`}
                  className="mt-2 inline-block text-xs text-[#5F30EB] hover:underline"
                >
                  View profile →
                </a>
              </div>
            ) : (
              <p className="text-sm text-[#9490A8]">No owner</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Subscription</h2>
            {ws.subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#9490A8]">Plan</span>
                  <span className="font-medium capitalize text-[#040404]">{ws.subscription.plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9490A8]">Status</span>
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                    ws.subscription.status === "active" ? "bg-green-50 text-green-600" :
                    ws.subscription.status === "trialing" ? "bg-blue-50 text-blue-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                    {ws.subscription.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9490A8]">Billing</span>
                  <span className="font-medium text-[#040404]">{ws.subscription.billingInterval ?? "monthly"}</span>
                </div>
                {ws.subscription.trialEndsAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9490A8]">Trial ends</span>
                    <span className="font-medium text-[#040404]">
                      {new Date(ws.subscription.trialEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#9490A8]">No subscription</p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="mb-3 text-sm text-[#9490A8]">
              Type <strong>{ws.name}</strong> to confirm deletion. This will delete the workspace and all associated data.
            </p>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={ws.name}
              className="mb-3 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-400"
            />
            <button
              onClick={handleDelete}
              disabled={confirmName !== ws.name || deleting}
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Workspace"}
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">
              Members ({ws.members.length})
            </h2>
            {ws.members.length === 0 ? (
              <p className="text-sm text-[#9490A8]">No members</p>
            ) : (
              <div className="space-y-3">
                {ws.members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between rounded-xl border border-[#F0EBFF] bg-[#F8F7FF] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">{m.userName}</p>
                      <p className="text-xs text-[#9490A8]">{m.userEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium capitalize text-[#5F30EB]">
                        {m.role}
                      </span>
                      <a href={`/users/${m.userId}`} className="text-xs text-[#5F30EB] hover:underline">
                        Profile →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Businesses */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">
              Businesses ({ws.businesses.length})
            </h2>
            {ws.businesses.length === 0 ? (
              <p className="text-sm text-[#9490A8]">No businesses</p>
            ) : (
              <div className="space-y-3">
                {ws.businesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-[#F0EBFF] bg-[#F8F7FF] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">{b.name}</p>
                      {b.connectedAt && (
                        <p className="text-xs text-[#9490A8]">
                          Connected {new Date(b.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      b.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage */}
          {ws.usage.length > 0 && (
            <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">Monthly Usage</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F0EBFF]">
                      <th className="pb-3 text-start font-medium text-[#9490A8]">Month</th>
                      <th className="pb-3 text-start font-medium text-[#9490A8]">Reviews Managed</th>
                      <th className="pb-3 text-start font-medium text-[#9490A8]">AI Replies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ws.usage.map((u) => (
                      <tr key={u.month} className="border-b border-[#F4F2FC] last:border-0">
                        <td className="py-3 font-medium text-[#040404]">{u.month}</td>
                        <td className="py-3 text-[#6B6487]">{u.reviewsManaged}</td>
                        <td className="py-3 text-[#6B6487]">{u.aiRepliesGenerated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
