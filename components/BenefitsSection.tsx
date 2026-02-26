import { TrendingUp, Shield, MessageSquare, Clock, Settings, BarChart3 } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    color: "from-indigo-500 to-blue-600",
    glow: "group-hover:shadow-indigo-500/20",
    title: "Boost Your SEO",
    description:
      "Businesses that respond to reviews rank higher on Google Maps and search results. Consistent engagement signals to Google that you're an active, customer-focused business.",
  },
  {
    icon: Shield,
    color: "from-emerald-500 to-teal-600",
    glow: "group-hover:shadow-emerald-500/20",
    title: "Build Trust Instantly",
    description:
      "A response shows you care. When potential customers see you engaging with feedback — good or bad — it establishes immediate credibility and trust.",
  },
  {
    icon: MessageSquare,
    color: "from-rose-500 to-pink-600",
    glow: "group-hover:shadow-rose-500/20",
    title: "Damage Control",
    description:
      "Negative reviews don't have to hurt you. Our AI crafts empathetic, professional responses that show your commitment to customer satisfaction.",
  },
  {
    icon: Clock,
    color: "from-violet-500 to-purple-600",
    glow: "group-hover:shadow-violet-500/20",
    title: "Save Hours Every Week",
    description:
      "Stop spending time writing repetitive responses. Our AI handles every review automatically, freeing you to focus on running your business.",
  },
  {
    icon: Settings,
    color: "from-amber-500 to-orange-600",
    glow: "group-hover:shadow-amber-500/20",
    title: "Full Customization",
    description:
      "Set your brand tone — Professional, Friendly, Concise, Empathetic — and customize AI prompts to match your voice perfectly.",
  },
  {
    icon: BarChart3,
    color: "from-cyan-500 to-sky-600",
    glow: "group-hover:shadow-cyan-500/20",
    title: "Actionable Insights",
    description:
      "Track response rates, review trends, and customer sentiment over time with a clear analytics dashboard built for growth.",
  },
];

export default function BenefitsSection() {
  return (
    <section id="features" className="relative py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Why Five Star Reply
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Everything you need to win{" "}
            <span className="gradient-text">on Google</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            One platform that handles all your Google review responses, saving
            time while improving your reputation and search ranking.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`group relative rounded-2xl border border-white/10 bg-card p-8 transition-all duration-300 hover:border-white/20 card-glow hover:shadow-2xl ${b.glow}`}
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${b.color} mb-6 shadow-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{b.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {b.description}
                </p>

                {/* Subtle corner accent */}
                <div
                  className={`absolute top-0 right-0 w-20 h-20 rounded-tr-2xl bg-gradient-to-br ${b.color} opacity-5 pointer-events-none`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
