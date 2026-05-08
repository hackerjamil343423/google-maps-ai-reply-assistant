"use client";

import { useEffect, useState } from "react";

type Invitation = {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  function fetchInvitations() {
    setLoading(true);
    fetch("/api/admin/invitations")
      .then((r) => r.json())
      .then((data) => setInvitations(data.invitations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function resendInvitation(id: string) {
    setActionLoading(id);
    await fetch(`/api/admin/invitations/${id}`, { method: "POST" });
    setActionLoading(null);
    fetchInvitations();
  }

  async function revokeInvitation(id: string) {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    setActionLoading(id);
    await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
    setActionLoading(null);
    fetchInvitations();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Invitations</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Email</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Workspace</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Role</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Status</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Created</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Expires</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF]">
                  <td className="px-5 py-3.5 font-medium text-[#040404]">{inv.email}</td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{inv.workspaceName}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium capitalize text-[#5F30EB]">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      inv.status === "pending" ? "bg-amber-50 text-amber-600" :
                      inv.status === "accepted" ? "bg-green-50 text-green-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#9490A8]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-[#9490A8]">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      {inv.status === "pending" && (
                        <>
                          <button
                            onClick={() => resendInvitation(inv.id)}
                            disabled={actionLoading === inv.id}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoading === inv.id ? "..." : "Resend"}
                          </button>
                          <button
                            onClick={() => revokeInvitation(inv.id)}
                            disabled={actionLoading === inv.id}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#9490A8]">No invitations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
