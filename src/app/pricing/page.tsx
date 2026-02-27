"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
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
    q: "What is Five Star Reply?",
    a: "Five Star Reply is an AI-powered platform that helps businesses automatically generate personalized, professional responses to customer reviews on Google Business Profile.",
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
        className="px-6 md:px-12 py-2 rounded-full border border-[#FFFFFF33]"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,7,26,0.04) 0%, rgba(2,7,26,0.16) 100%)",
          boxShadow: "0px 4px 8px 1px #F4F4FE40 inset",
        }}
      >
        <span className="text-white text-[12px] md:text-xl tracking-wider">
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function toggleFaq(i: number) {
    setOpenFaq((prev) => (prev === i ? null : i));
  }

  return (
    <div className="min-h-screen bg-[#0B090A] text-white">
      {/* Navbar */}
      <nav className="relative flex items-center justify-between px-6 lg:px-20 py-6">
        <Link href="/" className="flex items-center space-x-2 w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assests/5 Star Branding_075028/5starlogo02.png"
            alt="Five Star Reply Logo"
            className="w-full h-auto"
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
                  ? "text-[#C3C3C3]"
                  : "text-[#C3C3C3]/50 hover:text-[#C3C3C3]/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-2">
          <Link
            href="/GetStarted?mode=login"
            className="text-white hover:text-[#00FFE9] transition-colors px-6 py-2 z-10 cursor-pointer rounded-full font-normal"
          >
            Log In
          </Link>
          <Link
            href="/GetStarted?mode=signup"
            className="bg-white text-black px-6 py-2 z-10 cursor-pointer rounded-full font-normal hover:bg-[#00FFE9] transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white cursor-pointer z-10"
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
          <div className="absolute top-full left-0 right-0 bg-[#1b1c1c] flex flex-col items-center py-6 space-y-4 md:hidden z-50">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#C3C3C3] hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/GetStarted?mode=login"
              className="text-white hover:text-[#00FFE9] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/GetStarted?mode=signup"
              className="bg-white text-black px-6 py-2 rounded-full font-normal hover:bg-[#00FFE9] transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Pricing Section */}
      <section className="py-12 md:py-24 bg-[#0B090A] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center grid place-items-center">
          <Badge label="Pricing" />

          <h2 className="text-xl md:text-3xl max-w-2xl lg:text-4xl font-semibold mb-4">
            Ready to transform your business through AI?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8 md:mb-12">
            Understanding your review content can be tough. Simplify the process
            with our pre-set questions to uncover customer pain points
            conveniently.
          </p>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 place-items-center w-full">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-10 backdrop-blur-md ease-in-out w-full ${
                  plan.highlighted
                    ? "border-[#FFFFFF33] lg:scale-105 lg:mb-40 shadow-[0px_0px_60px_10px_rgba(0,245,212,0.2)]"
                    : "border-[#FFFFFF33]"
                }`}
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(to bottom, #0B090A, #01221F, #0B090A)"
                    : "#0B090A",
                  boxShadow: plan.highlighted
                    ? "0px -4px 100px 21px #EFEFEF14 inset, 0px 0px 60px 10px rgba(0,245,212,0.2)"
                    : "0px -4px 100px 21px #EFEFEF14 inset",
                }}
              >
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {plan.tagline}
                </p>

                {/* Divider */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00F5D4] to-transparent mb-6" />

                {/* Features */}
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center text-gray-300 text-[15px]">
                    <div className="w-5 h-5 rounded-md bg-[#00FFE9] flex items-center justify-center mr-3 flex-shrink-0 text-black">
                      <CheckIcon />
                    </div>
                    {plan.profileLine}
                  </li>
                  {FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center text-gray-300 text-[15px]"
                    >
                      <div className="w-5 h-5 rounded-md bg-[#00FFE9] flex items-center justify-center mr-3 flex-shrink-0 text-black">
                        <CheckIcon />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Price + CTA */}
                <div className="w-full grid place-items-center md:place-items-start">
                  <h4 className="text-4xl font-bold mb-4 text-white">
                    {plan.price}{" "}
                    <span className="text-sm text-[#00F5D4]">
                      {plan.period}
                    </span>
                  </h4>
                  <Link
                    href="/GetStarted?mode=signup"
                    className="w-[60%] py-3 px-6 rounded-full font-medium transition-all text-center bg-[#1A1A1A] border border-[#00F5D4]/30 text-[#00F5D4] hover:bg-[#00F5D4]/10"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Free Trial CTA */}
          <div className="mt-16 md:mt-24 flex flex-col items-center">
            <Link
              href="/GetStarted?mode=signup"
              className="px-10 py-4 rounded-full font-semibold text-lg transition-all text-black hover:shadow-[0_0_20px_rgba(0,255,233,0.4)] hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(to right, #00F5D4, #00FFE9)",
              }}
            >
              Start FREE Trial
            </Link>
            <p className="mt-4 text-gray-500 text-sm">
              No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#0B090A] py-12 md:py-24 text-white">
        <div className="max-w-4xl mx-auto px-6">
          <Badge label="Questions" />

          <h2 className="text-2xl md:text-4xl lg:text-6xl font-semibold text-center mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 text-sm md:text-base text-center mb-8 md:mb-12 max-w-2xl mx-auto">
            Choose a plan that fits your business needs and budget. No hidden
            fees, no surprises—just straightforward pricing for powerful
            management.
          </p>

          <div className="space-y-6">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-[#0B090A] rounded-2xl p-6 md:p-8 border border-white/20"
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
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#00F5D4] text-black transition-transform duration-300"
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
                    <p className="text-gray-400 text-sm leading-relaxed pt-4">
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
      <footer className="relative overflow-hidden text-white pt-20 pb-10 border-t border-[#00FFE9]/20">
        <div className="absolute inset-0 pointer-events-none -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assests/images/effectimg/footereffect.webp"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="max-w-7xl mx-auto flex px-4 justify-between flex-col gap-4 lg:flex-row lg:items-center">
          <div className="space-y-4">
            <div className="w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assests/5 Star Branding_075028/5starlogo02.png"
                alt="Five Star Reply Logo"
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              Transform customer feedback into meaningful connections. Our
              AI-powered platform helps businesses respond to reviews with
              personalized, professional replies that build stronger customer
              relationships and improve online reputation.
            </p>
          </div>
          <div className="flex flex-row items-center justify-start gap-8 text-sm text-gray-400">
            <Link href="/" className="hover:text-[#00FFE9] transition-colors">
              Home
            </Link>
            <Link href="/about" className="hover:text-[#00FFE9] transition-colors">
              About Us
            </Link>
            <Link href="/pricing" className="hover:text-[#00FFE9] transition-colors">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-[#00FFE9] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#00FFE9] transition-colors">
              Privacy
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.facebook.com/profile.php?id=61584823262750"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 border p-2 border-white/20 rounded-full flex items-center justify-center hover:border-[#00FFE9] hover:text-[#00FFE9] transition-all"
              aria-label="Facebook"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assests/socialicon/Facebook Icon.svg"
                alt="Facebook"
                className="w-full h-full"
              />
            </a>
          </div>
        </div>
        <div className="text-center mt-10 text-gray-600 text-xs">
          © {new Date().getFullYear()} Five Star Reply. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
