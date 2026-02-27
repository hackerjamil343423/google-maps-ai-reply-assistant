"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
];

const STAR_RATINGS = [1, 2, 3, 4, 5];

export default function DemoPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [review, setReview] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [starRating, setStarRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = review.trim().length > 0;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError("");
    setReply("");

    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, reviewerName, starRating }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate reply");
      }

      const data = await res.json();
      setReply(data.reply);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (reply) {
      navigator.clipboard.writeText(reply);
    }
  }

  function handleRegenerate() {
    handleGenerate();
  }

  return (
    <div className="min-h-screen bg-[#0B090A] text-white">
      {/* Navbar */}
      <nav className="relative flex items-center justify-between px-6 lg:px-20 py-6">
        <Link href="/" className="flex items-center space-x-2 w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-02.svg"
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
                link.href === "/demo"
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

      {/* Demo Section */}
      <section className="min-h-screen relative mb-8 md:mb-0">
        <div className="w-full relative flex justify-center py-20">
          {/* Background effect */}
          <div className="absolute hidden md:block inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="effect"
              className="w-full h-full object-cover opacity-40"
              src="/assets/effects/effect-2.svg"
            />
          </div>

          <div className="z-10 w-[95%] lg:w-[70%]">
            {/* Header */}
            <div className="grid place-items-center text-center gap-4 mb-10">
              {/* Badge */}
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
                    Demo
                  </span>
                </div>
                <div className="hidden md:flex items-center">
                  <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
                  <div className="w-20 h-px bg-gradient-to-l from-transparent to-white shadow-lg shadow-white/50" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-bold text-xl md:text-2xl lg:text-4xl">
                  Reply With AI
                </h1>
                <p className="text-sm text-[#C3C3C3]">
                  Write perfect reply within seconds
                </p>
              </div>
            </div>

            {/* Main Card */}
            <div className="flex justify-center items-center">
              <div
                className="max-w-6xl w-full grid lg:grid-cols-2 gap-10 rounded-2xl p-10"
                style={{
                  background: "rgba(11,9,10,0.2)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "inset 0px -4px 100px 21px #0B385829",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Left Column — Info */}
                <div className="flex flex-col justify-center items-start space-y-6">
                  <div className="flex flex-col gap-3 items-start">
                    <div className="w-40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="AI Icon"
                        className="w-full h-auto"
                        src="/assets/brand/logo-01.svg"
                      />
                    </div>
                    <h2 className="md:text-xl text-center md:text-left lg:text-2xl font-semibold text-[#F4F7FF]">
                      10x Faster Review Replies with AI
                    </h2>
                  </div>
                  <p className="text-gray-400 text-sm text-left md:leading-relaxed">
                    Transform customer reviews into professional responses in
                    seconds. Our AI understands context, tone, and sentiment to
                    craft replies that maintain your brand voice while addressing
                    customer concerns effectively. Save time and ensure
                    consistent, high-quality communication across all your review
                    platforms.
                  </p>
                  <Link
                    href="/GetStarted?mode=signup"
                    className="bg-white text-black font-medium px-6 py-3 rounded-full w-fit hover:bg-[#00FFE9] transition-colors"
                  >
                    Get Started
                  </Link>
                </div>

                {/* Right Column — Form */}
                <div className="flex flex-col items-center w-full justify-center space-y-6">
                  {/* Star Rating Selector */}
                  <div className="w-full">
                    <p className="text-xs text-[#C3C3C3] mb-2">Review rating</p>
                    <div className="flex gap-1">
                      {STAR_RATINGS.map((star) => {
                        const filled = star <= (hoveredStar || starRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            aria-label={`${star} star`}
                            onClick={() => setStarRating(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="cursor-pointer transition-transform hover:scale-110"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill={filled ? "#FFD700" : "none"}
                              stroke={filled ? "#FFD700" : "#555"}
                              strokeWidth="1.5"
                              aria-hidden="true"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Textarea */}
                  <textarea
                    placeholder="Paste your review here"
                    className="w-full rounded-xl p-4 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#00FFE9] min-h-[150px]"
                    style={{
                      background: "rgba(11,9,10,0.2)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(12px)",
                    }}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />

                  {/* Reviewer Name Input */}
                  <input
                    placeholder="Enter reviewer's name (optional)"
                    className="w-full rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00FFE9]"
                    style={{
                      background: "rgba(11,9,10,0.2)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(12px)",
                    }}
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                  />

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || loading}
                    className="w-full cursor-pointer px-8 py-3 rounded-full text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: canGenerate && !loading
                        ? "linear-gradient(135deg, #00FFE9 0%, #00B4D8 100%)"
                        : "rgba(255,255,255,0.1)",
                      color: canGenerate && !loading ? "#000" : "#fff",
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      "Generate a reply"
                    )}
                  </button>

                  {/* Error */}
                  {error && (
                    <div className="w-full rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Generated Reply Output */}
                  {reply && (
                    <div className="w-full space-y-3">
                      <div
                        className="w-full rounded-xl p-4 text-gray-200 text-sm leading-relaxed"
                        style={{
                          background: "rgba(0,255,233,0.05)",
                          border: "1px solid rgba(0,255,233,0.3)",
                        }}
                      >
                        {reply}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCopy}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[#FFFFFF33] text-[#C3C3C3] hover:border-[#00FFE9] hover:text-[#00FFE9] transition-colors cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={handleRegenerate}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[#FFFFFF33] text-[#C3C3C3] hover:border-[#00FFE9] hover:text-[#00FFE9] transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M8 16H3v5" />
                          </svg>
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden text-white pt-20 pb-10 border-t border-[#00FFE9]/20">
        <div className="absolute inset-0 pointer-events-none -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/effects/footer-effect.svg"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="max-w-7xl mx-auto flex px-4 justify-between flex-col gap-4 lg:flex-row lg:items-center z-10">
          <div className="space-y-4">
            <div className="w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/logo-02.svg"
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
                src="/assets/social/facebook.svg"
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

