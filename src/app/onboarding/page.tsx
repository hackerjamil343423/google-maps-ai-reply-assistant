"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { ChoiceGroup, Onboarding, TipsList } from "@/components/ui/onboarding";

// ── Feature data for Step 1 ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
    title: "AI-Powered Replies",
    description:
      "Automatically generate personalised, on-brand responses to every Google review.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 21v-6" />
        <path d="M12 21V3" />
        <path d="M19 21V9" />
      </svg>
    ),
    title: "Analytics & Insights",
    description:
      "Track reply rates, average ratings, and monthly trends in one clear dashboard.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: "Review Link",
    description:
      "Share a direct link that makes it effortless for happy customers to leave 5-star reviews.",
  },
];

// ── Tone options for Step 3 ────────────────────────────────────────────────────

const TONES = [
  {
    value: "Professional",
    description: "Polished and business-appropriate",
  },
  {
    value: "Friendly",
    description: "Warm, approachable, and conversational",
  },
  {
    value: "Concise",
    description: "Short and straight to the point",
  },
  {
    value: "Empathetic",
    description: "Understanding and emotionally aware",
  },
];

// ── Google status type ─────────────────────────────────────────────────────────

type GoogleStatus = {
  configured: boolean;
  linkedAccount: boolean;
  connected: boolean;
  business: { name: string } | null;
  requiredScopes: string[];
};

