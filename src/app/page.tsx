"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Services", href: "/services" },
];

const WHY_CARDS = [
  {
    image: "/assets/landing/why-ranking.png",
    title: "Boost Your SEO",
    desc: "Google rewards activity. Businesses that respond to reviews rank higher on Google Maps and search results. Our tool ensures you never miss an opportunity to signal to Google that your business is active and relevant.",
  },
  {
    image: "/assets/landing/why-trust.png",
    title: "Build Trust",
    desc: "A response shows you care. When potential customers see you engaging with feedback, it establishes immediate trust. It encourages others to leave reviews because they know there is someone listening.",
  },
  {
    image: "/assets/landing/why-reputation.png",
    title: "Damage Control",
    desc: "Unhappy customers need to feel heard. Our AI helps you turn negative situations into displays of excellent customer service. Your thoughtful reply shows the world you care.",
  },
  {
    image: "/assets/landing/why-time.png",
    title: "The Ultimate CRM",
    desc: "Think of this as your automated Customer Relationship Management tool. Use responses to offer more information or mention current promotions - turning a simple review into an invitation for repeat business.",
  },
];

const COST_CARDS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Lost Revenue",
    desc: "You lose potential customers who think you are inactive or indifferent.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: "Lower Rankings",
    desc: "Google pushes your business down the list in favor of more active competitors.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Wasted Time",
    desc: "You stare at the screen, suffering from writer's block instead of running your business.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    ),
    title: "Reputation Damage",
    desc: "Leaving negative reviews unanswered lets the angry customer control the narrative.",
  },
];

