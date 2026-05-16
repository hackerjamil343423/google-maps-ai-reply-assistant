"use client";

import { useEffect, useState } from "react";

type Tag = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

type ModalData = {
  mode: "create" | "edit";
  tag?: Tag;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  function fetchTags() {
    setLoading(true);
    fetch("/api/admin/blog/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function openCreateModal() {
    setName("");
    setSlug("");
    setSlugManuallyEdited(false);
    setModal({ mode: "create" });
  }

  function openEditModal(tag: Tag) {
    setName(tag.name);
    setSlug(tag.slug);
    setSlugManuallyEdited(true);
    setModal({ mode: "edit", tag });
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSubmit() {
    setActionLoading(true);
    const body = { name, slug };

    if (modal?.mode === "create") {
      await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else if (modal?.mode === "edit" && modal.tag) {
      await fetch(`/api/admin/blog/tags/${modal.tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setActionLoading(false);
    setModal(null);
    fetchTags();
  }

  async function handleDelete(tag: Tag) {
    if (!window.confirm(`Delete tag "${tag.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/blog/tags/${tag.id}`, {
      method: "DELETE",
    });
    fetchTags();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Tags</h1>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1FD4] transition-colors cursor-pointer"
        >
          Add Tag
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBFF] bg-[#F8F7FF]">
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Name</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Slug</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Posts</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#040404]">{tag.name}</td>
                  <td className="px-5 py-3.5 text-[#6B6487] font-mono text-xs">{tag.slug}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium text-[#5F30EB]">
                      {tag.postCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#9490A8]">
                    No tags yet. Create your first tag.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#130F1D]/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">
              {modal.mode === "create" ? "Add Tag" : "Edit Tag"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Tag name"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="tag-slug"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm font-mono text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border border-[#E6E1FA] px-4 py-2.5 text-sm font-medium text-[#6B6487] hover:bg-[#F8F7FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading || !name.trim() || !slug.trim()}
                className="rounded-xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1FD4] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "..." : modal.mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
