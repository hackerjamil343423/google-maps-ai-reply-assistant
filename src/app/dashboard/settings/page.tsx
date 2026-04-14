"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import { DEFAULT_AI_PROMPT, TONE_OPTIONS } from "@/lib/ai/default-settings";
import { useLanguage } from "@/lib/i18n/language-context";

type PostType = "auto" | "review";
type SettingsTab = "profile" | "ai" | "google" | "team" | "billing";
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
  hasRequiredScopes?: boolean;
  connected: boolean;
  business: { name: string } | null;
  requiredScopes: string[];
  subscriptionAllowed?: boolean;
  subscriptionReason?: "trial_expired" | "canceled" | "plan_limit";
  plan?: "Local Business" | "Multi-Location" | "Agency Max" | "free";
  subscriptionStatus?: string;
  connectedAccounts?: number;
  maxAccounts?: number;
};

type ConnectedProfile = {
  id: string;
  name: string;
  googleLocationId: string | null;
  connectedAt: string | null;
  syncedReviewCount: number;
};
type SubscriptionState = {
  plan: "Local Business" | "Multi-Location" | "Agency Max" | "free";
  status: "trialing" | "active" | "past_due" | "canceled";
  price: string;
  nextBillingAt: string;
  connectedAccounts: number;
  maxAccounts: number;
};

const INPUT =
  "w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 text-sm text-[#4F4F63] outline-none transition-all focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12";

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
};

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function panelStyle() {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,246,255,0.92))",
    boxShadow: "0 20px 50px rgba(95,48,235,0.06)",
  };
}

