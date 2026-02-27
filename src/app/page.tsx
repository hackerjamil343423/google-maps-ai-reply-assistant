"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
];

const WHY_CARDS = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Boost Your SEO",
    desc: "Google rewards activity. Businesses that respond to reviews rank higher on Google Maps and search results. Our tool ensures you never miss an opportunity to signal to Google that your business is active and relevant.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Build Trust",
    desc: "A response shows you care. When potential customers see you engaging with feedback, it establishes immediate trust. It encourages others to leave reviews because they know there is someone listening.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Damage Control",
    desc: "Unhappy customers need to feel heard. Our AI helps you turn negative situations into displays of excellent customer service. Your thoughtful reply shows the world you care.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "The Ultimate CRM",
    desc: "Think of this as your automated Customer Relationship Management tool. Use responses to offer more information or mention current promotions — turning a simple review into an invitation for repeat business.",
  },
];

const COST_CARDS = [
  {
    title: "Lost Revenue",
    desc: "You lose potential customers who think you are inactive or indifferent.",
  },
  {
    title: "Lower Rankings",
    desc: "Google pushes your business down the list in favor of more active competitors.",
  },
  {
    title: "Wasted Time",
    desc: "You stare at the screen, suffering from writer's block instead of running your business.",
  },
  {
    title: "Reputation Damage",
    desc: "Leaving negative reviews unanswered lets the angry customer control the narrative.",
  },
];

const SERVE_CARDS = [
  {
    icon: "/assests/images/serviceImages/service (1).svg",
    title: "Marketing Agencies",
    desc: "Stop wasting hours writing manual replies for your clients. Whitelabel our AI automation tool and resell it to your clients at a healthy margin. It is the perfect add-on to generate recurring revenue while delivering tangible SEO results.",
  },
  {
    icon: "/assests/images/serviceImages/service (2).svg",
    title: "Local Businesses",
    desc: 'This is for the restaurant owner, plumber, dentist, beauty salon, and more. You want to cut down the hours spent manually typing responses. You want to rank higher in Google Maps\' "recommended businesses" without hiring a dedicated marketing manager.',
  },
];

