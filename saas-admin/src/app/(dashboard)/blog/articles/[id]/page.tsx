"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { marked } from "marked";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

type PostTag = {
  id: string;
  name: string;
  slug: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryId: string | null;
  authorId: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  tags: PostTag[];
  createdAt: string;
  updatedAt: string;
};

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});

    fetch("/api/admin/blog/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/blog/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const post: Post = data.post;
        if (!post) {
          setNotFound(true);
          return;
        }
        setTitle(post.title ?? "");
        setSlug(post.slug ?? "");
        setExcerpt(post.excerpt ?? "");
        setContent(post.content ?? "");
        setCoverImage(post.coverImage ?? "");
        setCategoryId(post.categoryId ?? "");
        setSelectedTagIds(post.tags?.map((t) => t.id) ?? []);
        setStatus(post.status ?? "draft");
        setSeoTitle(post.seoTitle ?? "");
        setSeoDescription(post.seoDescription ?? "");
        setOgImage(post.ogImage ?? "");
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited) {
        setSlug(
          value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        );
      }
    },
    [slugManuallyEdited]
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value);
  }, []);

  const renderedHtml = useMemo(() => {
    try {
      return marked(content) as string;
    } catch {
      return "";
    }
  }, [content]);

  async function handleCoverUpload(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setCoverImage(data.url ?? data.imageUrl ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleCoverUpload(file);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(newStatus: "draft" | "published") {
    setSaving(true);
    setError(null);
    setSaved(false);
    setStatus(newStatus);

    try {
      const body = {
        title,
        slug,
        content,
        excerpt,
        coverImage,
        categoryId: categoryId || undefined,
        status: newStatus,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        ogImage: ogImage || undefined,
        tagIds: selectedTagIds,
      };

      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save article");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <button
          onClick={() => router.push("/blog/articles")}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-[#5F30EB] hover:underline cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Articles
        </button>
        <div className="py-20 text-center text-[#9490A8]">
          Article not found
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/blog/articles")}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-[#5F30EB] hover:underline cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Articles
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">Edit Article</h1>
        <span
          className={`rounded-lg px-3 py-1 text-xs font-medium ${
            status === "published"
              ? "bg-green-50 text-green-600"
              : "bg-[#F0EBFF] text-[#5F30EB]"
          }`}
        >
          {status === "published" ? "Published" : "Draft"}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 font-medium">
          Article saved successfully.
        </div>
      )}

      <div className="space-y-6">
        {/* Title & Slug */}
        <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title"
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="article-slug"
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8]"
              />
            </div>
          </div>
        </div>

        {/* Excerpt & Cover */}
        <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary of the article..."
                rows={3}
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8] resize-y"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Cover Image
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="block w-full text-sm text-[#6B6487] file:mr-4 file:rounded-xl file:border-0 file:bg-[#F0EBFF] file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-[#5F30EB] hover:file:bg-[#E6E1FA] file:cursor-pointer"
                  />
                  {uploading && (
                    <p className="mt-2 text-xs text-[#9490A8]">
                      Uploading...
                    </p>
                  )}
                  {coverImage && !uploading && (
                    <p className="mt-2 text-xs text-green-600 font-medium">
                      Image uploaded
                    </p>
                  )}
                </div>
                {coverImage && (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="h-20 w-32 rounded-xl border border-[#E6E1FA] object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category & Tags */}
        <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB]"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                Tags
              </label>
              {tags.length === 0 ? (
                <p className="text-sm text-[#9490A8]">No tags available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <label
                        key={tag.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                          selected
                            ? "border-[#5F30EB] bg-[#F0EBFF] text-[#5F30EB] font-medium"
                            : "border-[#E6E1FA] bg-[#F8F7FF] text-[#6B6487] hover:border-[#5F30EB]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTag(tag.id)}
                          className="sr-only"
                        />
                        {tag.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content with live preview */}
        <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
          <label className="mb-1.5 block text-sm font-medium text-[#040404]">
            Content
          </label>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown..."
                rows={20}
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-3 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8] resize-y font-mono"
              />
            </div>
            <div>
              <div className="rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-3 text-sm text-[#040404] min-h-[480px] overflow-auto prose prose-sm max-w-none prose-headings:text-[#040404] prose-p:text-[#6B6487] prose-a:text-[#5F30EB]">
                {content ? (
                  <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                ) : (
                  <p className="text-[#9490A8] italic">
                    Preview will appear here...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Section (collapsible) */}
        <div className="rounded-2xl border border-[#E6E1FA] bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="flex w-full items-center justify-between p-6 text-left cursor-pointer"
          >
            <span className="text-sm font-semibold text-[#040404]">
              SEO Settings
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-[#9490A8] transition-transform ${
                seoOpen ? "rotate-180" : ""
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {seoOpen && (
            <div className="border-t border-[#E6E1FA] p-6 pt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO title for search engines"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                  Meta Description
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Meta description for search engines..."
                  rows={2}
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8] resize-y"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">
                  OG Image URL
                </label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://example.com/og-image.png"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none focus:border-[#5F30EB] placeholder:text-[#9490A8]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push("/blog/articles")}
            disabled={saving}
            className="rounded-xl border border-[#E6E1FA] px-5 py-2.5 text-sm font-medium text-[#6B6487] hover:bg-[#F8F7FF] cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={saving || !title.trim()}
            className="rounded-xl border border-[#E6E1FA] bg-white px-5 py-2.5 text-sm font-medium text-[#5F30EB] hover:bg-[#F8F7FF] cursor-pointer disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => handleSubmit("published")}
            disabled={saving || !title.trim()}
            className="rounded-xl bg-[#5F30EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1FD0] cursor-pointer disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Publishing..."
              : status === "published"
                ? "Update"
                : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
