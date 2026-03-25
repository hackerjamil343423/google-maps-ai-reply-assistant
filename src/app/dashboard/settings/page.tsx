"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import { DEFAULT_AI_PROMPT, TONE_OPTIONS } from "@/lib/ai/default-settings";

type PostType = "auto" | "review";
type Role = "VIEWER" | "EDITOR" | "MANAGER";
type TeamMember = {
  id: string;
  kind: "active" | "invitation";
  email: string;
  role: Role;
  business: string;
  status: "active" | "pending";
  joinedAt: string;
  canEditRole: boolean;
  canRemove: boolean;
};
type GoogleStatus = {
  configured: boolean;
  linkedAccount: boolean;
  connected: boolean;
  business: { name: string } | null;
  requiredScopes: string[];
};
type SubscriptionState = {
  plan: "Local Business" | "Multi-Location" | "Agency Max" | "free";
  status: "trialing" | "active" | "past_due" | "canceled";
  price: string;
  nextBillingAt: string;
  connectedAccounts: number;
  maxAccounts: number;
  aiReplies: number;
  reviewsManaged: number;
};

const INPUT =
  "w-full rounded-2xl border border-[#E6E9F8] bg-white/85 px-4 py-3 text-sm text-[#4F4F63] outline-none transition-all focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12";

const ROLE_COLORS: Record<Role, string> = {
  VIEWER: "text-[#6A6A82] bg-gray-500/10 border-gray-500/20",
  EDITOR: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  MANAGER: "text-[#5F30EB] bg-[#5F30EB]/10 border-[#5F30EB]/20",
};

const STATUS_COLORS: Record<TeamMember["status"], string> = {
  active: "text-green-500 bg-green-500/10 border-green-500/20",
  pending: "text-orange-500 bg-orange-500/10 border-orange-500/20",
};

const PLANS = [
  { name: "Local Business", price: "$15", accounts: "Up to 1 account" },
  { name: "Multi-Location", price: "$49", accounts: "Up to 5 accounts" },
  { name: "Agency Max", price: "$199", accounts: "Up to 60 accounts" },
] as const;

