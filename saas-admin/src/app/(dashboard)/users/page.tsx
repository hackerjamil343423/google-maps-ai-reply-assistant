"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  suspended: boolean;
  isAdmin: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 20;

  function fetchUsers() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
  }, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSuspend(userId: string, currentlySuspended: boolean) {
    setActionLoading(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !currentlySuspended }),
    });
    setActionLoading(null);
    fetchUsers();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Users</h1>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] w-64"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2.5 text-sm outline-none text-[#6B6487]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">User</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Email</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Status</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Role</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Joined</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/users/${u.id}`} className="font-medium text-[#5F30EB] hover:underline">
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6487]">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                        u.suspended
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {u.suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isAdmin && (
                        <span className="inline-flex rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium text-[#5F30EB]">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#9490A8]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleSuspend(u.id, u.suspended)}
                        disabled={actionLoading === u.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          u.suspended
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        } disabled:opacity-50`}
                      >
                        {actionLoading === u.id ? "..." : u.suspended ? "Activate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[#9490A8]">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2 text-sm font-medium text-[#5F30EB] hover:bg-[#F0EBFF] disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-sm text-[#9490A8]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2 text-sm font-medium text-[#5F30EB] hover:bg-[#F0EBFF] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
