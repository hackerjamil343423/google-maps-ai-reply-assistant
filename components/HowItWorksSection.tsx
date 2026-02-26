import { Zap, Eye, Edit3, Sliders } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Zap,
    color: "from-indigo-500 to-blue-600",
    title: "Enable Auto-Post",
    description:
      "Connect your Google Business Profile and turn on Auto-Post mode. The AI will instantly craft and publish professional replies to every new review — 24/7, without any manual effort.",
    badge: "Fully Automated",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    number: "02",
    icon: Eye,
    color: "from-violet-500 to-purple-600",
    title: "Manual Approval Mode",
    description:
      "Prefer to review replies before they go live? Use Manual Approval mode to see every AI-generated response before it's published. You stay in full control.",
    badge: "You Stay In Control",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  {
    number: "03",
    icon: Edit3,
    color: "from-cyan-500 to-sky-600",
    title: "Customize & Edit",
    description:
      "Every AI reply is fully editable. Tweak the wording, add a personal touch, or completely rewrite it. The AI gives you a perfect starting point that you can refine in seconds.",
    badge: "Always Editable",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    number: "04",
    icon: Sliders,
    color: "from-amber-500 to-orange-600",
    title: "Set Your AI Tone",
    description:
      "Choose how your AI communicates: Professional, Friendly, Concise, Detailed, or Empathetic. Create custom prompts for different star ratings so your voice is always on-brand.",
    badge: "5 Tone Options",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28 bg-card/30">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Simple Process
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Set up in minutes and let the AI handle your reviews while you focus
            on what matters most — running your business.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative group flex gap-6 rounded-2xl border border-white/10 bg-card p-8 hover:border-white/20 transition-all duration-300 card-glow"
              >
                {/* Step Number */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  {/* Badge */}
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${step.badgeColor} mb-3`}
                  >
                    {step.badge}
                  </span>

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">
                      {step.title}
                    </h3>
                    <span className="text-4xl font-black text-white/5 leading-none">
                      {step.number}
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector line for even steps on desktop */}
                {index % 2 === 0 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-px bg-gradient-to-r from-white/20 to-transparent z-10" />
                )}
              </div>
            );
          })}
        </div>

        {/* Target markets */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8">
            <div className="text-3xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-white mb-3">
              Marketing Agencies
            </h3>
            <p className="text-muted-foreground mb-4">
              Offer review management as a white-label service to your clients.
              Manage up to 60 Google Business Profiles from a single dashboard
              and create a new recurring revenue stream.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> White-label resale
                opportunities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> Bulk profile
                management
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> Client-level
                reporting
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8">
            <div className="text-3xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-white mb-3">
              Local Businesses
            </h3>
            <p className="text-muted-foreground mb-4">
              Perfect for restaurants, plumbers, dentists, salons, and any
              business that relies on Google reviews to attract new customers.
              Set it up once and let the AI work for you.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> 2-minute setup
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Replies in your voice
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Improve local SEO
                ranking
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
