"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
];

const STAR_RATINGS = [1, 2, 3, 4, 5];

export default function DemoPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [review, setReview] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [starRating, setStarRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = review.trim().length > 0;

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
    <div className="landing-page min-h-screen text-[#2F2E46]">
      {/* Navbar */}
      <nav
        className="landing-glass-panel fixed left-1/2 top-4 z-50 w-[92vw] max-w-[1120px] -translate-x-1/2 rounded-full px-4 py-3 md:px-6 md:py-4 lg:px-8"
        style={{
          boxShadow:
            "0 12px 34px rgba(4, 4, 4, 0.1), 0 0 0 1px rgba(95, 48, 235, 0.14) inset",
        }}
      >
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/wakkelni-logo.png"
              alt="Wakkelni Stars Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="font-semibold text-[#040404] text-sm whitespace-nowrap">Wakkelni Stars</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex space-x-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  link.href === "/demo"
                    ? "text-[#4E4E5E]"
                    : "text-[#4E4E5E]/50 hover:text-[#4E4E5E]/70"
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
                href="/dashboard/analytics"
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
                  href="/dashboard/analytics"
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

      {/* Demo Section */}
      <section className="min-h-screen relative mb-8 md:mb-0 pt-24 md:pt-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="landing-grid-bg absolute inset-0 opacity-70" />
          <div className="absolute left-1/2 top-[8%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#00E0FF33] blur-3xl" />
          <div className="absolute left-[8%] top-[26%] h-[260px] w-[260px] rounded-full bg-[#5F30EB22] blur-3xl" />
          <div className="absolute bottom-[10%] right-[8%] h-[320px] w-[320px] rounded-full bg-[#5F30EB1C] blur-3xl" />
        </div>

        <div className="w-full relative flex justify-center py-20">

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
                  className="px-6 md:px-12 py-2 rounded-full border border-[#5F30EB33]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(2,7,26,0.04) 0%, rgba(2,7,26,0.16) 100%)",
                    boxShadow: "0px 4px 8px 1px #F4F4FE40 inset",
                  }}
                >
                    <span className="text-[#4E4E5E] text-[12px] md:text-xl tracking-wider">
                      Demo
                    </span>
                </div>
                <div className="hidden md:flex items-center">
                  <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
                  <div className="w-20 h-px bg-gradient-to-l from-transparent to-white shadow-lg shadow-white/50" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-bold text-xl md:text-2xl lg:text-4xl text-[#2F2E46]">
                  Reply With AI
                </h1>
                <p className="text-sm text-[#4E4E5E]">
                  Write perfect reply within seconds
                </p>
              </div>
            </div>

            {/* Main Card */}
            <div className="flex justify-center items-center">
              <div
                className="max-w-6xl w-full grid lg:grid-cols-2 gap-10 rounded-2xl p-10"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid #E6E9F8",
                  boxShadow: "0 12px 34px rgba(95, 48, 235, 0.08)",
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
                        className="h-10 w-auto object-contain"
                        src="/assets/brand/wakkelni-logo.png"
                      />
                    </div>
                    <h2 className="md:text-xl text-center md:text-left lg:text-2xl font-semibold text-[#2F2E46]">
                      10x Faster Review Replies with AI
                    </h2>
                  </div>
                  <p className="text-[#6A6A82] text-sm text-left md:leading-relaxed">
                    Transform customer reviews into professional responses in
                    seconds. Our AI understands context, tone, and sentiment to
                    craft replies that maintain your brand voice while addressing
                    customer concerns effectively. Save time and ensure
                    consistent, high-quality communication across all your review
                    platforms.
                  </p>
                  <Link
                    href="/GetStarted?mode=signup"
                    className="bg-[#5F30EB] text-white font-medium px-6 py-3 rounded-full w-fit hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </Link>
                </div>

                {/* Right Column — Form */}
                <div className="flex flex-col items-center w-full justify-center space-y-6">
                  {/* Star Rating Selector */}
                  <div
                    className="w-full rounded-xl border border-[#5F30EB22] bg-[#F8F9FF] p-4"
                  >
                    <p className="mb-3 text-xs font-medium text-[#5F30EB]">Review rating</p>
                    <div className="flex gap-1.5">
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
                            className="cursor-pointer rounded-lg p-1 transition-all hover:scale-110 hover:bg-[#5F30EB10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F30EB66]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill={filled ? "#F5C518" : "none"}
                              stroke={filled ? "#F5C518" : "#B7B3D9"}
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
                    className="w-full rounded-xl p-4 text-[#3E3E52] placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#5F30EB] min-h-[150px]"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DDE2FF",
                      backdropFilter: "blur(12px)",
                    }}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />

                  {/* Reviewer Name Input */}
                  <input
                    placeholder="Enter reviewer's name (optional)"
                    className="w-full rounded-xl p-4 text-[#3E3E52] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5F30EB]"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DDE2FF",
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
                    className="w-full cursor-pointer px-8 py-3 rounded-full text-white font-medium transition-all disabled:cursor-not-allowed"
                    style={{
                      background: canGenerate && !loading
                        ? "linear-gradient(135deg, #5F30EB 0%, #00E0FF 100%)"
                        : "#E6E9F8",
                      color: canGenerate && !loading ? "#FFFFFF" : "#8A8AA0",
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
                        className="w-full rounded-xl p-4 text-[#3E3E52] text-sm leading-relaxed"
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
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[#5F30EB33] text-[#4E4E5E] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-colors cursor-pointer"
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
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[#5F30EB33] text-[#4E4E5E] hover:border-[#5F30EB] hover:text-[#5F30EB] transition-colors cursor-pointer disabled:opacity-40"
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
      <footer className="relative overflow-hidden text-[#040404] pt-20 pb-10 border-t border-[#5F30EB]/20">
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
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/wakkelni-logo.png"
                alt="Wakkelni Stars Logo"
                className="h-10 w-auto object-contain"
              />
              <span className="font-semibold text-[#040404] text-sm">Wakkelni Stars</span>
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


