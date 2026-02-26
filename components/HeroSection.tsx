"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, ArrowRight, CheckCircle } from "lucide-react";

const DEMO_REVIEWS = [
  {
    stars: 5,
    author: "Sarah M.",
    text: "Absolutely amazing service! The team went above and beyond.",
    ai_reply:
      "Thank you so much, Sarah! We're thrilled to hear you had such a wonderful experience. Our team works hard to go above and beyond for every customer, and your kind words truly mean the world to us. We look forward to serving you again!",
  },
  {
    stars: 4,
    author: "James T.",
    text: "Great food and friendly staff. Will definitely come back!",
    ai_reply:
      "Thank you for the wonderful feedback, James! We're so glad you enjoyed the food and our team's hospitality. We can't wait to welcome you back soon!",
  },
  {
    stars: 2,
    author: "Linda K.",
    text: "Wait time was too long. Food was okay but service could improve.",
    ai_reply:
      "Thank you for your honest feedback, Linda. We sincerely apologize for the longer-than-expected wait time — this is something we're actively working to improve. We're glad you enjoyed the food, and we hope you'll give us another chance to provide you with the exceptional service you deserve.",
  },
];

export default function HeroSection() {
  const [businessName, setBusinessName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeReview, setActiveReview] = useState(0);

  const handleDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim()) setSubmitted(true);
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient pt-20"
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 flex flex-col items-center text-center gap-8">
        {/* Top badge */}
        <Badge
          variant="secondary"
          className="px-4 py-2 text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full"
        >
          <Sparkles className="w-3.5 h-3.5 mr-2 inline-block" />
          AI-Powered Google Review Management
        </Badge>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Auto-Reply To Your{" "}
          <span className="gradient-text-gold star-glow">Google Reviews</span>{" "}
          Using AI
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Leverage AI to respond to reviews in your brand&apos;s unique voice —
          automatically. Save hours every week, boost your Google ranking, and
          build genuine customer trust.
        </p>

        {/* Star rating row */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className="w-6 h-6 text-yellow-400 fill-yellow-400 star-glow"
            />
          ))}
          <span className="ml-2 text-muted-foreground text-sm">
            Trusted by 1,000+ businesses
          </span>
        </div>

        {/* Demo Input */}
        <div
          id="demo"
          className="w-full max-w-2xl bg-card border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          {!submitted ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your business name as it appears on Google and watch the
                AI respond to 5 of your reviews instantly.{" "}
                <span className="text-indigo-400 font-medium">
                  No credit card required.
                </span>
              </p>
              <form
                onSubmit={handleDemo}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Mario's Pizza on Main St"
                  className="flex-1 rounded-lg bg-background border border-white/15 px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white border-0 px-6 py-3 font-semibold"
                >
                  Try It FREE
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <CheckCircle className="w-5 h-5" />
                AI replies generated for &quot;{businessName}&quot;
              </div>

              {/* Demo Reviews */}
              <div className="flex gap-2 mb-4">
                {DEMO_REVIEWS.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveReview(i)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activeReview === i
                        ? "bg-indigo-500 text-white"
                        : "bg-white/10 text-muted-foreground hover:bg-white/20"
                    }`}
                  >
                    Review {i + 1}
                  </button>
                ))}
              </div>

              <div className="bg-background rounded-xl p-4 border border-white/10 text-left space-y-3">
                <div className="flex items-center gap-2">
                  {Array.from({ length: DEMO_REVIEWS[activeReview].stars }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-yellow-400 fill-yellow-400"
                      />
                    )
                  )}
                  <span className="text-sm font-medium text-white">
                    {DEMO_REVIEWS[activeReview].author}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  &quot;{DEMO_REVIEWS[activeReview].text}&quot;
                </p>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                      AI Reply
                    </span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">
                    {DEMO_REVIEWS[activeReview].ai_reply}
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-0"
                asChild
              >
                <a href="/signup">
                  Start Auto-Replying Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            No credit card required
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Setup in 2 minutes
          </div>
        </div>
      </div>
    </section>
  );
}