const HOW_CARDS = [
  {
    icon: (
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
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    ),
    title: "Enable Auto-Post",
    desc: "Enable Auto-Post and let AI reply instantly",
  },
  {
    icon: (
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
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Manual Approval",
    desc: "Switch to Approval Before Posting if you want to approve each response",
  },
  {
    icon: (
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
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: "Customize & Edit",
    desc: "Edit or regenerate replies as many times as you want",
  },
  {
    icon: (
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
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Customize the AI Prompt",
    desc: "Set the AI tone style to: Professional, Friendly, Concise, Detailed, or Empathetic.",
  },
];

const PRICING_PLANS = [
  {
    name: "Local Business",
    tagline:
      "Perfect for small businesses looking to automate their Google review responses.",
    price: "$15",
    period: "/per month",
    features: [
      "Single Google Business Profile",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: false,
  },
  {
    name: "Multi-Location",
    tagline:
      "Ideal for businesses with multiple locations needing comprehensive review management.",
    price: "$49",
    period: "/per month",
    features: [
      "Up to 5 Google Business Profiles",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: true,
  },
  {
    name: "Agency Max",
    tagline:
      "Ultimate solution for agencies managing multiple clients' review strategies.",
    price: "$199",
    period: "/per month",
    features: [
      "Up to 60 Google Business Profiles",
      "Auto-Reply to Google Reviews",
      "Auto-Post or Manual Approval",
      "Customizable AI Prompt",
      "Tone Control",
      "Star-Based Review Filtering",
      "Google Business Profile Integration",
      "Bulk Reply Management",
      "AI Rewrite Assistant",
    ],
    highlighted: false,
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

        {/* Desktop Nav Links */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex space-x-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                link.href === "/"
                  ? "text-[#C3C3C3]"
                  : "text-[#C3C3C3]/50 hover:text-[#C3C3C3]/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center space-x-2">
          {isAuthenticated ? (
            <Link
              href="/dashboard/overview"
              className="bg-white text-black px-6 py-2 z-10 cursor-pointer rounded-full font-normal hover:bg-[#00FFE9] transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
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
            </>
          )}
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
            {isAuthenticated ? (
              <Link
                href="/dashboard/overview"
                className="bg-white text-black px-6 py-2 rounded-full font-normal hover:bg-[#00FFE9] transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="flex pt-10 flex-col relative items-center text-white md:px-6 md:py-20 justify-center min-h-[85vh]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assests/images/effectimg/effect2.webp"
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto w-full space-y-8">
          {/* Badge */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center">
              <div className="w-20 h-px bg-gradient-to-r from-transparent to-white shadow-lg shadow-white/50" />
              <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
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
                Auto-Reply To Your Google Reviews Using AI
              </span>
            </div>
            <div className="hidden md:flex items-center">
              <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
              <div className="w-20 h-px bg-gradient-to-l from-transparent to-white shadow-lg shadow-white/50" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2 w-full max-w-3xl">
            <h1 className="text-lg md:text-2xl 2xl:text-[2.3rem] leading-tight">
              Let AI respond to hundreds of your Google Business Profile reviews
              in your unique brand voice.
            </h1>
          </div>

          {/* Search Form */}
          <div className="mt-6 w-full flex flex-col items-center space-y-4">
            <form
              className="w-full flex flex-col md:flex-row items-center gap-3 bg-[#1b1c1c] rounded-lg md:rounded-full p-3 relative"
              role="search"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                placeholder="Type your business name and address here"
                className="w-full bg-transparent text-white rounded-full px-4 py-3 focus:outline-none placeholder:text-gray-400"
                aria-label="Search business reviews"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <button
                type="submit"
                className="w-full md:w-auto cursor-pointer bg-white text-black px-6 py-3 font-bold rounded-lg md:rounded-full transition hover:bg-[#00FFE9] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Submit search"
              >
                Go!
              </button>
            </form>
            <div className="text-center text-gray-300 max-w-2xl px-4">
              <p className="mb-2">
                Don&apos;t just take our word for it. Watch our AI write a
                perfect response for your business right now.
              </p>
              <p>
                Try It For FREE! Enter your business name as it appears on
                Google above and watch the AI respond to 5 of your reviews
                instantly. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Your Business Needs This */}
      <section className="py-12 md:py-24 bg-black text-white grid place-items-center">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4">
              Why Your Business Needs This
            </h2>
            <p className="text-[#C3C3C3] text-sm md:text-lg max-w-2xl mx-auto">
              You might forget to respond to a customer for months, but our AI
              never sleeps. Responding to reviews is not just polite; it is a
              critical engine for growth.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WHY_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#FFFFFF33] p-8 text-left"
                style={{
                  background: "#0B090A",
                  boxShadow: "0px -4px 100px 21px #EFEFEF14 inset",
                }}
              >
                <div className="mb-4 text-[#00FFE9]">{card.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/GetStarted?mode=signup"
              className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-[#00FFE9] transition-colors"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* The Cost of Silence */}
      <section className="py-12 md:py-24 bg-[#0B090A] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4">
              The Cost of Silence
            </h2>
            <p className="text-[#C3C3C3] text-sm md:text-lg max-w-2xl mx-auto">
              What happens when you ignore your reviews?
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COST_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#FFFFFF33] p-6 text-left"
                style={{
                  background: "#1A1A1A",
                  boxShadow: "0px -4px 100px 21px #EFEFEF14 inset",
                }}
              >
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Customers We Serve */}
      <section className="py-12 md:py-24 bg-black text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4">
              The Customers We Serve
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SERVE_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#FFFFFF33] p-8 text-left"
                style={{
                  background: "#0B090A",
                  boxShadow: "0px -4px 100px 21px #EFEFEF14 inset",
                }}
              >
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.icon} className="w-6 h-6" alt="" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-24 bg-[#0B090A] text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold mb-8 md:mb-16 mt-6">
            How It Works
          </h2>
          <p className="text-[#C3C3C3] text-sm md:text-lg max-w-3xl mx-auto mb-8 md:mb-16">
            Our AI uses an expert-built prompt system to generate personalized,
            thoughtful responses to every review posted on your Google Business
            Profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-[#0B090A] border border-[#FFFFFF33] p-8 text-left"
                style={{ boxShadow: "0px -4px 100px 21px #EFEFEF14 inset" }}
              >
                <div className="mb-6 inline-flex text-white">{card.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us / CTA Banner */}
      <section className="relative bg-[#0B090A] overflow-hidden py-24">
        <div className="absolute inset-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assests/images/featuresImg/joinusEffect.webp"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold mb-6">Join Us</h2>
          <h3 className="text-xl md:text-2xl font-medium mb-4">
            Ready to Save Time and Rank Higher?
          </h3>
          <p className="text-[#C3C3C3] mb-10 text-lg">
            Your customers are talking about you. It is time to join the
            conversation.
          </p>
          <Link
            href="/GetStarted?mode=signup"
            className="inline-block bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#00FFE9] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 md:py-24 bg-[#0B090A] text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4">
              Pricing
            </h2>
            <p className="text-[#C3C3C3] text-sm md:text-lg max-w-2xl mx-auto">
              Ready to transform your business through AI? Understanding your
              review content can be tough. Simplify the process with our pre-set
              questions to uncover customer pain points conveniently.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-[#00FFE9] shadow-[0_0_40px_0_rgba(0,255,233,0.15)]"
                    : "border-[#FFFFFF33]"
                }`}
                style={{ background: plan.highlighted ? "#01221F" : "#0B090A" }}
              >
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {plan.tagline}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm text-[#C3C3C3]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00FFE9"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm ml-1">
                    {plan.period}
                  </span>
                </div>
                <Link
                  href="/GetStarted?mode=signup"
                  className={`block text-center py-3 rounded-full font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-[#00FFE9] text-black hover:bg-white"
                      : "bg-white text-black hover:bg-[#00FFE9]"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/GetStarted?mode=signup"
              className="inline-block border border-[#00FFE9] text-[#00FFE9] px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#00FFE9] hover:text-black transition-colors"
            >
              Start FREE Trial
            </Link>
            <p className="text-gray-400 text-sm mt-3">
              No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B090A] border-t border-[#FFFFFF15] py-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assests/images/effectimg/footereffect.webp"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assests/5 Star Branding_075028/5starlogo02.png"
                alt="Five Star Reply Logo"
                className="w-32 h-auto"
              />
              <p className="text-gray-400 text-sm max-w-xs text-center md:text-left">
                Transform customer feedback into meaningful connections. Our
                AI-powered platform helps businesses respond to reviews with
                personalized, professional replies.
              </p>
              <a
                href="https://www.facebook.com/profile.php?id=61584823262750"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-[#00FFE9] transition-colors"
                aria-label="Facebook"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assests/socialicon/Facebook Icon.svg"
                  alt="Facebook"
                  className="w-5 h-5"
                />
              </a>
            </div>
            <nav className="flex flex-col items-center md:items-end gap-3">
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <Link
                  href="/"
                  className="hover:text-[#00FFE9] transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/about"
                  className="hover:text-[#00FFE9] transition-colors"
                >
                  About Us
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-[#00FFE9] transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-[#00FFE9] transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-[#00FFE9] transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </nav>
          </div>
          <div className="text-center mt-10 text-gray-600 text-xs">
            © {new Date().getFullYear()} Five Star Reply. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
