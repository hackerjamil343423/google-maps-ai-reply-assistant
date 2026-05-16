"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};

type ModalData = {
  mode: "create" | "edit";
  category?: Category;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  function fetchCategories() {
    setLoading(true);
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function openCreateModal() {
    setName("");
    setSlug("");
    setDescription("");
    setSlugManuallyEdited(false);
    setModal({ mode: "create" });
  }

  function openEditModal(category: Category) {
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setSlugManuallyEdited(true);
    setModal({ mode: "edit", category });
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSubmit() {
    setActionLoading(true);
    const body = { name, slug, description };

    if (modal?.mode === "create") {
      await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else if (modal?.mode === "edit" && modal.category) {
      await fetch(`/api/admin/blog/categories/${modal.category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setActionLoading(false);
    setModal(null);
    fetchCategories();
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/blog/categories/${category.id}`, {
      method: "DELETE",
    });
    fetchCategories();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Categories</h1>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1FD4] transition-colors cursor-pointer"
        >
          Add Category
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
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Description</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Posts</th>
                <th className="px-5 py-3.5 text-start font-medium text-[#9490A8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-[#F4F2FC] last:border-0 hover:bg-[#F8F7FF] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#040404]">{cat.name}</td>
                  <td className="px-5 py-3.5 text-[#6B6487] font-mono text-xs">{cat.slug}</td>
                  <td className="px-5 py-3.5 text-[#6B6487] max-w-xs truncate">{cat.description || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-lg bg-[#F0EBFF] px-2.5 py-1 text-xs font-medium text-[#5F30EB]">
                      {cat.postCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#9490A8]">
                    No categories yet. Create your first category.
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
              {modal.mode === "create" ? "Add Category" : "Edit Category"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Category name"
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
                  placeholder="category-slug"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm font-mono text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] resize-none"
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