function getGoogleConnectBlockMessage(status: GoogleStatus | null) {
  if (!status) return null;
  if (status.linkedAccount && status.hasRequiredScopes === false) {
    return "Your Google account is linked, but Business Profile permission is missing. Reconnect Google and approve Business Profile access.";
  }
  if (status.subscriptionAllowed === false) {
    return status.subscriptionReason === "trial_expired"
      ? "Your free trial has expired. Upgrade your plan before connecting Google Business."
      : "Your subscription is not active. Renew or upgrade your plan before connecting Google Business.";
  }

  if (
    !status.connected &&
    typeof status.connectedAccounts === "number" &&
    typeof status.maxAccounts === "number" &&
    status.connectedAccounts >= status.maxAccounts
  ) {
    const planName = status.plan === "free" ? "Free" : status.plan || "current";
    return `Your ${planName} plan allows up to ${status.maxAccounts} connected account(s). Upgrade your plan to add more.`;
  }

  return null;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledGoogleCallback = useRef(false);
  const handledBillingParams = useRef(false);

  const currentTab = (["profile", "ai", "google", "team", "billing"].includes(searchParams.get("section") || "")
    ? searchParams.get("section")
    : "ai") as SettingsTab;

  const [prompt, setPrompt] = useState(DEFAULT_AI_PROMPT);
  const [tone, setTone] = useState("Professional");
  const [postType, setPostType] = useState<PostType>("auto");
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [summary, setSummary] = useState({ total: 0, replied: 0, pending: 0 });
  const [googleError, setGoogleError] = useState("");
  const [googleNotice, setGoogleNotice] = useState("");
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<Array<{ googleLocationId: string; title: string }> | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [syncingReviews, setSyncingReviews] = useState<string | null>(null); // businessId being synced, or null
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null); // businessId to disconnect, or null
  const [connectMode, setConnectMode] = useState<"update" | "add">("update");
  const [connectedProfiles, setConnectedProfiles] = useState<ConnectedProfile[]>([]);

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

  /* ── Profile state ── */
  const { language, setLanguage, ready: languageReady } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [pwError, setPwError] = useState("");

  const profileInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "A";

  const loadAll = useCallback(async () => {
    const profileRes = await fetch("/api/me", { cache: "no-store" });
    if (profileRes.ok) {
      const data = await profileRes.json();
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setProfileEmail(data.email || "");
      setPhone(data.phone || "");
      setCompany(data.company || "");
      setWebsite(data.website || "");
      setBio(data.bio || "");
    } else {
      setProfileError("Failed to load profile.");
    }
    setLoadingProfile(false);

    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setPrompt(data.prompt || DEFAULT_AI_PROMPT);
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

    const profilesRes = await fetch("/api/analytics/businesses", { cache: "no-store" });
    const profilesJson = await parseJsonSafe<{ businesses: ConnectedProfile[] }>(profilesRes);
    if (profilesRes.ok && profilesJson?.businesses) {
      setConnectedProfiles(profilesJson.businesses);
    }

    const reviewsRes = await fetch("/api/reviews?status=all&page=1&per_page=1", { cache: "no-store" });
    const reviewsJson = await parseJsonSafe<{ summary?: typeof summary }>(reviewsRes);
    if (reviewsRes.ok && reviewsJson?.summary) setSummary(reviewsJson.summary);

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

  const connectAndSync = useCallback(async (locationName?: string, mode: "update" | "add" = "update") => {
    setConnectingGoogle(true);
    setGoogleError("");
    setGoogleNotice("");
    setAvailableLocations(null);
    try {
      const connectRes = await fetch("/api/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(locationName ? { locationName } : {}), mode }),
      });
      const connectJson = await parseJsonSafe<{ error?: string }>(connectRes);
      if (!connectRes.ok) throw new Error(connectJson?.error || "Failed to connect business profile.");
      const syncRes = await fetch("/api/google/sync-reviews", { method: "POST" });
      const syncJson = await parseJsonSafe<{ error?: string; synced?: number }>(syncRes);
      if (!syncRes.ok) throw new Error(syncJson?.error || "Connected, but review sync failed.");
      setGoogleNotice(`Connected successfully. Synced ${syncJson?.synced ?? 0} reviews.`);
      await loadAll();
      router.replace("/dashboard/settings?section=google");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to connect Google Business.");
    } finally {
      setConnectingGoogle(false);
    }
  }, [loadAll, router]);

  const handleSyncReviews = useCallback(async (businessId?: string) => {
    setSyncingReviews(businessId ?? "all");
    setGoogleError("");
    setGoogleNotice("");
    try {
      const res = await fetch("/api/google/sync-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessId ? { businessId } : {}),
      });
      const json = await parseJsonSafe<{ error?: string; synced?: number }>(res);
      if (!res.ok) throw new Error(json?.error || "Sync failed.");
      setGoogleNotice(`Synced ${json?.synced ?? 0} reviews.`);
      await loadAll();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to sync reviews.");
    } finally {
      setSyncingReviews(null);
    }
  }, [loadAll]);

  const handleDisconnectGoogle = useCallback(async (businessId?: string) => {
    setDisconnectingGoogle(true);
    setGoogleError("");
    setGoogleNotice("");
    try {
      const res = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessId ? { businessId } : {}),
      });
      const json = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error || "Failed to disconnect business.");
      setGoogleNotice("Google Business disconnected.");
      await loadAll();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to disconnect Google Business.");
    } finally {
      setDisconnectingGoogle(false);
    }
  }, [loadAll]);

  const handleConnectWithLocationPicker = useCallback(async (mode: "update" | "add" = "update") => {
    setConnectingGoogle(true);
    setGoogleError("");
    setGoogleNotice("");
    setConnectMode(mode);
    try {
      const res = await fetch("/api/google/locations");
      const json = await parseJsonSafe<{ locations?: Array<{ googleLocationId: string; title: string }>; error?: string }>(res);
      if (!res.ok) throw new Error(json?.error || "Failed to fetch locations.");
      const locs = json?.locations ?? [];
      if (locs.length <= 1) {
        await connectAndSync(locs[0]?.googleLocationId, mode);
      } else {
        setAvailableLocations(locs);
        setSelectedLocation(locs[0].googleLocationId);
        setConnectingGoogle(false);
      }
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to fetch Google locations.");
      setConnectingGoogle(false);
    }
  }, [connectAndSync]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (searchParams.get("google") !== "linked" || handledGoogleCallback.current) return;
    handledGoogleCallback.current = true;
    const mode = (searchParams.get("mode") === "add" ? "add" : "update") as "update" | "add";
    void handleConnectWithLocationPicker(mode);
  }, [searchParams, handleConnectWithLocationPicker]);

  useEffect(() => {
    if (handledBillingParams.current) return;
    handledBillingParams.current = true;
    if (searchParams.get("success") === "true") {
      setBillingNotice("Your subscription has been activated.");
      router.replace("/dashboard/settings?section=billing");
    }
    if (searchParams.get("error") === "payment_failed") {
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
      setTimeout(() => setSavedSettings(false), 2500);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function startGoogleLinkFlow() {
    setConnectingGoogle(true);
    const modeParam = connectMode === "add" ? "&mode=add" : "";
    const res = await fetch("/api/auth/link-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: `/dashboard/settings?section=google&google=linked${modeParam}`,
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

  async function handleConnectGoogle(mode: "update" | "add" = "update") {
    if (!googleStatus) return;
    if (!googleStatus.configured) return setGoogleError("Google OAuth is not configured.");
    if (mode === "add" && googleStatus.subscriptionAllowed === false) {
      const blockedMessage = getGoogleConnectBlockMessage(googleStatus);
      setGoogleError(blockedMessage || "Google Business connection is not available for this workspace.");
      return;
    }
    if (googleStatus.linkedAccount && googleStatus.hasRequiredScopes === false) {
      setGoogleNotice("Reconnecting Google permissions...");
      return startGoogleLinkFlow();
    }
    if (mode === "add") {
      const blockedMessage = getGoogleConnectBlockMessage(googleStatus);
      if (blockedMessage) {
        setGoogleError(blockedMessage);
        return;
      }
    }
    if (!googleStatus.linkedAccount) return startGoogleLinkFlow();
    await handleConnectWithLocationPicker(mode);
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
    const res = await fetch("/api/team/members/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, kind: member.kind, role }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setTeamError(json?.error || "Failed to update role.");
      return;
    }
    setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, role } : item)));
  }

  async function removeMember(member: TeamMember) {
    if (!member.canRemove) return;
    setRemovingId(member.id);
    const res = await fetch("/api/team/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, kind: member.kind }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setTeamError(json?.error || "Failed to remove member.");
    } else {
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
    }
    setRemovingId(null);
  }

  async function startUpgrade(planName: (typeof PLANS)[number]["name"]) {
    setUpgrading(planName);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planName }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.checkoutUrl) {
      setBillingError(json?.error || "Failed to start checkout.");
      setUpgrading(null);
      return;
    }
    window.location.href = json.checkoutUrl as string;
  }

  const connected = Boolean(googleStatus?.connected);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setSavedProfile(false);
    setProfileError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: profileEmail, phone, company, website, bio }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save profile.");
      }
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 3500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    setSavedPassword(false);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to update password.");
      setSavedPassword(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setSavedPassword(false), 3500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <DashboardShell activeHref="/dashboard/settings">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Settings</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-[#040404]">Workspace Settings</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { key: "profile", label: "Profile" },
            { key: "ai", label: "AI Replies" },
            { key: "google", label: "Google Business" },
            { key: "team", label: "Team" },
            { key: "billing", label: "Billing" },
          ].map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => router.replace(`/dashboard/settings?section=${tab.key}`)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1A1824] text-white shadow-[0_12px_30px_rgba(26,24,36,0.18)]"
                    : "border border-[#E6E9F8] bg-white/80 text-[#5E5876] hover:border-[#5F30EB]/20 hover:text-[#5F30EB]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {currentTab === "profile" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            <h2 className="text-xl font-semibold text-[#040404]">Profile</h2>
            <p className="text-sm text-[#6A6A82] mt-1">Manage your personal information and account settings.</p>

            {loadingProfile && (
              <div className="mt-5 text-sm text-[#6B6487]">Loading profile…</div>
            )}

            {profileError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {profileError}
              </div>
            )}

            {!loadingProfile && (
              <div className="mt-6 space-y-10">
                {/* Avatar section */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 bg-[#5F30EB]">
                    {profileInitials}
                  </div>
                  <div>
                    <p className="text-[#040404] font-medium">{firstName} {lastName}</p>
                    <p className="text-[#6B6487] text-sm">{profileEmail}</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                    Personal Information
                  </h3>
                  <form onSubmit={handleProfileSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">First Name</label>
                        <input type="text" required className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">Last Name</label>
                        <input type="text" required className={INPUT} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">Email Address</label>
                      <input type="email" required className={INPUT} value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">Phone Number <span className="text-gray-600">(optional)</span></label>
                      <input type="tel" className={INPUT} placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">Company <span className="text-gray-600">(optional)</span></label>
                        <input type="text" className={INPUT} placeholder="Your business name" value={company} onChange={(e) => setCompany(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">Website <span className="text-gray-600">(optional)</span></label>
                        <input type="url" className={INPUT} placeholder="https://yourbusiness.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">Bio <span className="text-gray-600">(optional)</span></label>
                      <textarea rows={3} className={INPUT} placeholder="A short description about yourself or your business…" value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <button type="submit" disabled={savingProfile}
                        className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2">
                        {savingProfile ? (
                          <>
                            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Saving…
                          </>
                        ) : "Save Profile"}
                      </button>
                      {savedProfile && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Profile updated
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Language */}
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                    Language
                  </h3>
                  <div className="max-w-sm">
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value === "ar" ? "ar" : "en")}
                        disabled={!languageReady}
                        className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 pr-10 text-sm text-[#4F4F63] font-medium outline-none appearance-none cursor-pointer transition-all focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12 disabled:opacity-60"
                      >
                        <option value="en" className="bg-[#F6F4FF] text-[#4F4F63]">English</option>
                        <option value="ar" className="bg-[#F6F4FF] text-[#4F4F63]">Arabic</option>
                      </select>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                    <p className="text-xs text-[#6B6487] mt-2">
                      Current language: <span className="font-medium text-[#040404]">{language === "ar" ? "Arabic" : "English"}</span>
                    </p>
                  </div>
                </div>

                {/* Change Password */}
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                    Change Password
                  </h3>
                  <form onSubmit={handlePasswordSave} className="space-y-5">
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">Current Password</label>
                      <div className="relative">
                        <input type={showCurrent ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder="Enter current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                        <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#3E3E52] cursor-pointer transition-colors" aria-label={showCurrent ? "Hide password" : "Show password"}>
                          {showCurrent ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                              <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                              <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                              <path d="m2 2 20 20" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">New Password</label>
                      <div className="relative">
                        <input type={showNew ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder="Min. 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                        <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#3E3E52] cursor-pointer transition-colors" aria-label={showNew ? "Hide password" : "Show password"}>
                          {showNew ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                              <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                              <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                              <path d="m2 2 20 20" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {newPw.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((i) => {
                              const strength =
                                newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw) ? 4
                                : newPw.length >= 10 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? 3
                                : newPw.length >= 8 ? 2
                                : 1;
                              const color = strength === 1 ? "#EF4444" : strength === 2 ? "#F59E0B" : strength === 3 ? "#3B82F6" : "#5F30EB";
                              return (
                                <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i <= strength ? color : "#E6E9F8" }} />
                              );
                            })}
                          </div>
                          <p className="text-xs text-[#8A8AA0]">
                            {newPw.length < 8 ? "Too short" : newPw.length < 10 ? "Weak" : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && newPw.length >= 12 ? "Strong" : "Good"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <input type={showConfirm ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder="Re-enter new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#3E3E52] cursor-pointer transition-colors" aria-label={showConfirm ? "Hide password" : "Show password"}>
                          {showConfirm ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                              <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                              <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                              <path d="m2 2 20 20" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {confirmPw.length > 0 && (
                        <p className={`text-xs mt-1.5 ${newPw === confirmPw ? "text-green-400" : "text-red-400"}`}>
                          {newPw === confirmPw ? "✓ Passwords match" : "✗ Passwords do not match"}
                        </p>
                      )}
                    </div>
                    {pwError && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{pwError}</div>
                    )}
                    <div className="flex items-center gap-4 pt-1">
                      <button type="submit" disabled={savingPassword}
                        className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2">
                        {savingPassword ? (
                          <>
                            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Updating…
                          </>
                        ) : "Update Password"}
                      </button>
                      {savedPassword && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Password updated
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Danger Zone */}
                <div>
                  <h3 className="text-base font-medium text-red-500 mb-5 pb-3 border-b border-red-100">Danger Zone</h3>
                  <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-red-100 bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">Delete Account</p>
                      <p className="text-xs text-[#6B6487] mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                    <button type="button" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">Delete Account</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {currentTab === "ai" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            <h2 className="text-xl font-semibold text-[#040404]">AI Reply Settings</h2>
            {settingsError && <p className="mt-4 text-sm text-red-500">{settingsError}</p>}
            <form onSubmit={saveSettings} className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[#4F4F63]">Prompt</label>
                  <span className="text-xs text-[#8A8AA0]">{prompt.length} chars</span>
                </div>
                <textarea rows={11} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={`${INPUT} min-h-[300px] resize-y`} />
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
        )}

        {currentTab === "google" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            {/* Header */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-[#040404]">Google Business</h2>
              <Link href="/dashboard/review-link" className="text-sm font-medium text-[#5F30EB] hover:underline self-start md:self-auto">Open Review Link</Link>
            </div>

            {/* Messages */}
            {googleError && <p className="mt-4 rounded-2xl bg-red-500/8 px-4 py-3 text-sm text-red-500">{googleError}</p>}
            {googleNotice && <p className="mt-4 rounded-2xl bg-[#5F30EB]/8 px-4 py-3 text-sm text-[#5F30EB]">{googleNotice}</p>}
            {!googleError && getGoogleConnectBlockMessage(googleStatus) && (
              <p className="mt-4 rounded-2xl bg-orange-500/8 px-4 py-3 text-sm text-orange-600">{getGoogleConnectBlockMessage(googleStatus)}</p>
            )}

            {/* Location picker (shown while picking a new location to connect) */}
            {availableLocations && availableLocations.length > 1 && (
              <div className="mt-6 rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 space-y-3">
                <p className="text-sm font-medium text-[#040404]">Select a location to connect:</p>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 text-sm text-[#4F4F63] outline-none focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12"
                >
                  {availableLocations.map((loc) => (
                    <option key={loc.googleLocationId} value={loc.googleLocationId}>{loc.title}</option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => void connectAndSync(selectedLocation, connectMode)}
                    disabled={connectingGoogle}
                    className="rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                  >
                    {connectingGoogle ? "Connecting..." : "Connect Selected Location"}
                  </button>
                  <button
                    onClick={() => setAvailableLocations(null)}
                    className="rounded-2xl border border-[#E6E9F8] px-5 py-3 text-sm font-medium text-[#4F4F63] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Connected profiles list */}
            {!availableLocations && (
              <div className="mt-6 space-y-3">
                {connectedProfiles.length === 0 && !connected && (
                  <p className="text-sm text-[#6A6A82]">Connect your Google Business Profile to start syncing reviews and generating AI replies.</p>
                )}

                {connectedProfiles.map((profile) => {
                  const isConfirmingDisconnect = showDisconnectConfirm === profile.id;
                  const isSyncing = syncingReviews === profile.id;

                  return (
                    <div key={profile.id} className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4">
                      {isConfirmingDisconnect ? (
                        <div className="space-y-3">
                          <p className="text-sm text-[#040404]">
                            Disconnect <strong>{profile.name}</strong>? Review syncing will stop until you reconnect.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={async () => { setShowDisconnectConfirm(null); await handleDisconnectGoogle(profile.id); }}
                              disabled={disconnectingGoogle}
                              className="rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                            >
                              {disconnectingGoogle ? "Disconnecting..." : "Yes, Disconnect"}
                            </button>
                            <button
                              onClick={() => setShowDisconnectConfirm(null)}
                              className="rounded-2xl border border-[#E6E9F8] px-5 py-2.5 text-sm font-medium text-[#4F4F63] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#040404] truncate">{profile.name}</p>
                              <p className="text-xs text-[#8A8AA0]">{profile.syncedReviewCount} reviews synced</p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => void handleSyncReviews(profile.id)}
                              disabled={!!syncingReviews}
                              className="rounded-2xl bg-[#5F30EB] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                            >
                              {isSyncing ? "Syncing..." : "Sync"}
                            </button>
                            <button
                              onClick={() => setShowDisconnectConfirm(profile.id)}
                              className="rounded-2xl border border-red-500/20 px-4 py-2 text-xs font-medium text-red-500 cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add / Connect button */}
                {!availableLocations && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {!connected ? (
                      <button
                        onClick={() => void handleConnectGoogle("update")}
                        disabled={connectingGoogle}
                        className="rounded-2xl bg-[#5F30EB] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                      >
                        {connectingGoogle ? "Connecting..." : "Connect Business Profile"}
                      </button>
                    ) : (
                      typeof googleStatus?.connectedAccounts === "number" &&
                      typeof googleStatus?.maxAccounts === "number" &&
                      googleStatus.connectedAccounts < googleStatus.maxAccounts && (
                        <button
                          onClick={() => void handleConnectGoogle("add")}
                          disabled={connectingGoogle}
                          className="flex items-center gap-2 rounded-2xl border border-[#5F30EB]/30 px-5 py-2.5 text-sm font-medium text-[#5F30EB] disabled:opacity-60 cursor-pointer hover:bg-[#5F30EB]/5 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14" /><path d="M12 5v14" />
                          </svg>
                          {connectingGoogle ? "Loading..." : "Add Business Profile"}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {currentTab === "team" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
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
                          <select value={member.role} disabled={!member.canEditRole} onChange={(e) => changeMemberRole(member, e.target.value as Role)} className={`appearance-none rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50 ${ROLE_COLORS[member.role]}`}>
                            <option value="VIEWER">Viewer</option>
                            <option value="EDITOR">Editor</option>
                            <option value="MANAGER">Manager</option>
                          </select>
                          <button onClick={() => removeMember(member)} disabled={!member.canRemove || removingId === member.id} className="rounded-full border border-red-500/15 px-3 py-1.5 text-xs font-medium text-red-500 cursor-pointer disabled:opacity-50">
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
        )}

        {currentTab === "billing" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
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
        )}
      </div>
    </DashboardShell>
  );
}