// ── Inner page (needs Suspense for useSearchParams) ────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledCallback = useRef(false);

  // Read initial step from URL (e.g. after Google OAuth redirect)
  const urlStep = Number(searchParams.get("step"));
  const initialStep = urlStep >= 1 && urlStep <= 4 ? urlStep : 1;

  // ── Step 2: Google connect state ──
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // ── Step 3: Tone state ──
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [savedSettings, setSavedSettings] = useState<{
    prompt: string;
    postType: string;
  } | null>(null);

  // ── Step 4: Completing ──
  const [completing, setCompleting] = useState(false);

  // Load Google status on mount
  useEffect(() => {
    void fetch("/api/google/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: GoogleStatus) => {
        setGoogleStatus(data);
        if (data.connected) setGoogleConnected(true);
      })
      .catch(() => null);
  }, []);

  // Load current AI settings on mount (needed for PUT in step 3)
  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { prompt?: string; postType?: string }) => {
        setSavedSettings({
          prompt: data.prompt ?? "",
          postType: data.postType ?? "auto",
        });
      })
      .catch(() => null);
  }, []);

  // Auto-connect when returning from Google OAuth (?google=linked)
  const connectAndSync = useCallback(async () => {
    setConnecting(true);
    setConnectError("");
    try {
      const res = await fetch("/api/google/connect", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Failed to connect business profile.");
      // Sync reviews in background
      void fetch("/api/google/sync-reviews", { method: "POST" });
      setGoogleConnected(true);
      // Clean up URL
      router.replace("/onboarding?step=2");
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Failed to connect. Please try again."
      );
    } finally {
      setConnecting(false);
    }
  }, [router]);

  useEffect(() => {
    if (
      searchParams.get("google") !== "linked" ||
      handledCallback.current
    )
      return;
    handledCallback.current = true;
    void connectAndSync();
  }, [searchParams, connectAndSync]);

  // Start Google OAuth link flow
  async function startGoogleLinkFlow() {
    setConnecting(true);
    setConnectError("");
    try {
      const res = await fetch("/api/auth/link-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/onboarding?step=2&google=linked",
          scopes: googleStatus?.requiredScopes,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        url?: string;
        error?: { message?: string };
      } | null;
      if (!res.ok || !json?.url) {
        throw new Error(json?.error?.message ?? "Failed to start Google OAuth.");
      }
      window.location.href = json.url;
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Failed to start Google OAuth."
      );
      setConnecting(false);
    }
  }

  async function handleConnectGoogle() {
    if (!googleStatus) return;
    if (!googleStatus.configured) {
      setConnectError("Google OAuth is not configured on this server.");
      return;
    }
    if (!googleStatus.linkedAccount) {
      await startGoogleLinkFlow();
      return;
    }
    await connectAndSync();
  }

  // Save tone selection
  async function handleToneChange(tone: string) {
    setSelectedTone(tone);
    if (!savedSettings) return;
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: savedSettings.prompt,
          tone,
          postType: savedSettings.postType,
        }),
      });
    } catch {
      // Non-blocking — user can still proceed
    }
  }

  // Complete onboarding
  async function handleComplete() {
    setCompleting(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // Continue anyway — worst case they re-do onboarding
    }
    router.push("/dashboard/overview");
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(95,48,235,0.10), transparent 28%), linear-gradient(180deg, #F8F7FF 0%, #F2EEFF 100%)",
      }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/wakkelni-logo.png"
              alt="Wakkelni"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold text-[#040404]">
              Wakkelni
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[#E6E1FA] bg-white px-8 py-8 shadow-[0_8px_40px_rgba(95,48,235,0.08)]">
          <Onboarding
            totalSteps={4}
            defaultValue={initialStep}
            canGoNext={(step) => {
              if (step === 2) return googleConnected;
              if (step === 3) return selectedTone !== null;
              return true;
            }}
            onComplete={handleComplete}
          >
            <Onboarding.StepIndicator variant="pills" />

            {/* ── Step 1: Welcome ──────────────────────────────── */}
            <Onboarding.Step step={1}>
              <Onboarding.Header
                title="Welcome to Wakkelni"
                description="Here's what you'll be able to do once you're set up."
              />
              <div className="flex flex-col gap-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-4 rounded-2xl border border-[#E6E1FA] bg-[#F8F7FF] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5F30EB]/10 text-[#5F30EB]">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#040404]">
                        {f.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6B6487]">
                        {f.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Onboarding.Navigation nextLabel="Let's get started" />
            </Onboarding.Step>

            {/* ── Step 2: Connect Google ───────────────────────── */}
            <Onboarding.Step step={2}>
              <Onboarding.Header
                title="Connect your business"
                description="Link your Google Business Profile so Wakkelni can access and reply to your reviews."
              />

              {/* Status card */}
              <div className="mb-6 rounded-2xl border border-[#E6E1FA] bg-[#F8F7FF] p-5">
                {googleConnected ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        {googleStatus?.business?.name
                          ? `${googleStatus.business.name} connected`
                          : "Business profile connected"}
                      </p>
                      <p className="text-xs text-green-600">
                        Ready to start replying to reviews
                      </p>
                    </div>
                  </div>
                ) : connecting ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5F30EB]/10">
                      <svg
                        className="animate-spin text-[#5F30EB]"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#040404]">
                        Connecting…
                      </p>
                      <p className="text-xs text-[#6B6487]">
                        This only takes a moment
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6E1FA]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6B6487"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#040404]">
                        Not connected yet
                      </p>
                      <p className="text-xs text-[#6B6487]">
                        Connect to start managing your reviews
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!googleConnected && (
                <button
                  type="button"
                  onClick={() => void handleConnectGoogle()}
                  disabled={connecting}
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[#E6E1FA] bg-white px-5 py-3.5 text-sm font-medium text-[#040404] transition-colors hover:bg-[#F8F7FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* Google icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  {connecting ? "Connecting…" : "Connect with Google"}
                </button>
              )}

              {connectError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {connectError}
                </div>
              )}

              <Onboarding.Navigation />
            </Onboarding.Step>

            {/* ── Step 3: AI Tone ──────────────────────────────── */}
            <Onboarding.Step step={3}>
              <Onboarding.Header
                title="Choose your reply tone"
                description="Pick the voice that best matches your brand. You can always change this later in Settings."
              />
              <ChoiceGroup
                name="tone"
                onValueChange={(v) => void handleToneChange(v)}
                orientation="grid"
              >
                {TONES.map((t) => (
                  <ChoiceGroup.Item key={t.value} value={t.value}>
                    <span className="flex flex-col">
                      <span>{t.value}</span>
                      <span className="mt-0.5 text-xs font-normal text-[#6B6487]">
                        {t.description}
                      </span>
                    </span>
                  </ChoiceGroup.Item>
                ))}
              </ChoiceGroup>
              <Onboarding.Navigation />
            </Onboarding.Step>

            {/* ── Step 4: You're ready ─────────────────────────── */}
            <Onboarding.Step step={4}>
              <Onboarding.Header
                title="You're all set!"
                description="Wakkelni is ready. Here are a few tips to get the most out of it."
              />
              <TipsList title="Quick tips">
                <TipsList.Item number={1}>
                  New reviews are picked up automatically — AI replies are
                  drafted and posted based on your approval mode.
                </TipsList.Item>
                <TipsList.Item number={2}>
                  Use the{" "}
                  <span className="font-medium text-[#5F30EB]">Review Link</span>{" "}
                  page to share a direct link with customers and collect more
                  5-star reviews.
                </TipsList.Item>
                <TipsList.Item number={3}>
                  Fine-tune your AI prompt and tone anytime in{" "}
                  <span className="font-medium text-[#5F30EB]">
                    Settings → AI
                  </span>
                  .
                </TipsList.Item>
              </TipsList>
              <Onboarding.Navigation
                completeLabel={completing ? "Opening dashboard…" : "Go to Dashboard"}
              />
            </Onboarding.Step>
          </Onboarding>
        </div>
      </div>
    </div>
  );
}

// ── Page export (Suspense boundary for useSearchParams) ────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF]">
          <svg
            className="animate-spin text-[#5F30EB]"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
