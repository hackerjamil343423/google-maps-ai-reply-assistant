"use client";

import { useEffect, useState } from "react";

type AuditLog = {
  id: string;
  adminUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metaJson: string | null;
  createdAt: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit-logs?page=${page}&pageSize=20`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Audit Logs</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Time</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Action</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Target</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF]">
                  <td className="px-5 py-3.5 text-[#9490A8] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium text-[#5F30EB]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#6B6487]">
                    {log.targetType && `${log.targetType}: ${log.targetId?.slice(0, 8)}...`}
                  </td>
                  <td className="px-5 py-3.5 text-[#9490A8] max-w-xs truncate">
                    {log.metaJson ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#9490A8]">No audit logs found</td>
                </tr>
              )}
            </tbody>
          </table>

          {logs.length === 20 && (
            <div className="flex justify-center border-t border-[#F0EBFF] p-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2 text-sm font-medium text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