const FALLBACK_SUBSCRIPTION: SubscriptionState = {
  plan: "free",
  status: "trialing",
  price: "$0",
  nextBillingAt: "N/A",
  connectedAccounts: 0,
  maxAccounts: 1,
  aiReplies: 0,
  reviewsManaged: 0,
};

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function cardStyle() {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,244,255,0.88))",
    boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledGoogleCallback = useRef(false);
  const handledBillingParams = useRef(false);

  const [prompt, setPrompt] = useState(DEFAULT_AI_PROMPT);
  const [tone, setTone] = useState("Professional");
  const [postType, setPostType] = useState<PostType>("auto");
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [reviewSummary, setReviewSummary] = useState({ total: 0, replied: 0, pending: 0 });
  const [googleError, setGoogleError] = useState("");
  const [googleNotice, setGoogleNotice] = useState("");
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusiness, setInviteBusiness] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EDITOR");
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionState>(FALLBACK_SUBSCRIPTION);
  const [billingError, setBillingError] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      const nextPrompt = data.prompt || DEFAULT_AI_PROMPT;
      setPrompt(nextPrompt);
      setTone(data.tone || "Professional");
      setPostType(data.postType === "review" ? "review" : "auto");
    }

    const googleRes = await fetch("/api/google/status", { cache: "no-store" });
    const googleJson = await parseJsonSafe<GoogleStatus & { error?: string }>(googleRes);
    if (googleRes.ok && googleJson) {
      setGoogleStatus(googleJson);
    } else {
      setGoogleError(googleJson?.error || "Failed to load Google connection.");
    }

    const reviewsRes = await fetch("/api/reviews?status=all&page=1&per_page=1", { cache: "no-store" });
    const reviewsJson = await parseJsonSafe<{ summary?: typeof reviewSummary }>(reviewsRes);
    if (reviewsRes.ok && reviewsJson?.summary) {
      setReviewSummary(reviewsJson.summary);
    }

    const teamRes = await fetch("/api/team/members", { cache: "no-store" });
    const teamJson = await teamRes.json().catch(() => null);
    if (teamRes.ok) {
      const nextBusinesses = Array.isArray(teamJson?.businesses) ? teamJson.businesses : ["Primary Workspace"];
      setMembers(Array.isArray(teamJson?.members) ? teamJson.members : []);
      setBusinesses(nextBusinesses);
      setInviteBusiness((prev) => prev || nextBusinesses[0]);
    } else {
      setTeamError(teamJson?.error || "Failed to load team.");
    }

    const billingRes = await fetch("/api/subscription", { cache: "no-store" });
    const billingJson = await billingRes.json().catch(() => null);
    if (billingRes.ok) {
      setSubscription({ ...FALLBACK_SUBSCRIPTION, ...billingJson });
    } else {
      setBillingError(billingJson?.error || "Failed to load billing.");
    }
  }, []);

  useEffect(() => {
    if (handledBillingParams.current) return;
    handledBillingParams.current = true;
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");
    if (successParam === "true") {
      setBillingNotice("Your subscription has been activated.");
      router.replace("/dashboard/settings?section=billing");
    } else if (errorParam === "payment_failed") {
      setBillingError("Payment failed or was cancelled. Please try again.");
      router.replace("/dashboard/settings?section=billing");
    }
  }, [searchParams, router]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError("");
    setSavedSettings(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tone, postType }),
      });
      if (!res.ok) throw new Error("Failed to save settings.");
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function startGoogleLinkFlow() {
    setConnectingGoogle(true);
    const res = await fetch("/api/auth/link-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "/dashboard/settings?section=google&google=linked",
        scopes: googleStatus?.requiredScopes,
      }),
    });
    const json = await parseJsonSafe<{ url?: string; error?: { message?: string } }>(res);
    if (!res.ok || !json?.url) {
      setGoogleError(json?.error?.message || "Failed to start Google OAuth flow.");
      setConnectingGoogle(false);
      return;
    }
    window.location.href = json.url;
  }

  const connectAndSync = useCallback(async () => {
    setConnectingGoogle(true);
    setGoogleError("");
    setGoogleNotice("");
    try {
      const connectRes = await fetch("/api/google/connect", { method: "POST" });
      const connectJson = await parseJsonSafe<{ error?: string; action?: string }>(connectRes);
      if (!connectRes.ok) throw new Error(connectJson?.error || "Failed to connect business profile.");
      const syncRes = await fetch("/api/google/sync-reviews", { method: "POST" });
      const syncJson = await parseJsonSafe<{ error?: string; synced?: number }>(syncRes);
      if (!syncRes.ok) throw new Error(syncJson?.error || "Connected, but review sync failed.");
      setGoogleNotice(`Google connected successfully. Synced ${syncJson?.synced ?? 0} reviews.`);
      await loadAll();
      router.replace("/dashboard/settings?section=google");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to connect Google Business.");
    } finally {
      setConnectingGoogle(false);
    }
  }, [loadAll, router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (searchParams.get("google") !== "linked" || handledGoogleCallback.current) return;
    handledGoogleCallback.current = true;
    void connectAndSync();
  }, [searchParams, connectAndSync]);

  async function handleConnectGoogle() {
    if (!googleStatus) return;
    if (!googleStatus.configured) {
      setGoogleError("Google OAuth is not configured.");
      return;
    }
    if (!googleStatus.linkedAccount) {
      await startGoogleLinkFlow();
      return;
    }
    await connectAndSync();
  }

  async function sendInvite(event: React.FormEvent) {
    event.preventDefault();
    setSendingInvite(true);
    setTeamError("");
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, business: inviteBusiness, role: inviteRole }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send invitation.");
      setTeamSuccess(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      await loadAll();
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function changeMemberRole(member: TeamMember, role: Role) {
    if (!member.canEditRole) return;
    setTeamError("");
    try {
      const res = await fetch("/api/team/members/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          kind: member.kind,
          role,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update role.");
      setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, role } : item)));
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function removeMember(member: TeamMember) {
    if (!member.canRemove) return;
    setRemovingId(member.id);
    setTeamError("");
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          kind: member.kind,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to remove member.");
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  }

  async function startUpgrade(planName: (typeof PLANS)[number]["name"]) {
    setUpgrading(planName);
    setBillingError("");
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.checkoutUrl) throw new Error(json?.error || "Failed to start checkout.");
      window.location.href = json.checkoutUrl as string;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Failed to start checkout.");
      setUpgrading(null);
    }
  }

  const connected = Boolean(googleStatus?.connected);

  return (
    <DashboardShell activeHref="/dashboard/settings">
      <div className="h-full">
        <div className="brand-scrollbar rounded-3xl border border-[#E6E9F8] p-5 md:p-8 lg:p-10 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]" style={cardStyle()}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Settings</p>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">Workspace Settings</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#6A6A82]">Everything important now lives here: AI, Google Business, team, and billing.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Google", value: connected ? "Connected" : "Not connected" },
                { label: "Team", value: `${members.length} members` },
                { label: "Plan", value: subscription.plan === "free" ? "Free" : subscription.plan },
                { label: "Posting", value: postType === "auto" ? "Auto-post" : "Approval" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#E6E9F8] bg-white/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A8AA0]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#040404]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            <section className="rounded-[28px] border border-[#E6E9F8] bg-white/80 p-6">
              <h2 className="text-xl font-semibold text-[#040404]">AI Reply Settings</h2>
              {settingsError && <p className="mt-4 text-sm text-red-500">{settingsError}</p>}
              <form onSubmit={saveSettings} className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-[#4F4F63]">Prompt</label>
                    <span className="text-xs text-[#8A8AA0]">{prompt.length} chars</span>
                  </div>
                  <textarea rows={11} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={`${INPUT} min-h-[260px] resize-y`} />
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4F4F63]">Tone</label>
                    <select value={tone} onChange={(e) => setTone(e.target.value)} className={INPUT}>
                      {TONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4F4F63]">Posting mode</label>
                    <div className="grid gap-3">
                      <label className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 text-sm text-[#4F4F63]"><input type="radio" className="mr-2 accent-[#5F30EB]" checked={postType === "auto"} onChange={() => setPostType("auto")} />Auto post replies</label>
                      <label className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 text-sm text-[#4F4F63]"><input type="radio" className="mr-2 accent-[#5F30EB]" checked={postType === "review"} onChange={() => setPostType("review")} />Review before publish</label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setPrompt(DEFAULT_AI_PROMPT)} className="rounded-full border border-[#E6E9F8] px-4 py-2 text-sm text-[#6A6A82] cursor-pointer">Reset</button>
                    <button type="submit" disabled={savingSettings} className="rounded-full bg-[#5F30EB] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-60">{savingSettings ? "Saving..." : "Save"}</button>
                    {savedSettings && <span className="rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-600">Saved</span>}
                  </div>
                </div>
              </form>
            </section>

            <section className="rounded-[28px] border border-[#E6E9F8] bg-white/80 p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#040404]">Google Business</h2>
                  <p className="text-sm text-[#6A6A82] mt-1">Connection, sync status, and review activity.</p>
                </div>
                <Link href="/dashboard/review-link" className="text-sm font-medium text-[#5F30EB] hover:underline">Open Review Link</Link>
              </div>
              {googleError && <p className="mt-4 text-sm text-red-500">{googleError}</p>}
              {googleNotice && <p className="mt-4 text-sm text-[#5F30EB]">{googleNotice}</p>}
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                <div>
                  <p className={`text-lg font-semibold ${connected ? "text-[#5F30EB]" : "text-[#040404]"}`}>{connected ? `${googleStatus?.business?.name || "Business"} connected.` : "Business profile not connected yet."}</p>
                  <p className="mt-2 text-sm text-[#6A6A82]">Connect Google first, then sync reviews so AI replies can work with real data.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={handleConnectGoogle} disabled={connectingGoogle || connected} className="rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer">{connectingGoogle ? "Connecting..." : connected ? "Connected" : "Connect Business Profile"}</button>
                    <Link href="/dashboard/overview" className="rounded-2xl border border-[#E6E9F8] px-5 py-3 text-sm font-medium text-[#4F4F63]">Open Overview</Link>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: reviewSummary.total },
                    { label: "Replied", value: reviewSummary.replied },
                    { label: "Pending", value: reviewSummary.pending },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 text-center">
                      <p className="text-2xl font-semibold text-[#040404]">{item.value}</p>
                      <p className="mt-1 text-xs text-[#8A8AA0]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E6E9F8] bg-white/80 p-6">
              <h2 className="text-xl font-semibold text-[#040404]">Team Access</h2>
              {teamSuccess && <p className="mt-4 text-sm text-green-600">{teamSuccess}</p>}
              {teamError && <p className="mt-4 text-sm text-red-500">{teamError}</p>}
              <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <form onSubmit={sendInvite} className="space-y-4 rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-5">
                  <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="team@example.com" className={INPUT} />
                  <select value={inviteBusiness} onChange={(e) => setInviteBusiness(e.target.value)} className={INPUT}>{businesses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className={INPUT}>
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                  <button type="submit" disabled={sendingInvite} className="w-full rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-60">{sendingInvite ? "Sending..." : "Send Invitation"}</button>
                </form>
                <div className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#040404]">Members</h3>
                    <span className="text-sm text-[#8A8AA0]">{members.length} total</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {members.length === 0 ? <p className="text-sm text-[#6A6A82]">No team members yet.</p> : members.slice(0, 6).map((member) => (
                      <div key={`${member.kind}:${member.id}`} className={`rounded-2xl border border-[#E6E9F8] bg-white p-4 ${removingId === member.id ? "opacity-50" : ""}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#040404]">{member.email}</p>
                            <p className="text-xs text-[#8A8AA0]">{member.business} • {member.joinedAt}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[member.status]}`}>{member.status}</span>
                            <select
                              value={member.role}
                              disabled={!member.canEditRole}
                              onChange={(e) => changeMemberRole(member, e.target.value as Role)}
                              className={`appearance-none rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50 ${ROLE_COLORS[member.role]}`}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="MANAGER">Manager</option>
                            </select>
                            <button
                              onClick={() => removeMember(member)}
                              disabled={!member.canRemove || removingId === member.id}
                              className="rounded-full border border-red-500/15 px-3 py-1.5 text-xs font-medium text-red-500 cursor-pointer disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E6E9F8] bg-white/80 p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#040404]">Billing And Plan</h2>
                  <p className="text-sm text-[#6A6A82] mt-1">Current plan, usage, and upgrades.</p>
                </div>
                <Link href="/pricing" className="text-sm font-medium text-[#5F30EB] hover:underline">Compare all plans</Link>
              </div>
              {billingNotice && <p className="mt-4 text-sm text-green-600">{billingNotice}</p>}
              {billingError && <p className="mt-4 text-sm text-red-500">{billingError}</p>}
              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                {[
                  { label: "Plan", value: subscription.plan === "free" ? "Free" : subscription.plan },
                  { label: "Status", value: subscription.status },
                  { label: "Price", value: `${subscription.price}/month` },
                  { label: "Next Billing", value: subscription.nextBillingAt },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8A8AA0]">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#040404]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => {
                  const isCurrent = subscription.plan === plan.name;
                  return (
                    <div key={plan.name} className={`rounded-[24px] border p-5 ${isCurrent ? "border-[#5F30EB]/30 bg-[#5F30EB]/8" : "border-[#E6E9F8] bg-[#FBFBFF]"}`}>
                      <p className="text-sm font-semibold text-[#040404]">{plan.name}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#5F30EB]">{plan.price}<span className="text-sm text-[#8A8AA0]">/mo</span></p>
                      <p className="mt-2 text-sm text-[#6A6A82]">{plan.accounts}</p>
                      <button onClick={() => !isCurrent && startUpgrade(plan.name)} disabled={isCurrent || upgrading === plan.name} className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold cursor-pointer ${isCurrent ? "bg-[#5F30EB]/12 text-[#5F30EB]" : "bg-[#5F30EB] text-white"} disabled:opacity-60`}>
                        {upgrading === plan.name ? "Processing..." : isCurrent ? "Active Plan" : "Upgrade"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
