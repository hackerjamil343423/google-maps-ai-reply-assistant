import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Michael R.",
    role: "Restaurant Owner, Chicago",
    stars: 5,
    text: "Five Star Reply has completely transformed how we handle Google reviews. We used to spend 2+ hours per week writing responses. Now it's zero. Our reply rate went from 20% to 100% and our Google ranking jumped noticeably within 6 weeks.",
    avatar: "MR",
    color: "from-indigo-500 to-blue-600",
  },
  {
    name: "Amanda L.",
    role: "Marketing Agency Director",
    stars: 5,
    text: "We manage reviews for 35 local business clients. Before Five Star Reply, it was a full-time job. Now we handle it all in an hour a week. The white-label option lets us resell it as our own service — pure profit.",
    avatar: "AL",
    color: "from-violet-500 to-purple-600",
  },
  {
    name: "Carlos M.",
    role: "Plumbing Business Owner",
    stars: 5,
    text: "I had 45 unanswered reviews when I started. The AI caught up on all of them and the responses were so natural — my customers thought I wrote them personally. My 4.2-star rating is now 4.8 after just 3 months.",
    avatar: "CM",
    color: "from-cyan-500 to-sky-600",
  },
];

const stats = [
  { value: "1,000+", label: "Businesses using Five Star Reply" },
  { value: "98%", label: "Average review response rate" },
  { value: "4.8★", label: "Average star rating improvement" },
  { value: "10hrs", label: "Saved per month per business" },
];

export default function SocialProofSection() {
  return (
    <section className="relative py-28 bg-card/20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl border border-white/10 bg-card"
            >
              <p className="text-3xl md:text-4xl font-black gradient-text mb-2">
                {s.value}
              </p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Customer Stories
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Loved by businesses{" "}
            <span className="gradient-text-gold">everywhere</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            See how Five Star Reply is helping businesses like yours win on
            Google.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative rounded-2xl border border-white/10 bg-card p-8 hover:border-white/20 transition-all duration-300 card-glow flex flex-col"
            >
              <Quote className="w-8 h-8 text-indigo-400/40 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>

              <p className="text-muted-foreground leading-relaxed flex-1 mb-6">
                &quot;{t.text}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
