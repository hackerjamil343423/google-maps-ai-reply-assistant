import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-semibold">About Wakkelni Stars</h1>
          <p className="text-[#4F4F63]">
            Wakkelni Stars helps businesses respond to Google reviews with AI-generated
            replies that stay on-brand and save time.
          </p>
        </header>

        <section className="space-y-4 text-[#4F4F63] leading-relaxed">
          <p>
            Our goal is to make reputation management simple, fast, and reliable for
            local businesses and agencies. By combining Google Business Profile
            integration with configurable AI tone and approval flows, teams can handle
            more reviews without lowering response quality.
          </p>
          <p>
            The platform supports manual approval and auto-post workflows, plus
            analytics to track response performance and review trends over time.
          </p>
        </section>

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
