"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardShell from "@/components/DashboardShell";

type ReviewLinkResponse = {
  businessName: string;
  reviewLink: string;
  placeId: string | null;
  error?: string;
};

export default function GetMoreReviewsPage() {
  const [businessName, setBusinessName] = useState("Your Business");
  const [reviewLink, setReviewLink] = useState("");
  const [loadingLink, setLoadingLink] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void fetch("/api/google/review-link", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as ReviewLinkResponse | null;
        if (!res.ok || !json) {
          throw new Error(
            json?.error ||
              "Could not load your Google review link. Connect your business profile first."
          );
        }
        return json;
      })
      .then((json) => {
        if (!mounted || !json) return;
        setBusinessName(json.businessName || "Your Business");
        setReviewLink(json.reviewLink || "");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your Google review link."
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingLink(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedReviewLink = useMemo(() => reviewLink.trim(), [reviewLink]);
  const hasReviewLink = normalizedReviewLink.length > 0;
  const encodedLink = useMemo(
    () => encodeURIComponent(normalizedReviewLink),
    [normalizedReviewLink]
  );

  const emailHref = useMemo(() => {
    const subject = encodeURIComponent(`Please review ${businessName}`);
    const body = encodeURIComponent(
      `We would love to hear your feedback. Please leave us a review here: ${normalizedReviewLink}`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }, [businessName, normalizedReviewLink]);

  const whatsAppHref = useMemo(() => {
    const text = encodeURIComponent(
      `Please leave us a review for ${businessName}: ${normalizedReviewLink}`
    );
    return `https://wa.me/?text=${text}`;
  }, [businessName, normalizedReviewLink]);

  const facebookHref = useMemo(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
    [encodedLink]
  );

  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodedLink}`,
    [encodedLink]
  );

  async function handleCopyLink() {
    if (!hasReviewLink) return;
    await navigator.clipboard.writeText(normalizedReviewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  async function handleDownloadQr() {
    try {
      setDownloading(true);
      setError("");
      const res = await fetch(qrUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to generate QR code.");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "business"}-review-qr.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download QR code.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <DashboardShell activeHref="/dashboard/get-more-reviews">
      <div className="h-full">
        <div
          className="brand-scrollbar rounded-3xl border border-[#E6E9F8] p-6 md:p-10 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(255,255,255,0.82)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#040404]">Get More Reviews</h1>
            <p className="text-sm text-[#6A6A82] mt-2">
              Make it easy for customers to review {businessName} on Google.
            </p>
          </div>

          {error && (
            <p className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-2xl border border-[#5F30EB22] p-6 space-y-5"
              style={{ background: "rgba(255,255,255,0.9)" }}
            >
              <div>
                <h2 className="text-lg font-semibold text-[#040404]">Share Review Link</h2>
                <p className="text-sm text-[#6A6A82] mt-1">
                  Your Google review link is loaded automatically from the connected business profile.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="review-link" className="text-xs text-[#6A6A82] uppercase tracking-wide">
                  Review Link
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[#5F30EB22] bg-[#F8F9FF] p-3">
                  {loadingLink ? (
                    <p className="flex-1 text-sm text-[#6A6A82]">Loading review link...</p>
                  ) : (
                    <p id="review-link" className="flex-1 truncate text-sm text-[#040404]">
                      {hasReviewLink ? normalizedReviewLink : "No review link available yet."}
                    </p>
                  )}
                  <button
                    onClick={handleCopyLink}
                    disabled={!hasReviewLink}
                    className="rounded-lg border border-[#5F30EB30] px-3 py-2 text-xs font-medium text-[#5F30EB] hover:bg-[#5F30EB10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <a
                  href={hasReviewLink ? emailHref : "#"}
                  className={`rounded-xl border border-[#5F30EB22] bg-[#F8F9FF] p-3 text-center text-sm text-[#4F4F63] hover:border-[#5F30EB66] hover:bg-[#EEF2FF] transition-colors ${
                    hasReviewLink ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  Email
                </a>
                <a
                  href={hasReviewLink ? whatsAppHref : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-xl border border-[#5F30EB22] bg-[#F8F9FF] p-3 text-center text-sm text-[#4F4F63] hover:border-[#5F30EB66] hover:bg-[#EEF2FF] transition-colors ${
                    hasReviewLink ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  WhatsApp
                </a>
                <a
                  href={hasReviewLink ? facebookHref : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-xl border border-[#5F30EB22] bg-[#F8F9FF] p-3 text-center text-sm text-[#4F4F63] hover:border-[#5F30EB66] hover:bg-[#EEF2FF] transition-colors ${
                    hasReviewLink ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  Facebook
                </a>
              </div>

              <div className="rounded-xl border border-[#00E0FF44] bg-[#00E0FF12] p-4">
                <p className="text-sm text-[#4F4F63]">
                  Businesses with 5 or more reviews can get up to <span className="font-semibold text-[#040404]">2x more customers</span>.
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl border border-[#5F30EB22] p-6 flex flex-col items-center text-center"
              style={{ background: "rgba(255,255,255,0.9)" }}
            >
              <h2 className="text-lg font-semibold text-[#040404]">Share via QR Code</h2>
              <p className="text-sm text-[#6A6A82] mt-1 max-w-sm">
                Display this QR code in your store or include it in printed materials.
              </p>

              <div className="mt-5 rounded-2xl bg-white p-4 border border-[#5F30EB22] shadow-[0_6px_30px_rgba(95,48,235,0.12)]">
                {hasReviewLink ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="Review QR Code" className="w-52 h-52 md:w-64 md:h-64 object-contain" />
                  </>
                ) : (
                  <div className="w-52 h-52 md:w-64 md:h-64 grid place-items-center text-sm text-[#8A8AA0]">
                    Connect Google Business to generate QR.
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadQr}
                disabled={downloading || !hasReviewLink}
                className="mt-5 w-full max-w-xs rounded-xl bg-[#5F30EB] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {downloading ? "Downloading..." : "Download QR Code"}
              </button>

              <p className="text-xs text-[#8A8AA0] mt-3">You can print and share this QR code anywhere customers can scan.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
