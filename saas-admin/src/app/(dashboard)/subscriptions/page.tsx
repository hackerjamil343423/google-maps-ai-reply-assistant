"use client";

import { useEffect, useState } from "react";

type Subscription = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  billingInterval: string | null;
  createdAt: string;
};

type ModalState = {
  type: "change_plan" | "cancel" | "extend_trial";
  workspaceId: string;
  workspaceName: string;
  currentPlan?: string;
};

const PLANS = ["free", "starter", "pro", "enterprise"];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [planInput, setPlanInput] = useState("");

  useEffect(() => {
    fetchSubs();
  }, []);

  function fetchSubs() {
    setLoading(true);
    fetch("/api/admin/subscriptions")
      .then((r) => r.json())
      .then((data) => setSubs(data.subscriptions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleModalAction() {
    if (!modal) return;
    setActionLoading(true);

    if (modal.type === "change_plan") {
      await fetch(`/api/admin/subscriptions/${modal.workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planInput }),
      });
    } else if (modal.type === "cancel") {
      await fetch(`/api/admin/subscriptions/${modal.workspaceId}`, {
        method: "DELETE",
      });
    } else if (modal.type === "extend_trial") {
      const newTrialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
      await fetch(`/api/admin/subscriptions/${modal.workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "trialing", trialEndsAt: newTrialEnd.toISOString() }),
      });
    }

    setActionLoading(false);
    setModal(null);
    fetchSubs();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Subscriptions</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Workspace</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Owner</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Plan</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Status</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Billing</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Created</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.workspaceId} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF]">
                  <td className="px-5 py-3.5 font-medium text-[#040404]">{s.workspaceName}</td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{s.ownerEmail}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium capitalize text-[#5F30EB]">
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      s.status === "active" ? "bg-green-50 text-green-600" :
                      s.status === "trialing" ? "bg-blue-50 text-blue-600" :
                      s.status === "past_due" ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 capitalize text-[#6B6487]">{s.billingInterval ?? "monthly"}</td>
                  <td className="px-5 py-3.5 text-[#9490A8]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setModal({ type: "change_plan", workspaceId: s.workspaceId, workspaceName: s.workspaceName, currentPlan: s.plan });
                          setPlanInput(s.plan);
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA] cursor-pointer"
                      >
                        Change Plan
                      </button>
                      <button
                        onClick={() => setModal({ type: "extend_trial", workspaceId: s.workspaceId, workspaceName: s.workspaceName })}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                      >
                        Extend Trial
                      </button>
                      <button
                        onClick={() => setModal({ type: "cancel", workspaceId: s.workspaceId, workspaceName: s.workspaceName })}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#9490A8]">No subscriptions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#130F1D]/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">
              {modal.type === "change_plan" ? `Change Plan — ${modal.workspaceName}` :
               modal.type === "cancel" ? `Cancel Subscription — ${modal.workspaceName}` :
               `Extend Trial — ${modal.workspaceName}`}
            </h2>

            {modal.type === "change_plan" && (
              <select
                value={planInput}
                onChange={(e) => setPlanInput(e.target.value)}
                className="w-full rounded-xl border border-[#E6E1FA] bg-white px-4 py-3 text-sm outline-none focus:border-[#5F30EB] mb-4"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {modal.type === "cancel" && (
              <p className="mb-4 text-sm text-[#9490A8]">
                This will permanently cancel the subscription for <strong>{modal.workspaceName}</strong>. This action cannot be undone.
              </p>
            )}

            {modal.type === "extend_trial" && (
              <p className="mb-4 text-sm text-[#9490A8]">
                Extend the trial by 30 days for <strong>{modal.workspaceName}</strong>?
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border border-[#E6E1FA] px-4 py-2.5 text-sm font-medium text-[#6B6487] hover:bg-[#F8F7FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleModalAction}
                disabled={actionLoading}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer ${
                  modal.type === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-[#5F30EB] hover:bg-[#4A1FD4]"
                }`}
              >
                {actionLoading ? "..." : modal.type === "change_plan" ? "Update Plan" : modal.type === "cancel" ? "Cancel Subscription" : "Extend Trial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
