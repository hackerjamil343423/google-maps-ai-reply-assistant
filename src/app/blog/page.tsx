import Link from "next/link";
import { Suspense } from "react";
import { desc, eq, and, sql, count } from "drizzle-orm";

import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import SearchBar from "@/components/blog/SearchBar";

export const metadata = {
  title: "Blog — Wakkelni Stars",
  description:
    "Tips, guides, and updates about Google Business Profile review management and AI-powered customer engagement.",
};

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function estimateReadTime(content: string | null): string {
  if (!content) return "1 min read";
  const words = content.split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function ArticleCard({
  post,
  featured = false,
}: {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    content: string | null;
    publishedAt: Date | null;
    categoryName: string | null;
  };
  featured?: boolean;
}) {
  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block overflow-hidden rounded-3xl border border-[rgba(95,48,235,0.2)] shadow-[0_14px_32px_rgba(95,48,235,0.08)] transition-all duration-[220ms] ease-in-out hover:border-[rgba(95,48,235,0.34)] hover:shadow-[0_18px_40px_rgba(95,48,235,0.13)] hover:-translate-y-1"
      >
        {post.coverImage ? (
          <div className="relative aspect-[21/9] md:aspect-[21/8] overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040404]/80 via-[#040404]/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                {post.categoryName && (
                  <span className="rounded-full bg-[#5F30EB] px-3 py-1 text-xs font-medium text-white">
                    {post.categoryName}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="text-sm text-white/70">
                    {formatDate(post.publishedAt)}
                  </span>
                )}
                <span className="text-sm text-white/50">
                  {estimateReadTime(post.content)}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white leading-tight group-hover:text-[#00E0FF] transition-colors">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 text-sm md:text-base text-white/70 line-clamp-2 max-w-2xl">
                  {post.excerpt}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-white to-[#f8f9ff] p-8 md:p-12">
            <div className="flex items-center gap-3 mb-3">
              {post.categoryName && (
                <span className="rounded-full bg-[#F0EBFF] px-3 py-1 text-xs font-medium text-[#5F30EB]">
                  {post.categoryName}
                </span>
              )}
              {post.publishedAt && (
                <span className="text-sm text-[#8A8AA0]">
                  {formatDate(post.publishedAt)}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-[#040404] leading-tight group-hover:text-[#5F30EB] transition-colors">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="mt-3 text-[#4F4F63] line-clamp-2 max-w-2xl">
                {post.excerpt}
              </p>
            )}
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[rgba(95,48,235,0.2)] bg-gradient-to-b from-white to-[#f8f9ff] shadow-[0_14px_32px_rgba(95,48,235,0.08)] transition-all duration-[220ms] ease-in-out hover:border-[rgba(95,48,235,0.34)] hover:shadow-[0_18px_40px_rgba(95,48,235,0.13)] hover:-translate-y-1"
    >
      {post.coverImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs text-[#8A8AA0] mb-3">
          {post.categoryName && (
            <span className="rounded-full bg-[#F0EBFF] px-2.5 py-0.5 text-[11px] font-medium text-[#5F30EB]">
              {post.categoryName}
            </span>
          )}
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          <span>{estimateReadTime(post.content)}</span>
        </div>
        <h3 className="text-lg font-semibold text-[#040404] leading-snug group-hover:text-[#5F30EB] transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 text-sm text-[#4F4F63] line-clamp-2 flex-1">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center text-sm font-medium text-[#5F30EB] group-hover:text-[#00E0FF] transition-colors">
          Read article
          <svg
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

async function BlogContent({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? "1");
  const pageSize = 9;
  const offset = (page - 1) * pageSize;

  if (!db) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <h1 className="text-3xl md:text-5xl font-semibold">Blog</h1>
        <p className="mt-4 text-[#4F4F63]">Blog is not available in demo mode.</p>
      </div>
    );
  }

  const [categories, allPosts] = await Promise.all([
    db
      .select({ id: blogCategories.id, name: blogCategories.name, slug: blogCategories.slug })
      .from(blogCategories)
      .orderBy(blogCategories.name),
    (async () => {
      const conditions = [eq(blogPosts.status, "published")];

      if (category) {
        const [cat] = await db
          .select({ id: blogCategories.id })
          .from(blogCategories)
          .where(eq(blogCategories.slug, category))
          .limit(1);
        if (cat) conditions.push(eq(blogPosts.categoryId, cat.id));
      }

      const where = conditions.length > 1 ? and(...conditions) : conditions[0];

      let query = db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          coverImage: blogPosts.coverImage,
          content: blogPosts.content,
          publishedAt: blogPosts.publishedAt,
          categoryName: blogCategories.name,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .where(where)
        .orderBy(desc(blogPosts.publishedAt));

      if (q) {
        query = db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            excerpt: blogPosts.excerpt,
            coverImage: blogPosts.coverImage,
            content: blogPosts.content,
            publishedAt: blogPosts.publishedAt,
            categoryName: blogCategories.name,
          })
          .from(blogPosts)
          .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
          .where(
            and(
              eq(blogPosts.status, "published"),
              sql`(${blogPosts.title} ILIKE ${`%${q}%`} OR ${blogPosts.excerpt} ILIKE ${`%${q}%`})`,
              ...(conditions.length > 1 && conditions[1] ? [conditions[1]] : [])
            )
          )
          .orderBy(desc(blogPosts.publishedAt));
      }

      const posts = await query.limit(pageSize + 1).offset(offset);
      const [totalResult] = await db
        .select({ count: count() })
        .from(blogPosts)
        .where(q
          ? and(
              eq(blogPosts.status, "published"),
              sql`(${blogPosts.title} ILIKE ${`%${q}%`} OR ${blogPosts.excerpt} ILIKE ${`%${q}%`})`
            )
          : eq(blogPosts.status, "published")
        );

      return { posts, total: totalResult?.count ?? 0 };
    })(),
  ]);

  const posts = allPosts.posts;
  const total = allPosts.total;
  const totalPages = Math.ceil(total / pageSize);
  const featured = page === 1 && !q && !category && posts.length > 0 ? posts[0] : null;
  const gridPosts = featured ? posts.slice(1) : posts;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          <span className="bg-gradient-to-r from-[#00E0FF] to-[#5F30EB] bg-clip-text text-transparent">
            Blog
          </span>
        </h1>
        <p className="mt-4 text-lg text-[#4F4F63] max-w-2xl mx-auto">
          Insights, guides, and updates to help you master Google review
          management and grow your business reputation.
        </p>
      </header>

      {/* Search & Filters */}
      <div className="mb-10 md:mb-14">
        <Suspense>
          <SearchBar
            categories={categories}
            initialQuery={q ?? ""}
            initialCategory={category ?? ""}
          />
        </Suspense>
      </div>

      {/* Results info */}
      {(q || category) && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[#6A6A82]">
          <span>
            {total} result{total !== 1 ? "s" : ""} found
            {q && (
              <>
                {" "}for <strong className="text-[#040404]">&ldquo;{q}&rdquo;</strong>
              </>
            )}
          </span>
        </div>
      )}

      {/* Featured Post */}
      {featured && (
        <div className="mb-8">
          <ArticleCard post={featured} featured />
        </div>
      )}

      {/* Article Grid */}
      {gridPosts.length === 0 && !featured ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F0EBFF]">
            <svg
              className="h-8 w-8 text-[#5F30EB]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#040404]">No articles found</h3>
          <p className="mt-1 text-sm text-[#6A6A82]">
            Try adjusting your search or filter to find what you&apos;re looking for.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-flex items-center rounded-full bg-[#5F30EB] px-5 py-2 text-sm font-medium text-white hover:bg-[#4A1FD4] transition-colors"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/blog?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(category ? { category } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="flex h-10 items-center justify-center rounded-xl border border-[rgba(95,48,235,0.2)] px-4 text-sm font-medium text-[#5E5876] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
            >
              Previous
            </Link>
          )}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-[#8A8AA0]">&hellip;</span>
                  )}
                  <Link
                    href={`/blog?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(category ? { category } : {}),
                      ...(p > 1 ? { page: String(p) } : {}),
                    }).toString()}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-[#5F30EB] text-white shadow-[0_4px_12px_rgba(95,48,235,0.25)]"
                        : "text-[#5E5876] hover:bg-[#F0EBFF] hover:text-[#5F30EB]"
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              ))}
          </div>
          {page < totalPages && (
            <Link
              href={`/blog?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(category ? { category } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="flex h-10 items-center justify-center rounded-xl border border-[rgba(95,48,235,0.2)] px-4 text-sm font-medium text-[#5E5876] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}

      {/* Back to Home */}
      <div className="mt-16 pt-8 border-t border-[rgba(95,48,235,0.1)]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(95,48,235,0.2)] px-5 py-2.5 text-sm font-medium text-[#5F30EB] hover:bg-[#5F30EB] hover:text-white transition-colors"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-[rgba(95,48,235,0.06)] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[rgba(0,224,255,0.05)] blur-[100px]" />
      </div>

      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto text-center py-20">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
          </div>
        }
      >
        <BlogContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
