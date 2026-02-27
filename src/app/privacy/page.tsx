import Link from "next/link";

const PRIVACY_ITEMS = [
  {
    title: "Information We Process",
    body: "We process account details, connected workspace settings, and review/reply data required to operate the service and fulfill product functionality.",
  },
  {
    title: "How Data Is Used",
    body: "Data is used to authenticate users, sync reviews, generate AI responses, and provide analytics and team collaboration features.",
  },
  {
    title: "Third-Party Services",
    body: "The app integrates with providers such as Google, OpenAI, and Neon to deliver core functionality. Their services are subject to their own policies and terms.",
  },
  {
    title: "Data Security",
    body: "We apply technical safeguards for access control and secure transport, and we limit data handling to what is necessary for operation.",
  },
  {
    title: "Your Controls",
    body: "You can update profile/settings data and revoke connected account permissions from provider dashboards when needed.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F6F4FF] text-[#040404] px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-semibold">Privacy Policy</h1>
          <p className="text-[#4F4F63]">
            This summary explains how Wakkelni Stars handles data for service
            operation and security.
          </p>
        </header>

        <div className="space-y-5">
          {PRIVACY_ITEMS.map((item) => (
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
