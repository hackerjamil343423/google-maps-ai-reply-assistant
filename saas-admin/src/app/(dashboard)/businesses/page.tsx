"use client";

import { useEffect, useState } from "react";

type Business = {
  id: string;
  name: string;
  status: string;
  workspaceName: string;
  ownerEmail: string;
  reviewCount: number;
  connectedAt: string | null;
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/businesses")
      .then((r) => r.json())
      .then((data) => setBusinesses(data.businesses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Businesses</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Business</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Workspace</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Owner</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Status</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Reviews</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Connected</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF]">
                  <td className="px-5 py-3.5 font-medium text-[#040404]">{b.name}</td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{b.workspaceName}</td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{b.ownerEmail}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      b.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#6B6487]">{b.reviewCount}</td>
                  <td className="px-5 py-3.5 text-[#9490A8]">
                    {b.connectedAt ? new Date(b.connectedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[#9490A8]">No businesses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
