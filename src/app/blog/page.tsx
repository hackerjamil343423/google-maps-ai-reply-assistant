import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";

export const metadata = {
  title: "Blog — Wakkelni Stars",
  description:
    "Tips, guides, and updates about Google Business Profile review management and AI-powered customer engagement.",
};

export default async function BlogPage() {
  if (!db) {
    return (
      <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-semibold">Blog</h1>
          <p className="mt-4 text-[#4F4F63]">Blog is not available in demo mode.</p>
        </div>
      </main>
    );
  }

  const posts = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      coverImage: blogPosts.coverImage,
      publishedAt: blogPosts.publishedAt,
      categoryName: blogCategories.name,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(20);

  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-semibold">Blog</h1>
          <p className="text-[#4F4F63]">
            Tips, guides, and updates about Google review management and AI-powered
            customer engagement.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-[#4F4F63]">No articles yet. Check back soon!</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-[#E6E1FA] bg-white overflow-hidden transition-shadow hover:shadow-[0_4px_24px_rgba(95,48,235,0.12)]"
              >
                {post.coverImage && (
                  <div className="aspect-video bg-[#F0EBFF] overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#9490A8]">
                    {post.categoryName && (
                      <span className="rounded-full bg-[#F0EBFF] px-2.5 py-0.5 text-[#5F30EB] font-medium">
                        {post.categoryName}
                      </span>
                    )}
                    {post.publishedAt && (
                      <time dateTime={new Date(post.publishedAt).toISOString()}>
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold group-hover:text-[#5F30EB] transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-[#4F4F63] line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[#5F30EB33] px-5 py-2 text-sm text-[#5F30EB] hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
          >
            Back to Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
