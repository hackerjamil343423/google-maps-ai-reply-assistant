import Link from "next/link";

const TERMS_ITEMS = [
  {
    title: "Service Usage",
    body: "You are responsible for how your account is used and for ensuring content posted through the platform complies with applicable laws and Google platform policies.",
  },
  {
    title: "Account Security",
    body: "Keep your credentials secure. You must immediately notify us if you suspect unauthorized access to your account or connected services.",
  },
  {
    title: "AI-Generated Content",
    body: "AI output is provided to assist you. You remain responsible for reviewing and approving generated replies before publication when using manual approval mode.",
  },
  {
    title: "Billing and Plans",
    body: "Paid plans, limits, and billing periods are defined by your selected subscription. Changes to plan status may affect feature availability.",
  },
  {
    title: "Availability",
    body: "We work to keep the service stable and available, but uninterrupted operation is not guaranteed due to third-party dependencies and maintenance events.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-semibold">Terms of Service</h1>
          <p className="text-[#4F4F63]">
            These terms define the general conditions for using Wakkelni Stars.
          </p>
        </header>

        <div className="space-y-5">
          {TERMS_ITEMS.map((item) => (
            <section
              key={item.title}
              className="rounded-2xl border border-[#5F30EB22] bg-white/80 p-5"
            >
              <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
              <p className="text-[#4F4F63] leading-relaxed">{item.body}</p>
            </section>
          ))}
        </div>

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