const SERVE_CARDS = [
  {
    image: "/assets/landing/serve-agencies.png",
    title: "Marketing Agencies",
    desc: "Stop wasting hours writing manual replies for your clients. Whitelabel our AI automation tool and resell it to your clients at a healthy margin. It is the perfect add-on to generate recurring revenue while delivering tangible SEO results.",
  },
  {
    image: "/assets/landing/serve-local.png",
    title: "Local Businesses",
    desc: 'This is for the restaurant owner, plumber, dentist, beauty salon, and more. You want to cut down the hours spent manually typing responses. You want to rank higher in Google Maps\' "recommended businesses" without hiring a dedicated marketing manager.',
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

type BusinessSuggestion = {
  id: string;
  name: string;
  address: string;
  label: string;
};

type BusinessSearchResponse = {
  results?: BusinessSuggestion[];
  error?: string;
};

type BusinessReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  publishedAt: string | null;
};

type BusinessReviewsResponse = {
  business?: {
    id: string;
    name: string;
    address: string;
    rating: number | null;
    userRatingCount: number | null;
  };
  reviews?: BusinessReview[];
  error?: string;
};

type GenerateReplyResponse = {
  reply?: string;
  source?: "openai" | "template";
  error?: string;
};

type LandingPreviewItem = {
  id: string;
  authorName: string;
  rating: number;
  review: string;
  reply: string;
  source: "openai" | "template" | null;
  loading: boolean;
  error: string;
};

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function Home() {
  const { language, setLanguage, ready: languageReady } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<BusinessSuggestion[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessSuggestion | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewItems, setPreviewItems] = useState<LandingPreviewItem[]>([]);

  const searchRequestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);

  const fetchBusinessSuggestions = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/public/business-search?q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    const json = await parseJsonSafe<BusinessSearchResponse>(res);

    if (!res.ok) {
      throw new Error(json?.error || "Failed to search businesses.");
    }

    return json?.results ?? [];
  }, []);

  const loadBusinessPreview = useCallback(async (business: BusinessSuggestion) => {
    const requestId = ++previewRequestIdRef.current;
    setSelectedBusiness(business);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewItems([]);

    try {
      const reviewsRes = await fetch(
        `/api/public/business-reviews?placeId=${encodeURIComponent(business.id)}`,
        { cache: "no-store" }
      );
      const reviewsJson = await parseJsonSafe<BusinessReviewsResponse>(reviewsRes);

      if (!reviewsRes.ok) {
        throw new Error(
          reviewsJson?.error || "Failed to load reviews for this business."
        );
      }

      const reviews = (reviewsJson?.reviews ?? []).slice(0, 3);
      if (reviews.length === 0) {
        setPreviewError(
          "No public reviews found for this business yet. Try another listing."
        );
        return;
      }

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      setPreviewItems(
        reviews.map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          review: review.text,
          reply: "",
          source: null,
          loading: true,
          error: "",
        }))
      );

      await Promise.all(
        reviews.map(async (review) => {
          const replyRes = await fetch("/api/generate-reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              review: review.text,
              reviewerName: review.authorName,
              starRating: review.rating,
              businessName: business.name,
            }),
          });

          const replyJson = await parseJsonSafe<GenerateReplyResponse>(replyRes);

          if (requestId !== previewRequestIdRef.current) {
            return;
          }

          setPreviewItems((current) =>
            current.map((item) => {
              if (item.id !== review.id) {
                return item;
              }

              if (!replyRes.ok || !replyJson?.reply) {
                return {
                  ...item,
                  loading: false,
                  error:
                    replyJson?.error || "Failed to generate reply for this review.",
                };
              }

              return {
                ...item,
                loading: false,
                reply: replyJson.reply,
                source: replyJson.source ?? null,
                error: "",
              };
            })
          );
        })
      );
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load reviews and generate replies.";
      setPreviewError(message);
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setPreviewLoading(false);
      }
    }
  }, []);

  const handleSearchSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = searchValue.trim();

      if (query.length < 2) {
        setSearchError("Type at least 2 characters to search.");
        return;
      }

      setSearchError("");
      setSearchResults([]);

      if (
        selectedBusiness &&
        (query === selectedBusiness.label || query === selectedBusiness.name)
      ) {
        void loadBusinessPreview(selectedBusiness);
        return;
      }

      setSearchLoading(true);
      try {
        const results = await fetchBusinessSuggestions(query);
        if (results.length === 0) {
          setSearchError("No matching businesses found. Try a more specific name.");
          return;
        }

        const topResult = results[0];
        setSearchValue(topResult.label);
        setSearchResults([]);
        void loadBusinessPreview(topResult);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to search businesses.";
        setSearchError(message);
      } finally {
        setSearchLoading(false);
      }
    },
    [fetchBusinessSuggestions, loadBusinessPreview, searchValue, selectedBusiness]
  );

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

  useEffect(() => {
    const query = searchValue.trim();

    if (selectedBusiness && query === selectedBusiness.label) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    const timer = setTimeout(() => {
      setSearchLoading(true);
      void fetchBusinessSuggestions(query)
        .then((results) => {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }
          setSearchResults(results);
        })
        .catch(() => {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }
          setSearchResults([]);
        })
        .finally(() => {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }
          setSearchLoading(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [fetchBusinessSuggestions, searchValue, selectedBusiness]);

  return (
    <div className="landing-page min-h-screen text-[#040404]">
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

          {/* Desktop Nav Links */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex space-x-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  link.href === "/"
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
            <div className="relative">
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value === "ar" ? "ar" : "en")
                }
                disabled={!languageReady}
                aria-label="Language selector"
                className="h-10 rounded-full border border-[#5F30EB33] bg-white/90 pl-3 pr-8 text-sm text-[#4E4E5E] focus:outline-none focus:ring-2 focus:ring-[#5F30EB66] disabled:opacity-60 cursor-pointer appearance-none"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5F30EB]"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
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
              <div className="w-[180px] relative">
                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value === "ar" ? "ar" : "en")
                  }
                  disabled={!languageReady}
                  aria-label="Language selector"
                  className="w-full h-10 rounded-full border border-[#5F30EB33] bg-white/90 pl-3 pr-8 text-sm text-[#4E4E5E] focus:outline-none focus:ring-2 focus:ring-[#5F30EB66] disabled:opacity-60 cursor-pointer appearance-none"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5F30EB]"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
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

      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center pt-28 text-[#040404] px-4 pb-16 md:px-6 md:pb-20 md:pt-36">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="landing-grid-bg absolute inset-0 opacity-70" />
          <div className="absolute left-1/2 top-[8%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#00E0FF33] blur-3xl" />
          <div className="absolute left-[8%] top-[26%] h-[260px] w-[260px] rounded-full bg-[#5F30EB22] blur-3xl" />
          <div className="absolute bottom-[10%] right-[8%] h-[320px] w-[320px] rounded-full bg-[#5F30EB1C] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
          {/* Badge */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center">
              <div className="w-20 h-px bg-gradient-to-r from-transparent to-white shadow-lg shadow-white/50" />
              <div className="w-2 h-2 rotate-45 bg-white shadow-lg shadow-white/50" />
            </div>
            <div className="landing-glass-panel rounded-full px-4 py-2 sm:px-6 md:px-12">
              <span className="text-[#040404] text-[11px] sm:text-sm md:text-xl tracking-wider">
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
            <h1 className="text-xl sm:text-2xl md:text-4xl 2xl:text-5xl leading-tight font-semibold">
              Let AI respond to hundreds of your Google Business Profile reviews
              in your unique brand voice.
            </h1>
          </div>

          {/* Search Form */}
          <div className="mt-6 w-full flex flex-col items-center space-y-4">
            <form
              className="landing-glass-panel relative w-full flex flex-col items-center gap-3 rounded-lg p-3 md:flex-row md:rounded-full"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <input
                type="text"
                placeholder="Type your business name and address here"
                className="w-full bg-transparent text-[#040404] rounded-full px-4 py-3 focus:outline-none placeholder:text-[#6A6A82]"
                aria-label="Search business reviews"
                value={searchValue}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchValue(next);
                  if (selectedBusiness && next !== selectedBusiness.label) {
                    setSelectedBusiness(null);
                  }
                }}
              />
              <button
                type="submit"
                disabled={searchLoading || previewLoading}
                className="w-full md:w-auto cursor-pointer bg-white text-black px-6 py-3 font-bold rounded-lg md:rounded-full transition hover:bg-[#5F30EB] hover:text-[#F6F4FF] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Submit search"
              >
                {searchLoading || previewLoading ? "Loading..." : "Go!"}
              </button>
            </form>

            {(searchLoading || searchResults.length > 0) && (
              <div className="landing-glass-panel w-full max-w-3xl overflow-hidden rounded-2xl">
                {searchLoading && (
                  <div className="px-4 py-3 text-sm text-[#6A6A82]">
                    Searching businesses...
                  </div>
                )}
                {!searchLoading &&
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setSearchValue(result.label);
                        setSearchResults([]);
                        setSearchError("");
                        void loadBusinessPreview(result);
                      }}
                      className="w-full border-t border-[#5F30EB14] px-4 py-3 text-start transition-colors hover:bg-[#EEF2FF]"
                    >
                      <p className="text-sm text-[#040404] font-medium">{result.name}</p>
                      {result.address && (
                        <p className="text-xs text-[#6A6A82] mt-1">{result.address}</p>
                      )}
                    </button>
                  ))}
              </div>
            )}

            {searchError && (
              <p className="text-sm text-red-400 text-center max-w-3xl">{searchError}</p>
            )}

            <div className="text-center text-[#4F4F63] max-w-2xl px-4">
              <p>
                Try It For FREE! Enter your business name as it appears on
                Google above and watch the AI respond to 3 of your reviews
                instantly. No credit card required.
              </p>
            </div>

            {(previewLoading || previewError || previewItems.length > 0) && (
              <div className="landing-glass-panel mt-4 w-full max-w-5xl rounded-3xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <h3 className="text-lg md:text-xl font-semibold text-[#040404]">
                    Live Review Reply Preview
                  </h3>
                  {selectedBusiness && (
                    <p className="text-xs md:text-sm text-[#5F30EB]">
                      {selectedBusiness.name}
                    </p>
                  )}
                </div>

                {previewLoading && previewItems.length === 0 && (
                  <p className="text-sm text-[#6A6A82]">
                    Loading reviews and generating replies...
                  </p>
                )}

                {previewError && (
                  <p className="text-sm text-red-400 mb-3">{previewError}</p>
                )}

                {previewItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {previewItems.map((item) => (
                      <article
                        key={item.id}
                        className="landing-card rounded-2xl p-4 text-start"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm text-[#040404] font-medium truncate">
                            {item.authorName}
                          </p>
                          <p className="text-xs text-[#5F30EB]">
                            {"\u2605".repeat(Math.max(1, Math.min(5, item.rating)))}
                          </p>
                        </div>
                        <p className="text-xs text-[#4F4F63] leading-relaxed mb-4">
                          {item.review}
                        </p>

                        <div className="rounded-lg border border-[#5F30EB30] bg-[#5F30EB0D] p-3 min-h-[110px]">
                          {item.loading && (
                            <p className="text-xs text-[#4F4F63]">
                              Generating AI reply...
                            </p>
                          )}
                          {!item.loading && item.error && (
                            <p className="text-xs text-red-300">{item.error}</p>
                          )}
                          {!item.loading && !item.error && (
                            <>
                              <p className="text-xs text-[#040404] leading-relaxed">
                                {item.reply}
                              </p>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why Your Business Needs This */}
      <section className="landing-section-divider py-12 md:py-24 text-[#040404] grid place-items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold mb-3 md:mb-4">
              Why Your Business Needs This
            </h2>
            <p className="text-[#4E4E5E] text-sm md:text-lg max-w-2xl mx-auto">
              You might forget to respond to a customer for months, but our AI
              never sleeps. Responding to reviews is not just polite; it is a
              critical engine for growth.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {WHY_CARDS.map((card) => (
              <div key={card.title} className="landing-card rounded-3xl p-5 sm:p-6 md:p-8 flex items-center gap-4 md:gap-6 text-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{card.title}</h3>
                  <p className="text-[#6A6A82] text-sm md:text-base leading-relaxed">{card.desc}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 object-contain flex-shrink-0 drop-shadow-sm" alt="" />
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/GetStarted?mode=signup"
              className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* The Cost of Silence */}
      <section className="landing-section-divider landing-alt-section py-12 md:py-24 text-[#040404]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold mb-3 md:mb-4">
              The Cost of Silence
            </h2>
            <p className="text-[#4E4E5E] text-sm md:text-lg max-w-2xl mx-auto">
              What happens when you ignore your reviews?
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COST_CARDS.map((card) => (
              <div key={card.title} className="landing-card rounded-3xl p-6 text-start">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-[#6A6A82] text-sm leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Customers We Serve */}
      <section className="landing-section-divider py-12 md:py-24 text-[#040404]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold mb-3 md:mb-4">
              The Customers We Serve
            </h2>
          </div>
          <div className="flex flex-col gap-6 md:gap-8">
            {SERVE_CARDS.map((card) => (
              <div key={card.title} className="landing-card rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 md:gap-12 text-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} className="w-36 h-36 sm:w-44 sm:h-44 md:w-56 md:h-56 object-contain flex-shrink-0 drop-shadow-md" alt="" />
                <div className="flex-1 min-w-0 text-center sm:text-start">
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{card.title}</h3>
                  <p className="text-[#6A6A82] text-base md:text-lg leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section-divider relative overflow-hidden py-12 md:py-24 text-[#040404]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold mb-3 md:mb-4">
              Pricing
            </h2>
            <p className="text-[#4E4E5E] text-sm md:text-lg max-w-2xl mx-auto">
              Ready to transform your business through AI? Understanding your
              review content can be tough. Simplify the process with our pre-set
              questions to uncover customer pain points conveniently.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`landing-card rounded-3xl p-6 md:p-8 flex flex-col ${
                  plan.highlighted ? "ring-2 ring-[#5F30EB4D] md:-translate-y-3" : ""
                }`}
              >
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-[#6A6A82] text-sm mb-5 leading-relaxed">
                  {plan.tagline}
                </p>
                <div className="mb-6 pb-6 border-b border-[#5F30EB14]">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[#6A6A82] text-sm ml-1">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm text-[#4E4E5E]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5F30EB"
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
                <Link
                  href="/GetStarted?mode=signup"
                  className={`block text-center py-3 rounded-full font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-[#5F30EB] text-[#F6F4FF] hover:bg-[#040404]"
                      : "bg-white text-black hover:bg-[#5F30EB] hover:text-[#F6F4FF]"
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
              className="inline-block border border-[#5F30EB] text-[#5F30EB] px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#5F30EB] hover:text-[#F6F4FF] transition-colors"
            >
              Start FREE Trial
            </Link>
            <p className="text-[#6A6A82] text-sm mt-3">
              No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Join Us / CTA Banner */}
      <section className="landing-section-divider relative overflow-hidden py-12 md:py-24">
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="landing-glass-panel relative overflow-hidden rounded-[2rem] px-5 py-10 text-center sm:px-8 sm:py-12 md:px-14">
            <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-50" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[#00E0FF2E] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-[#5F30EB2A] blur-3xl" />
            <div className="relative z-10">
              <h2 className="mb-4 text-2xl font-semibold sm:mb-6 sm:text-3xl md:text-5xl">Join Us</h2>
              <h3 className="mb-3 text-lg font-medium sm:mb-4 sm:text-xl md:text-2xl">
                Ready to Save Time and Rank Higher?
              </h3>
              <p className="mx-auto mb-8 max-w-2xl text-base text-[#4E4E5E] sm:mb-10 sm:text-lg">
                Your customers are talking about you. It is time to join the
                conversation.
              </p>
              <Link
                href="/GetStarted?mode=signup"
                className="inline-block rounded-full bg-white px-10 py-4 text-lg font-semibold text-black transition-colors hover:bg-[#5F30EB] hover:text-[#F6F4FF]"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-section-divider relative overflow-hidden py-10 md:py-12">
        <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-35" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/wakkelni-logo.png"
                alt="Wakkelni Stars Logo"
                className="h-10 w-auto object-contain"
              />
              <p className="text-[#6A6A82] text-sm max-w-xs text-center md:text-start">
                Transform customer feedback into meaningful connections. Our
                AI-powered platform helps businesses respond to reviews with
                personalized, professional replies.
              </p>
              <div className="flex items-center gap-4">
                {/* X (Twitter) */}
                <a href="https://x.com/wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-[#6A6A82] hover:text-[#5F30EB] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.858L1.717 2.25H8.19l4.26 5.632 5.795-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                {/* Facebook */}
                <a href="https://www.facebook.com/Wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#6A6A82] hover:text-[#5F30EB] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                {/* Telegram */}
                <a href="https://t.me/wakkelniai" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-[#6A6A82] hover:text-[#5F30EB] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
                {/* LinkedIn */}
                <a href="https://www.linkedin.com/company/wakklniai" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-[#6A6A82] hover:text-[#5F30EB] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                {/* Instagram */}
                <a href="https://www.instagram.com/wakkelniai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#6A6A82] hover:text-[#5F30EB] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
              </div>
            </div>
            <nav className="flex flex-col items-center md:items-end gap-3">
              <div className="flex flex-wrap justify-center gap-6 text-sm text-[#6A6A82]">
                <Link
                  href="/"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/about"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  About Us
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/services"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  Services
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-[#5F30EB] transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </nav>
          </div>
          <div className="text-center mt-10 text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Wakkelni Stars. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}


