"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  "Auto-reply to all reviews",
  "Manual approval mode",
  "Customizable AI prompts",
  "5 tone options",
  "Star-based filtering",
  "Reply analytics dashboard",
  "24/7 automated replies",
  "Priority support",
];

const plans = [
  {
    name: "Local Business",
    monthlyPrice: 15,
    yearlyPrice: 12,
    description: "Perfect for single-location businesses.",
    profiles: "1 Google Business Profile",
    highlight: false,
    cta: "Start Free Trial",
    badge: null,
    color: "border-white/10 bg-card",
    ctaColor: "bg-white/10 hover:bg-white/20 text-white border-0",
    features: [
      "1 Google Business Profile",
      "Auto-reply & manual approval",
      "Customizable AI prompts",
      "5 tone options",
      "Star-based reply filtering",
      "Analytics dashboard",
    ],
  },
  {
    name: "Multi-Location",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "For growing businesses with multiple locations.",
    profiles: "Up to 5 Google Business Profiles",
    highlight: true,
    cta: "Start Free Trial",
    badge: "Most Popular",
    color: "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-card",
    ctaColor:
      "bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white border-0",
    features: [
      "Up to 5 Google Business Profiles",
      "Auto-reply & manual approval",
      "Customizable AI prompts",
      "5 tone options",
      "Star-based reply filtering",
      "Analytics dashboard",
      "Priority email support",
    ],
  },
  {
    name: "Agency Max",
    monthlyPrice: 199,
    yearlyPrice: 159,
    description: "For agencies managing multiple client profiles.",
    profiles: "Up to 60 Google Business Profiles",
    highlight: false,
    cta: "Contact Sales",
    badge: null,
    color: "border-white/10 bg-card",
    ctaColor: "bg-white/10 hover:bg-white/20 text-white border-0",
    features: [
      "Up to 60 Google Business Profiles",
      "Auto-reply & manual approval",
      "Customizable AI prompts",
      "5 tone options",
      "Star-based reply filtering",
      "Full analytics suite",
      "White-label resale",
      "Dedicated account manager",
      "Bulk management tools",
    ],
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Simple Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Start free, scale as you{" "}
            <span className="gradient-text">grow</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            No contracts. No hidden fees. Cancel anytime. All plans include a
            free trial — no credit card required.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-card border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !annual
                  ? "bg-indigo-500 text-white shadow-lg"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                annual
                  ? "bg-indigo-500 text-white shadow-lg"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Annual
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2 py-0">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border ${plan.color} p-8 transition-all duration-300 ${
                plan.highlight
                  ? "shadow-2xl shadow-indigo-500/20 scale-[1.02]"
                  : "hover:border-white/20 card-glow"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-0 px-4 py-1 text-sm font-semibold shadow-lg">
                    <Zap className="w-3 h-3 mr-1 inline" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">
                    ${annual ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground mb-2">/month</span>
                </div>
                {annual && (
                  <p className="text-sm text-emerald-400 mt-1">
                    Billed annually — save $
                    {(plan.monthlyPrice - plan.yearlyPrice) * 12}/yr
                  </p>
                )}
                <p className="text-sm text-indigo-300 mt-2 font-medium">
                  {plan.profiles}
                </p>
              </div>

              <Button
                className={`w-full mb-8 font-semibold py-3 ${plan.ctaColor}`}
                asChild
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>

              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Everything included:
                </p>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "text-indigo-400" : "text-emerald-400"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-muted-foreground text-sm mt-10">
          All plans include a{" "}
          <span className="text-white font-medium">free trial</span> with no
          credit card required.{" "}
          <Link href="/pricing" className="text-indigo-400 hover:underline">
            See full feature comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}
