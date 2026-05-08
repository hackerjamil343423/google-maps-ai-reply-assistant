"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Workspace = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  businessCount: number;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  function fetchWorkspaces() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);

    fetch(`/api/admin/workspaces?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data.workspaces ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchWorkspaces();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Workspaces</h1>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchWorkspaces()}
            className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] w-64"
          />
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
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Workspace</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Owner</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Plan</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Members</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Businesses</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Created</th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/workspaces/${ws.id}`} className="font-medium text-[#5F30EB] hover:underline">
                        {ws.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[#040404]">{ws.ownerName}</div>
                      <div className="text-xs text-[#9490A8]">{ws.ownerEmail}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium capitalize text-[#5F30EB]">
                        {ws.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6487]">{ws.memberCount}</td>
                    <td className="px-5 py-3.5 text-[#6B6487]">{ws.businessCount}</td>
                    <td className="px-5 py-3.5 text-[#9490A8]">
                      {new Date(ws.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/workspaces/${ws.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA] transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {workspaces.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[#9490A8]">
                      No workspaces found
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
