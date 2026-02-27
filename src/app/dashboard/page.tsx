"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";

type GoogleStatus = {
  configured: boolean;
  linkedAccount: boolean;
  connected: boolean;
  business: {
    id: string;
    name: string;
    googleLocationId: string;
  } | null;
  requiredScopes: string[];
};

type ReviewSummary = {
  total: number;
  replied: number;
  pending: number;
};

type GoogleConnectErrorResponse = {
  error?: string;
  errorCode?: string;
  action?: "relink_google" | "check_google_setup" | "none";
};

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [summary, setSummary] = useState<ReviewSummary>({
    total: 0,
    replied: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const handledOauthCallback = useRef(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    const statusRes = await fetch("/api/google/status", { cache: "no-store" });
    const statusJson = await parseJsonSafe<GoogleStatus & { error?: string }>(statusRes);

    if (!statusRes.ok || !statusJson) {
      setError(statusJson?.error || "Failed to load Google connection status.");
      setLoading(false);
      return;
    }

    setStatus(statusJson);

    const reviewRes = await fetch("/api/reviews?status=all&page=1&per_page=1", {
      cache: "no-store",
    });
    const reviewJson = await parseJsonSafe<{
      summary?: ReviewSummary;
    }>(reviewRes);

    if (reviewRes.ok && reviewJson?.summary) {
      setSummary(reviewJson.summary);
    }

    setLoading(false);
  }, []);

  const startGoogleLinkFlow = useCallback(async () => {
    setConnecting(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/link-social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/dashboard?google=linked",
          scopes: status?.requiredScopes,
        }),
      });

      const json = await parseJsonSafe<{ url?: string; error?: { message?: string } }>(res);

      if (!res.ok || !json?.url) {
        setError(json?.error?.message || "Failed to start Google OAuth flow.");
        return;
      }

      window.location.href = json.url;
    } finally {
      setConnecting(false);
    }
  }, [status?.requiredScopes]);

  const connectAndSync = useCallback(async () => {
    setConnecting(true);
    setSyncing(true);
    setError("");
    setNotice("");

    try {
      const connectRes = await fetch("/api/google/connect", {
        method: "POST",
      });
      const connectJson = await parseJsonSafe<GoogleConnectErrorResponse>(connectRes);
      if (!connectRes.ok) {
        if (connectJson?.action === "relink_google") {
          setNotice(connectJson.error || "Reconnecting Google permissions...");
          await startGoogleLinkFlow();
          return;
        }

        setError(connectJson?.error || "Failed to connect Google Business Profile.");
        return;
      }

      const syncRes = await fetch("/api/google/sync-reviews", {
        method: "POST",
      });
      const syncJson = await parseJsonSafe<{ error?: string; synced?: number }>(syncRes);
      if (!syncRes.ok) {
        setError(syncJson?.error || "Connected, but review sync failed.");
        return;
      }

      setNotice(`Google connected successfully. Synced ${syncJson?.synced ?? 0} reviews.`);
      await loadStatus();
    } finally {
      setConnecting(false);
      setSyncing(false);
    }
  }, [loadStatus, startGoogleLinkFlow]);

  async function handleConnect() {
    if (!status) return;

    if (!status.configured) {
      setError("Google OAuth is not configured in environment variables.");
      return;
    }

    if (!status.linkedAccount) {
      await startGoogleLinkFlow();
      return;
    }

    await connectAndSync();
  }

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (searchParams.get("google") !== "linked" || handledOauthCallback.current) {
      return;
    }
    handledOauthCallback.current = true;

    void (async () => {
      await connectAndSync();
      router.replace("/dashboard");
    })();
  }, [connectAndSync, searchParams, router]);

  const connected = Boolean(status?.connected);

  const connectionLabel = useMemo(() => {
    if (loading) {
      return "Loading connection state...";
    }

    if (!status?.configured) {
      return "Google OAuth env vars are missing (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).";
    }

    if (!status.linkedAccount) {
      return "Google account is not linked yet.";
    }

    if (!status.connected) {
      return "Google account linked. Click connect to load your business profile.";
    }

    return `${status.business?.name || "Business"} connected.`;
  }, [loading, status]);

  return (
    <DashboardShell activeHref="/dashboard">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#5F30EB]/20 p-6 md:p-10 min-h-[70vh] max-h-[calc(100vh-150px)] backdrop-blur-[80px] overflow-y-auto"
          style={{
            background: "rgba(255,255,255,0.82)",
            boxShadow: "0 -4px 100px 21px #efefef14 inset",
          }}
        >
          <h2 className="text-xl md:text-2xl font-medium mb-6">
            Connect Your Google Business Profile
          </h2>

          <div
            className="flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-[#E6E9F8] p-3"
            style={{ background: "rgba(255,255,255,0.82)" }}
          >
            <input
              readOnly
              value={connectionLabel}
              className={`flex-1 px-4 py-3 outline-none bg-transparent ${
                connected ? "text-[#5F30EB]" : "text-[#4F4F63]"
              }`}
              type="text"
            />
            <button
              onClick={handleConnect}
              disabled={loading || connecting || syncing || connected}
              className="px-6 py-3 rounded-xl font-medium transition-all text-black disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,255,233,0.67), rgba(95,48,235,0.2))",
                boxShadow: "0px 4.65px 9.3px 1.16px #F4F4FE40 inset",
              }}
            >
              {connecting || syncing ? "Connecting..." : connected ? "Connected" : "Connect Business Profile"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}

          {notice && (
            <p className="mt-4 text-sm text-[#5F30EB]">{notice}</p>
          )}

          {!connected && (
            <div className="mt-8 space-y-4">
              <p className="text-[#6A6A82] text-sm leading-relaxed max-w-lg">
                Link Google first, then connect and sync reviews so AI replies can be generated and posted from real business data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {[
                  {
                    step: "1",
                    title: "Link",
                    desc: "Link your Google account with business scope.",
                  },
                  {
                    step: "2",
                    title: "Connect",
                    desc: "Attach the first business profile from your account.",
                  },
                  {
                    step: "3",
                    title: "Sync",
                    desc: "Pull Google reviews into your workspace database.",
                  },
                ].map((card) => (
                  <div
                    key={card.step}
                    className="rounded-2xl border border-[#5F30EB26] p-5"
                    style={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#5F30EB20] border border-[#5F30EB40] flex items-center justify-center text-[#5F30EB] font-bold text-sm mb-3">
                      {card.step}
                    </div>
                    <h3 className="font-semibold text-[#040404] mb-1">{card.title}</h3>
                    <p className="text-[#6A6A82] text-sm leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connected && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-3 text-[#5F30EB]">
                <span className="text-sm font-medium">
                  Google Business Profile connected. Go to{" "}
                  <Link href="/dashboard/overview" className="underline hover:text-[#040404] transition-colors">
                    Overview
                  </Link>{" "}
                  to manage real reviews.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Reviews", value: summary.total },
                  { label: "Replied", value: summary.replied },
                  { label: "Pending", value: summary.pending },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[#5F30EB26] p-5 flex flex-col gap-2"
                    style={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <span className="text-3xl font-bold text-[#040404]">{stat.value}</span>
                    <span className="text-[#6A6A82] text-sm">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

