"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  status: "published" | "draft" | "archived";
  categoryId: string | null;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  categoryName: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-50 text-green-600",
  draft: "bg-yellow-50 text-yellow-600",
  archived: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

export default function ArticlesPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 20;

  function fetchPosts() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    fetch(`/api/admin/blog/posts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPosts();
  }, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deletePost(postId: string, postTitle: string) {
    if (!window.confirm(`Are you sure you want to delete "${postTitle}"?`)) return;
    setActionLoading(postId);
    await fetch(`/api/admin/blog/posts/${postId}`, { method: "DELETE" });
    setActionLoading(null);
    fetchPosts();
  }

  async function togglePublish(post: PostRow) {
    const newStatus = post.status === "published" ? "draft" : "published";
    setActionLoading(post.id);
    await fetch(`/api/admin/blog/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(null);
    fetchPosts();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Articles</h1>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPosts()}
            className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] w-64"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E6E1FA] bg-white px-4 py-2.5 text-sm outline-none text-[#6B6487]"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <Link
            href="/blog/articles/new"
            className="inline-flex items-center justify-center rounded-xl bg-[#5F30EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4A1FD4] transition-colors"
          >
            New Article
          </Link>
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
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Title
                  </th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Category
                  </th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Author
                  </th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/blog/articles/${post.id}`}
                        className="font-medium text-[#5F30EB] hover:underline"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                          STATUS_STYLES[post.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {STATUS_LABELS[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6487]">
                      {post.categoryName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6487]">
                      {post.authorName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#9490A8]">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Link
                          href={`/blog/articles/${post.id}`}
                          className="rounded-lg bg-[#F0EBFF] px-3 py-1.5 text-xs font-medium text-[#5F30EB] hover:bg-[#E6E1FA] transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => togglePublish(post)}
                          disabled={actionLoading === post.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                            post.status === "published"
                              ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          } disabled:opacity-50`}
                        >
                          {actionLoading === post.id
                            ? "..."
                            : post.status === "published"
                              ? "Unpublish"
                              : "Publish"}
                        </button>
                        <button
                          onClick={() => deletePost(post.id, post.title)}
                          disabled={actionLoading === post.id}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-[#9490A8]"
                    >
                      No articles found
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
