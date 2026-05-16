import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
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

  const [category, tags] = await Promise.all([
    post.categoryId
      ? db
          .select({ name: blogCategories.name })
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
  ]);

  const contentHtml = await marked(post.content || "");

  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      <article className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[#9490A8]">
            <Link
              href="/blog"
              className="text-[#5F30EB] hover:underline"
            >
              Blog
            </Link>
            {category && (
              <>
                <span>/</span>
                <span className="rounded-full bg-[#F0EBFF] px-2.5 py-0.5 text-[#5F30EB] font-medium">
                  {category.name}
                </span>
              </>
            )}
            {post.publishedAt && (
              <>
                <span>/</span>
                <time dateTime={new Date(post.publishedAt).toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-[#4F4F63]">{post.excerpt}</p>
          )}
        </header>

        {post.coverImage && (
          <div className="rounded-2xl overflow-hidden border border-[#E6E1FA]">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        <div
          className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:text-[#040404] prose-p:text-[#4F4F63] prose-a:text-[#5F30EB] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-code:text-[#5F30EB] prose-pre:bg-[#040404] prose-pre:text-white"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-[#E6E1FA]">
            {tags.map((tag) => (
              <span
                key={tag.slug}
                className="rounded-full bg-[#F0EBFF] px-3 py-1 text-xs font-medium text-[#5F30EB]"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <footer className="pt-6">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-full border border-[#5F30EB33] px-5 py-2 text-sm text-[#5F30EB] hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
          >
            &larr; Back to Blog
          </Link>
        </footer>
      </article>
    </main>
  );
}
