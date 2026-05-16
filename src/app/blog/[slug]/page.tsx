import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, desc, sql } from "drizzle-orm";
import { marked } from "marked";
import type { Metadata } from "next";

import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogTags, blogPostTags } from "@/lib/db/schema";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!db) return { title: "Blog — Wakkelni Stars" };

  const [post] = await db
    .select({
      title: blogPosts.title,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      excerpt: blogPosts.excerpt,
      ogImage: blogPosts.ogImage,
      coverImage: blogPosts.coverImage,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) return { title: "Not Found — Wakkelni Stars" };

  return {
    title: post.seoTitle ?? `${post.title} — Wakkelni Stars`,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? undefined,
      images: post.ogImage ?? post.coverImage ?? undefined,
    },
  };
}

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const url = `https://wakkelni.com/blog/${slug}`;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[#8A8AA0] uppercase tracking-wider">Share</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(95,48,235,0.15)] text-[#6A6A82] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
        title="Share on X"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(95,48,235,0.15)] text-[#6A6A82] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
        title="Share on LinkedIn"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(95,48,235,0.15)] text-[#6A6A82] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
        title="Share on Facebook"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={typeof navigator !== "undefined" ? () => { navigator.clipboard.writeText(url); } : undefined}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(95,48,235,0.15)] text-[#6A6A82] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB] transition-colors"
        title="Copy link"
      >
        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    </div>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  if (!db) {
    return (
      <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-semibold">Blog</h1>
          <p className="mt-4 text-[#4F4F63]">Blog is not available in demo mode.</p>
        </div>
      </main>
    );
  }

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) notFound();

  const [category, tags, relatedPosts] = await Promise.all([
    post.categoryId
      ? db
          .select({ name: blogCategories.name, slug: blogCategories.slug })
          .from(blogCategories)
          .where(eq(blogCategories.id, post.categoryId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    db
      .select({ name: blogTags.name, slug: blogTags.slug })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, post.id)),
    post.categoryId
      ? db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            excerpt: blogPosts.excerpt,
            coverImage: blogPosts.coverImage,
            publishedAt: blogPosts.publishedAt,
          })
          .from(blogPosts)
          .where(
            and(
              eq(blogPosts.categoryId, post.categoryId),
              eq(blogPosts.status, "published"),
              sql`${blogPosts.id} != ${post.id}`
            )
          )
          .orderBy(desc(blogPosts.publishedAt))
          .limit(3)
      : [],
  ]);

  const contentHtml = await marked(post.content || "");
  const wordCount = (post.content || "").split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404]">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-[rgba(95,48,235,0.06)] blur-[120px]" />
      </div>

      {/* Cover Image Banner */}
      {post.coverImage && (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F6F4FF] via-transparent to-transparent" />
        </div>
      )}

      <article className="px-6 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#8A8AA0] mb-6">
            <Link href="/" className="hover:text-[#5F30EB] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#5F30EB] transition-colors">Blog</Link>
            {category && (
              <>
                <span>/</span>
                <span className="rounded-full bg-[#F0EBFF] px-2.5 py-0.5 text-[#5F30EB] font-medium text-xs">
                  {category.name}
                </span>
              </>
            )}
          </nav>

          {/* Header */}
          <header className="space-y-5 mb-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#8A8AA0]">
              {post.publishedAt && (
                <time dateTime={new Date(post.publishedAt).toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              )}
              <span>{readTime} min read</span>
              <span>{wordCount} words</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#040404]">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg md:text-xl text-[#4F4F63] leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Share + Tags */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[rgba(95,48,235,0.1)]">
              <ShareButtons title={post.title} slug={post.slug} />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag.slug}
                      className="rounded-full bg-[#F0EBFF] px-2.5 py-0.5 text-xs font-medium text-[#5F30EB]"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-[#040404] prose-p:text-[#4F4F63] prose-p:leading-relaxed prose-a:text-[#5F30EB] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:border prose-img:border-[rgba(95,48,235,0.15)] prose-code:text-[#5F30EB] prose-code:bg-[#F0EBFF] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#040404] prose-pre:border prose-pre:border-[rgba(95,48,235,0.1)] prose-pre:rounded-2xl prose-blockquote:border-[#5F30EB] prose-blockquote:bg-[rgba(95,48,235,0.03)] prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:pr-6"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Bottom share */}
          <div className="mt-12 pt-6 border-t border-[rgba(95,48,235,0.1)]">
            <div className="flex items-center justify-between">
              <ShareButtons title={post.title} slug={post.slug} />
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(95,48,235,0.2)] px-5 py-2 text-sm font-medium text-[#5F30EB] hover:bg-[#5F30EB] hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                All Articles
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="px-6 py-12 md:py-16 border-t border-[rgba(95,48,235,0.1)]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              Related{" "}
              <span className="bg-gradient-to-r from-[#00E0FF] to-[#5F30EB] bg-clip-text text-transparent">
                Articles
              </span>
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedPosts.map((rPost) => (
                <Link
                  key={rPost.id}
                  href={`/blog/${rPost.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-[rgba(95,48,235,0.2)] bg-gradient-to-b from-white to-[#f8f9ff] shadow-[0_14px_32px_rgba(95,48,235,0.08)] transition-all duration-[220ms] hover:border-[rgba(95,48,235,0.34)] hover:shadow-[0_18px_40px_rgba(95,48,235,0.13)] hover:-translate-y-1"
                >
                  {rPost.coverImage && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={rPost.coverImage}
                        alt={rPost.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {rPost.publishedAt && (
                      <span className="text-xs text-[#8A8AA0]">
                        {new Date(rPost.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <h3 className="mt-2 text-base font-semibold text-[#040404] leading-snug group-hover:text-[#5F30EB] transition-colors line-clamp-2">
                      {rPost.title}
                    </h3>
                    {rPost.excerpt && (
                      <p className="mt-2 text-sm text-[#4F4F63] line-clamp-2">
                        {rPost.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
