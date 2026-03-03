"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Services", href: "/services" },
];

const FEATURES = [
  "Auto-Reply to Google Reviews",
  "Auto-Post or Manual Approval",
  "Customizable AI Prompt",
  "Tone Control",
  "Star-Based Review Filtering",
  "Google Business Profile Integration",
  "Bulk Reply Management",
  "AI Rewrite Assistant",
];

const PLANS = [
  {
    name: "Local Business",
    tagline:
      "Perfect for small businesses looking to automate their Google review responses.",
    price: "$15",
    period: "/per month",
    profileLine: "Single Google Business Profile",
    highlighted: false,
  },
  {
    name: "Multi-Location",
    tagline:
      "Ideal for businesses with multiple locations needing comprehensive review management.",
    price: "$49",
    period: "/per month",
    profileLine: "Up to 5 Google Business Profiles",
    highlighted: true,
  },
  {
    name: "Agency Max",
    tagline:
      "Ultimate solution for agencies managing multiple clients' review strategies.",
    price: "$199",
    period: "/per month",
    profileLine: "Up to 60 Google Business Profiles",
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "What is Wakkelni Stars?",
    a: "Wakkelni Stars is an AI-powered platform that helps businesses automatically generate personalized, professional responses to customer reviews on Google Business Profile.",
  },
  {
    q: "How does the AI reply generation work?",
    a: "Our advanced AI analyzes the context, tone, and sentiment of each review to craft appropriate responses that maintain your brand voice while addressing customer concerns effectively.",
  },
  {
    q: "Which review platforms are supported?",
    a: "We currently support Google Business Profile only. Our platform integrates seamlessly with your Google Business Profile to help you manage and respond to all your Google reviews efficiently.",
  },
  {
    q: "Can I customize the tone and style of responses?",
    a: "Yes! You can set different tones (Professional, Friendly, Apologetic, etc.) and customize response templates to match your brand's unique voice and communication style.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use enterprise-grade encryption and security measures. Your customer data and business information are never shared with third parties and are stored securely in compliance with privacy regulations.",
  },
];

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-6 mb-8">
      <div className="hidden md:flex items-center">
        <div className="w-20 h-px bg-gradient-to-r from-transparent to-white shadow-lg shadow-white/50" />
        <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/25" />
      </div>
      <div
        className="px-6 md:px-12 py-2 rounded-full border border-[#5F30EB33]"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,7,26,0.04) 0%, rgba(2,7,26,0.16) 100%)",
          boxShadow: "0px 4px 8px 1px #F4F4FE40 inset",
        }}
      >
        <span className="text-[#4E4E5E] text-[12px] md:text-xl tracking-wider">
          {label}
        </span>
      </div>
      <div className="hidden md:flex items-center">
        <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
        <div className="w-20 h-px bg-gradient-to-l from-transparent to-white shadow-lg shadow-white/50" />
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    let mounted = true;

    void fetch("/api/me", { cache: "no-store" })
      .then((res) => {
        if (!mounted) return;
        setIsAuthenticated(res.ok);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthenticated(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function toggleFaq(i: number) {
    setOpenFaq((prev) => (prev === i ? null : i));
  }

  async function handlePlanClick(planName: string) {
    if (!isAuthenticated) {
      router.push("/GetStarted?mode=signup");
      return;
    }
    setCheckingOut(planName);
    setCheckoutError("");
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout.");
      const checkoutUrl = data?.checkoutUrl as string | undefined;
      if (!checkoutUrl) throw new Error("No checkout URL returned.");
      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout.");
      setCheckingOut(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4FF] text-[#040404]">
      {/* Navbar */}
      <nav
        className="landing-glass-panel fixed left-1/2 top-4 z-50 w-[92vw] max-w-[1120px] -translate-x-1/2 rounded-full px-4 py-3 md:px-6 md:py-4 lg:px-8"
        style={{
          boxShadow:
            "0 12px 34px rgba(4, 4, 4, 0.1), 0 0 0 1px rgba(95, 48, 235, 0.14) inset",
        }}
      >
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/wakkelni-logo.png"
              alt="Wakkelni Stars Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex space-x-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  link.href === "/pricing"
                    ? "text-[#4E4E5E]"
                    : "text-[#4E4E5E]/50 hover:text-[#4E4E5E]/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <Link
                href="/dashboard/overview"
                className="bg-white text-black px-6 py-2 z-10 cursor-pointer rounded-full font-normal hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/GetStarted?mode=login"
                  className="text-[#040404] hover:text-[#5F30EB] transition-colors px-6 py-2 z-10 cursor-pointer rounded-full font-normal"
                >
                  Log In
                </Link>
                <Link
                  href="/GetStarted?mode=signup"
                  className="bg-white text-black px-6 py-2 z-10 cursor-pointer rounded-full font-normal hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#040404] cursor-pointer z-10"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16" />
              <path d="M4 12h16" />
              <path d="M4 19h16" />
            </svg>
          </button>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-[#FFFFFFF2] backdrop-blur-md border border-[#5F30EB22] rounded-3xl flex flex-col items-center py-6 space-y-4 md:hidden z-50">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[#4E4E5E] hover:text-[#040404] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <Link
                  href="/dashboard/overview"
                  className="bg-white text-black px-6 py-2 rounded-full font-normal hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/GetStarted?mode=login"
                    className="text-[#040404] hover:text-[#5F30EB] transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/GetStarted?mode=signup"
                    className="bg-white text-black px-6 py-2 rounded-full font-normal hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="pt-32 pb-12 md:pt-36 md:pb-24 bg-[#F6F4FF] text-[#040404] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center grid place-items-center">
          <Badge label="Pricing" />

          <h2 className="text-xl md:text-3xl max-w-2xl lg:text-4xl font-semibold mb-4">
            Ready to transform your business through AI?
          </h2>
          <p className="text-[#6A6A82] max-w-2xl mx-auto mb-8 md:mb-12">
            Understanding your review content can be tough. Simplify the process
            with our pre-set questions to uncover customer pain points
            conveniently.
          </p>

          {/* Checkout error banner */}
          {checkoutError && (
            <div className="w-full max-w-xl mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm text-center">
              {checkoutError}
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 place-items-center w-full">
            {PLANS.map((plan) => {
              const isLoadingThis = checkingOut === plan.name;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-10 backdrop-blur-md ease-in-out w-full ${
                    plan.highlighted
                      ? "border-[#5F30EB33] lg:scale-105 lg:mb-40 shadow-[0px_0px_60px_10px_rgba(0,245,212,0.2)]"
                      : "border-[#5F30EB33]"
                  }`}
                  style={{
                    background: plan.highlighted
                      ? "linear-gradient(to bottom, #F6F4FF, #EEF2FF, #F6F4FF)"
                      : "#F6F4FF",
                    boxShadow: plan.highlighted
                      ? "0px -4px 100px 21px #EFEFEF14 inset, 0px 0px 60px 10px rgba(0,245,212,0.2)"
                      : "0px -4px 100px 21px #EFEFEF14 inset",
                  }}
                >
                  <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-[#6A6A82] text-sm mb-6 leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00E0FF] to-transparent mb-6" />

                  {/* Features */}
                  <ul className="space-y-3 mb-8 text-left">
                    <li className="flex items-center text-[#4F4F63] text-[15px]">
                      <div className="w-5 h-5 rounded-md bg-[#5F30EB] flex items-center justify-center mr-3 flex-shrink-0 text-black">
                        <CheckIcon />
                      </div>
                      {plan.profileLine}
                    </li>
                    {FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center text-[#4F4F63] text-[15px]"
                      >
                        <div className="w-5 h-5 rounded-md bg-[#5F30EB] flex items-center justify-center mr-3 flex-shrink-0 text-black">
                          <CheckIcon />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Price + CTA */}
                  <div className="w-full grid place-items-center md:place-items-start">
                    <h4 className="text-4xl font-bold mb-4 text-[#040404]">
                      {plan.price}{" "}
                      <span className="text-sm text-[#00E0FF]">
                        {plan.period}
                      </span>
                    </h4>
                    <button
                      onClick={() => void handlePlanClick(plan.name)}
                      disabled={!!checkingOut}
                      className="w-[60%] py-3 px-6 rounded-full font-medium transition-all text-center bg-[#EEF2FF] border border-[#00E0FF]/30 text-[#00E0FF] hover:bg-[#00E0FF]/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoadingThis ? (
                        <>
                          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Redirecting...
                        </>
                      ) : isAuthenticated ? (
                        "Subscribe Now"
                      ) : (
                        "Get Started"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Free Trial CTA */}
          <div className="mt-16 md:mt-24 flex flex-col items-center">
            <Link
              href={isAuthenticated ? "/dashboard/subscription" : "/GetStarted?mode=signup"}
              className="px-10 py-4 rounded-full font-semibold text-lg transition-all text-black hover:shadow-[0_0_20px_rgba(0,255,233,0.4)] hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(to right, #00E0FF, #5F30EB)",
              }}
            >
              {isAuthenticated ? "Manage Subscription" : "Start FREE Trial"}
            </Link>
            {!isAuthenticated && (
              <p className="mt-4 text-[#8A8AA0] text-sm">
                No credit card required.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#F6F4FF] py-12 md:py-24 text-[#040404]">
        <div className="max-w-4xl mx-auto px-6">
          <Badge label="Questions" />

          <h2 className="text-2xl md:text-4xl lg:text-6xl font-semibold text-center mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-[#6A6A82] text-sm md:text-base text-center mb-8 md:mb-12 max-w-2xl mx-auto">
            Choose a plan that fits your business needs and budget. No hidden
            fees, no surprises - just straightforward pricing for powerful
            management.
          </p>

          <div className="space-y-6">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-[#F6F4FF] rounded-2xl p-6 md:p-8 border border-[#5F30EB]/20"
                  style={{
                    boxShadow: "inset 0px -4px 100px 21px #0B385829",
                  }}
                >
                  <button
                    className="flex justify-between items-center cursor-pointer w-full text-left"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                  >
                    <h3 className="text-lg md:text-xl font-medium pr-4">
                      {faq.q}
                    </h3>
                    <div
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#00E0FF] text-black transition-transform duration-300"
                      style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    </div>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: isOpen ? "500px" : "0px" }}
                  >
                    <p className="text-[#6A6A82] text-sm leading-relaxed pt-4">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden text-[#040404] pt-20 pb-10 border-t border-[#5F30EB]/20">
        <div className="absolute inset-0 pointer-events-none -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/effects/footer-effect.svg"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="max-w-7xl mx-auto flex px-4 justify-between flex-col gap-4 lg:flex-row lg:items-center">
          <div className="space-y-4">
            <div className="w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/wakkelni-logo.png"
                alt="Wakkelni Stars Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-[#6A6A82] max-w-md leading-relaxed">
              Transform customer feedback into meaningful connections. Our
              AI-powered platform helps businesses respond to reviews with
              personalized, professional replies that build stronger customer
              relationships and improve online reputation.
            </p>
          </div>
          <div className="flex flex-row items-center justify-start gap-8 text-sm text-[#6A6A82]">
            <Link href="/" className="hover:text-[#5F30EB] transition-colors">
              Home
            </Link>
            <Link href="/about" className="hover:text-[#5F30EB] transition-colors">
              About Us
            </Link>
            <Link href="/pricing" className="hover:text-[#5F30EB] transition-colors">
              Pricing
            </Link>
            <Link href="/services" className="hover:text-[#5F30EB] transition-colors">
              Services
            </Link>
            <Link href="/terms" className="hover:text-[#5F30EB] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#5F30EB] transition-colors">
              Privacy
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* X (Twitter) */}
            <a href="https://x.com/wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="X" className="w-10 h-10 border p-2 border-[#5F30EB]/20 rounded-full flex items-center justify-center text-[#6A6A82] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.858L1.717 2.25H8.19l4.26 5.632 5.795-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            {/* Facebook */}
            <a href="https://www.facebook.com/Wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 border p-2 border-[#5F30EB]/20 rounded-full flex items-center justify-center text-[#6A6A82] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            {/* Telegram */}
            <a href="https://t.me/wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="w-10 h-10 border p-2 border-[#5F30EB]/20 rounded-full flex items-center justify-center text-[#6A6A82] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/wakklniai" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-10 h-10 border p-2 border-[#5F30EB]/20 rounded-full flex items-center justify-center text-[#6A6A82] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/wakkelniai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 border p-2 border-[#5F30EB]/20 rounded-full flex items-center justify-center text-[#6A6A82] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
          </div>
        </div>
        <div className="text-center mt-10 text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} Wakkelni Stars. All rights reserved.
        </div>
      </footer>
    </div>
  );
}


