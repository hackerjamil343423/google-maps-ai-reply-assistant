"use client";

import React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import SarIcon from "@/components/SarIcon";
import { useBusinessContext } from "@/lib/business-context";
import { DEFAULT_AI_PROMPT, TONE_OPTIONS } from "@/lib/ai/default-settings";
import { useLanguage } from "@/lib/i18n/language-context";

type PostType = "auto" | "review";
type SettingsTab = "profile" | "ai" | "google" | "team" | "billing" | "workspace";
type Role = "VIEWER" | "EDITOR" | "MANAGER";
type BusinessAccessMode = "all" | "selected";
type TeamBusiness = {
  id: string;
  name: string;
};
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
  canEditAccess: boolean;
  accessMode: BusinessAccessMode;
  assignedBusinessIds: string[];
};
type GoogleStatus = {
  configured: boolean;
  linkedAccount: boolean;
  hasRequiredScopes?: boolean;
  connected: boolean;
  business: { name: string } | null;
  requiredScopes: string[];
  subscriptionAllowed?: boolean;
  subscriptionReason?: "trial_expired" | "canceled" | "plan_limit" | "subscription_expired";
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
type ReviewsSummary = {
  total: number;
  replied: number;
  pending: number;
};
type SubscriptionState = {
  plan: "Local Business" | "Multi-Location" | "Agency Max" | "free";
  status: "trialing" | "active" | "past_due" | "canceled";
  price: string;
  billingInterval: "monthly" | "yearly";
  nextBillingAt: string;
  connectedAccounts: number;
  maxAccounts: number;
  cancelAtPeriodEnd: boolean;
  scheduledDowngradePlan: string | null;
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  "Local Business": 1,
  "Multi-Location": 2,
  "Agency Max": 3,
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

const DEFAULT_PLANS = [
  { name: "Local Business", monthlyPrice: "149", yearlyPrice: "1,430", yearlyMonthly: "119", accounts: "Up to 1 account" },
  { name: "Multi-Location", monthlyPrice: "349", yearlyPrice: "3,350", yearlyMonthly: "279", accounts: "Up to 5 accounts" },
  { name: "Agency Max", monthlyPrice: "999", yearlyPrice: "9,590", yearlyMonthly: "799", accounts: "Up to 60 accounts" },
] as const;

type PaidPlanName = (typeof DEFAULT_PLANS)[number]["name"];
type BillingPlan = {
  name: PaidPlanName;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthly: string;
  accounts: string;
};

const FALLBACK_SUBSCRIPTION: SubscriptionState = {
  plan: "free",
  status: "trialing",
  price: "0",
  billingInterval: "monthly",
  nextBillingAt: "N/A",
  connectedAccounts: 0,
  maxAccounts: 1,
  cancelAtPeriodEnd: false,
  scheduledDowngradePlan: null,
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

function getGoogleConnectBlockMessage(status: GoogleStatus | null, language: "en" | "ar") {
  if (!status) return null;
  if (status.linkedAccount && status.hasRequiredScopes === false) {
    return language === "ar"
      ? "حساب Google مرتبط، لكن إذن ملف النشاط التجاري مفقود. أعد ربط Google ووافق على صلاحية الوصول."
      : "Your Google account is linked, but Business Profile permission is missing. Reconnect Google and approve Business Profile access.";
  }
  if (status.subscriptionAllowed === false) {
    if (status.subscriptionReason === "trial_expired") {
      return language === "ar"
        ? "انتهت تجربتك المجانية. رقِّ خطتك قبل ربط نشاط Google."
        : "Your free trial has expired. Upgrade your plan before connecting Google Business.";
    }
    if (status.subscriptionReason === "subscription_expired") {
      return language === "ar"
        ? "انتهى اشتراكك. جدّد خطتك قبل ربط نشاط Google."
        : "Your subscription has expired. Renew your plan before connecting Google Business.";
    }
    return language === "ar"
      ? "اشتراكك غير نشط. جدّد خطتك أو رقِّها قبل ربط نشاط Google."
      : "Your subscription is not active. Renew or upgrade your plan before connecting Google Business.";
  }

  if (
    !status.connected &&
    typeof status.connectedAccounts === "number" &&
    typeof status.maxAccounts === "number" &&
    status.connectedAccounts >= status.maxAccounts
  ) {
    const planName = status.plan === "free" ? "Free" : status.plan || "current";
    return language === "ar"
      ? `تسمح خطة ${planName} بربط ${status.maxAccounts} حساب كحد أقصى. رقِّ خطتك لإضافة المزيد.`
      : `Your ${planName} plan allows up to ${status.maxAccounts} connected account(s). Upgrade your plan to add more.`;
  }

  return null;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshBusinesses } = useBusinessContext();
  const handledGoogleCallback = useRef(false);
  const handledBillingParams = useRef(false);

  const currentTab = (["profile", "ai", "google", "team", "billing", "workspace"].includes(searchParams.get("section") || "")
    ? searchParams.get("section")
    : "ai") as SettingsTab;

  const [prompt, setPrompt] = useState(DEFAULT_AI_PROMPT);
  const [tone, setTone] = useState("Professional");
  const [postType, setPostType] = useState<PostType>("auto");
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [, setSummary] = useState<ReviewsSummary>({ total: 0, replied: 0, pending: 0 });
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
  const [businesses, setBusinesses] = useState<TeamBusiness[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusiness, setInviteBusiness] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EDITOR");
  const [inviteAccessMode, setInviteAccessMode] = useState<BusinessAccessMode>("all");
  const [inviteBusinessIds, setInviteBusinessIds] = useState<string[]>([]);
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingAccessId, setUpdatingAccessId] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionState>(FALLBACK_SUBSCRIPTION);
  const [billingError, setBillingError] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
  const [downgradeWarning, setDowngradeWarning] = useState<string | null>(null);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const handledAutoCheckout = useRef(false);
  const [plans, setPlans] = useState<BillingPlan[]>([...DEFAULT_PLANS]);

  /* ── Workspace state ── */
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceRole, setWorkspaceRole] = useState("");
  const [workspaceIsOwner, setWorkspaceIsOwner] = useState(false);
  const [savingWorkspaceName, setSavingWorkspaceName] = useState(false);
  const [savedWorkspaceName, setSavedWorkspaceName] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [leavingWorkspace, setLeavingWorkspace] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
    const reviewsJson = await parseJsonSafe<{ summary?: ReviewsSummary }>(reviewsRes);
    if (reviewsRes.ok && reviewsJson?.summary) setSummary(reviewsJson.summary);

    const teamRes = await fetch("/api/team/members", { cache: "no-store" });
    const teamJson = await teamRes.json().catch(() => null);
    if (teamRes.ok) {
      const nextBusinesses = Array.isArray(teamJson?.businesses) ? teamJson.businesses : [];
      setMembers(Array.isArray(teamJson?.members) ? teamJson.members : []);
      setBusinesses(nextBusinesses);
      setInviteBusiness((prev) => prev || nextBusinesses[0]?.name || "");
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

    const pricingRes = await fetch("/api/pricing/plans", { cache: "no-store" });
    const pricingJson = await pricingRes.json().catch(() => null);
    if (pricingRes.ok && Array.isArray(pricingJson?.plans)) {
      setPlans((current) =>
        current.map((plan) => {
          const updated = pricingJson.plans.find((item: { name?: string }) => item.name === plan.name);
          if (
            !updated ||
            !Number.isFinite(updated.monthlyPrice) ||
            !Number.isFinite(updated.yearlyPrice) ||
            !Number.isFinite(updated.yearlyMonthlyEquivalent)
          ) {
            return plan;
          }

          return {
            ...plan,
            monthlyPrice: updated.monthlyPrice.toLocaleString("en-US"),
            yearlyPrice: updated.yearlyPrice.toLocaleString("en-US"),
            yearlyMonthly: updated.yearlyMonthlyEquivalent.toLocaleString("en-US"),
          };
        })
      );
    }

    const workspaceRes = await fetch("/api/workspace", { cache: "no-store" });
    const workspaceJson = await workspaceRes.json().catch(() => null);
    if (workspaceRes.ok && workspaceJson) {
      setWorkspaceName(workspaceJson.name ?? "");
      setWorkspaceRole(workspaceJson.role ?? "");
      setWorkspaceIsOwner(workspaceJson.isOwner ?? false);
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
      const connectJson = await parseJsonSafe<{ error?: string; business?: { businessId?: string } }>(connectRes);
      if (!connectRes.ok) throw new Error(connectJson?.error || "Failed to connect business profile.");
      const syncRes = await fetch("/api/google/sync-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          connectJson?.business?.businessId
            ? { businessId: connectJson.business.businessId }
            : {}
        ),
      });
      const syncJson = await parseJsonSafe<{ error?: string; synced?: number }>(syncRes);
      if (!syncRes.ok) throw new Error(syncJson?.error || "Connected, but review sync failed.");
      setGoogleNotice(`Connected successfully. Synced ${syncJson?.synced ?? 0} reviews.`);
      await loadAll();
      await refreshBusinesses();
      router.replace("/dashboard/settings?section=google");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to connect Google Business.");
    } finally {
      setConnectingGoogle(false);
    }
  }, [loadAll, refreshBusinesses, router]);

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
      await refreshBusinesses();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to sync reviews.");
    } finally {
      setSyncingReviews(null);
    }
  }, [loadAll, refreshBusinesses]);

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
      await refreshBusinesses();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Failed to disconnect Google Business.");
    } finally {
      setDisconnectingGoogle(false);
    }
  }, [loadAll, refreshBusinesses]);

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
      setBillingNotice("Payment received. Your billing status is updating.");
      void loadAll();
      router.replace("/dashboard/settings?section=billing");
    }
    if (searchParams.get("error") === "payment_failed") {
      setBillingError("Payment failed or was cancelled. Please try again.");
      router.replace("/dashboard/settings?section=billing");
    }
  }, [searchParams, router, loadAll]);

  // Auto-launch checkout when user arrives via the downgrade-ready email.
  useEffect(() => {
    if (handledAutoCheckout.current) return;
    const autoCheckout = searchParams.get("autoCheckout");
    if (!autoCheckout) return;
    const valid = ["Local Business", "Multi-Location", "Agency Max"] as const;
    if (!(valid as readonly string[]).includes(autoCheckout)) return;
    handledAutoCheckout.current = true;
    router.replace("/dashboard/settings?section=billing");
    setTimeout(() => {
      void startUpgrade(autoCheckout as PaidPlanName);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      const blockedMessage = getGoogleConnectBlockMessage(googleStatus, language);
      setGoogleError(blockedMessage || "Google Business connection is not available for this workspace.");
      return;
    }
    if (googleStatus.linkedAccount && googleStatus.hasRequiredScopes === false) {
      setGoogleNotice("Reconnecting Google permissions...");
      return startGoogleLinkFlow();
    }
    if (mode === "add") {
      const blockedMessage = getGoogleConnectBlockMessage(googleStatus, language);
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
    setTeamSuccess("");
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          business:
            inviteAccessMode === "selected" && inviteBusinessIds.length === 1
              ? businesses.find((item) => item.id === inviteBusinessIds[0])?.name || inviteBusiness
              : inviteBusiness,
          role: inviteRole,
          accessMode: inviteAccessMode,
          businessIds: inviteBusinessIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send invitation.");
      setTeamSuccess(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      setInviteAccessMode("all");
      setInviteBusinessIds([]);
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
    setTeamSuccess("");
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
    setTeamError("");
    setTeamSuccess("");
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

  async function changeMemberAccess(
    member: TeamMember,
    accessMode: BusinessAccessMode,
    businessIds: string[]
  ) {
    if (!member.canEditAccess) return;
    setTeamError("");
    setTeamSuccess("");
    setUpdatingAccessId(member.id);
    const res = await fetch("/api/team/members/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, kind: member.kind, accessMode, businessIds }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setTeamError(json?.error || "Failed to update profile access.");
      setUpdatingAccessId(null);
      return;
    }

    setMembers((prev) =>
      prev.map((item) =>
        item.id === member.id
          ? { ...item, accessMode, assignedBusinessIds: businessIds }
          : item
      )
    );
    setUpdatingAccessId(null);
  }

  async function startUpgrade(planName: PaidPlanName) {
    setUpgrading(planName);
    setBillingError("");
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName, billingInterval: selectedInterval }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setBillingError(json?.error || "Failed to start checkout.");
        setUpgrading(null);
        return;
      }
      window.location.href = json.url as string;
    } catch {
      setBillingError("Failed to start checkout.");
      setUpgrading(null);
    }
  }

  async function openBillingPortal() {
    setBillingError("");
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setBillingError(json?.error || "Failed to open billing portal.");
        return;
      }
      window.location.href = json.url as string;
    } catch {
      setBillingError("Failed to open billing portal.");
    }
  }

  async function handleConfirmCancel() {
    setCancelling(true);
    setBillingError("");
    const res = await fetch("/api/subscription/cancel", { method: "POST" });
    const json = await res.json().catch(() => null);
    setCancelling(false);
    if (!res.ok) {
      setBillingError(json?.error || "Failed to cancel subscription.");
      return;
    }
    setSubscription((s) => ({ ...s, cancelAtPeriodEnd: true }));
    setBillingNotice(
      language === "ar"
        ? `سينتهي اشتراكك في ${subscription.nextBillingAt}. سيستمر الوصول الكامل حتى ذلك الحين.`
        : `Your subscription will end on ${subscription.nextBillingAt}. Full access continues until then.`
    );
    setShowCancelDialog(false);
  }

  function openDowngradeDialog(targetPlan: string) {
    const count = subscription.connectedAccounts ?? 0;
    const planMap: Record<string, number> = {
      "Local Business": 1,
      "Multi-Location": 5,
      "Agency Max": 60,
    };
    const newMax = planMap[targetPlan] ?? 1;
    const warning =
      count > newMax
        ? language === "ar"
          ? `لديك ${count} ملف متصل. تسمح خطة ${targetPlan} بعدد ${newMax}. ستحتاج إلى قطع اتصال ${count - newMax} ملف بعد سريان تخفيض الخطة.`
          : `You have ${count} connected profile(s). ${targetPlan} allows ${newMax}. You'll need to disconnect ${count - newMax} profile(s) after the downgrade takes effect.`
        : null;

    setDowngradeTarget(targetPlan);
    setDowngradeWarning(warning);
    setShowDowngradeDialog(true);
  }

  async function handleConfirmDowngrade() {
    if (!downgradeTarget) return;
    setDowngrading(true);
    setBillingError("");
    const res = await fetch("/api/subscription/downgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPlan: downgradeTarget }),
    });
    const json = await res.json().catch(() => null);
    setDowngrading(false);
    if (!res.ok) {
      setBillingError(json?.error || "Failed to schedule downgrade.");
      return;
    }
    setSubscription((s) => ({
      ...s,
      cancelAtPeriodEnd: true,
      scheduledDowngradePlan: downgradeTarget,
    }));
    setBillingNotice(
      language === "ar"
        ? `تمت جدولة التخفيض إلى ${downgradeTarget}. ستتلقى رسالة بريد إلكتروني عند انتهاء فترتك الحالية في ${subscription.nextBillingAt}.`
        : `Downgrade to ${downgradeTarget} scheduled. You'll receive an email when your current period ends on ${subscription.nextBillingAt}.`
    );
    setShowDowngradeDialog(false);
    setDowngradeTarget(null);
    setDowngradeWarning(null);
  }

  async function handleWorkspaceNameSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingWorkspaceName(true);
    setSavedWorkspaceName(false);
    setWorkspaceError("");
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save workspace name.");
      setSavedWorkspaceName(true);
      setTimeout(() => setSavedWorkspaceName(false), 2500);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "Failed to save workspace name.");
    } finally {
      setSavingWorkspaceName(false);
    }
  }

  async function handleLeaveWorkspace() {
    setLeavingWorkspace(true);
    setWorkspaceError("");
    try {
      const res = await fetch("/api/workspace", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to leave workspace.");
      router.refresh();
      router.push("/dashboard/analytics");
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "Failed to leave workspace.");
      setLeavingWorkspace(false);
      setShowLeaveConfirm(false);
    }
  }

  function toggleInviteBusiness(businessId: string) {
    setInviteBusinessIds((prev) =>
      prev.includes(businessId)
        ? prev.filter((id) => id !== businessId)
        : [...prev, businessId]
    );
  }

  function getBusinessNames(businessIds: string[]) {
    if (businessIds.length === 0) return "No profiles selected";
    const separator = language === "ar" ? "، " : ", ";
    return businessIds
      .map((id) => businesses.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(separator);
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
    <>
      <DashboardShell activeHref="/dashboard/settings">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#040404]">{language === "ar" ? "إعدادات مساحة العمل" : "Workspace Settings"}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { key: "profile", label: language === "ar" ? "الملف الشخصي" : "Profile" },
            { key: "ai", label: language === "ar" ? "ردود الذكاء الاصطناعي" : "AI Replies" },
            { key: "google", label: language === "ar" ? "Google Business" : "Google Business" },
            { key: "team", label: language === "ar" ? "الفريق" : "Team" },
            { key: "billing", label: language === "ar" ? "الفوترة" : "Billing" },
            { key: "workspace", label: language === "ar" ? "مساحة العمل" : "Workspace" },
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
            <h2 className="text-xl font-semibold text-[#040404]">{language === "ar" ? "الملف الشخصي" : "Profile"}</h2>
            <p className="text-sm text-[#6A6A82] mt-1">{language === "ar" ? "إدارة معلوماتك الشخصية وإعدادات الحساب." : "Manage your personal information and account settings."}</p>

            {loadingProfile && (
              <div className="mt-5 text-sm text-[#6B6487]">{language === "ar" ? "جارٍ تحميل الملف الشخصي…" : "Loading profile…"}</div>
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
                    {language === "ar" ? "المعلومات الشخصية" : "Personal Information"}
                  </h3>
                  <form onSubmit={handleProfileSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "الاسم الأول" : "First Name"}</label>
                        <input type="text" required className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "اسم العائلة" : "Last Name"}</label>
                        <input type="text" required className={INPUT} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</label>
                      <input type="email" required className={INPUT} value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "رقم الهاتف" : "Phone Number"} <span className="text-gray-600">{language === "ar" ? "(اختياري)" : "(optional)"}</span></label>
                      <input type="tel" className={INPUT} placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "الشركة" : "Company"} <span className="text-gray-600">{language === "ar" ? "(اختياري)" : "(optional)"}</span></label>
                        <input type="text" className={INPUT} placeholder={language === "ar" ? "اسم نشاطك التجاري" : "Your business name"} value={company} onChange={(e) => setCompany(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "الموقع الإلكتروني" : "Website"} <span className="text-gray-600">{language === "ar" ? "(اختياري)" : "(optional)"}</span></label>
                        <input type="url" className={INPUT} placeholder="https://yourbusiness.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "نبذة" : "Bio"} <span className="text-gray-600">{language === "ar" ? "(اختياري)" : "(optional)"}</span></label>
                      <textarea rows={3} className={INPUT} placeholder={language === "ar" ? "وصف مختصر عنك أو عن نشاطك التجاري…" : "A short description about yourself or your business…"} value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <button type="submit" disabled={savingProfile}
                        className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2">
                        {savingProfile ? (
                          <>
                            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            {language === "ar" ? "جارٍ الحفظ…" : "Saving…"}
                          </>
                        ) : (language === "ar" ? "حفظ الملف الشخصي" : "Save Profile")}
                      </button>
                      {savedProfile && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          {language === "ar" ? "تم تحديث الملف الشخصي" : "Profile updated"}
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Language */}
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                    {language === "ar" ? "اللغة" : "Language"}
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
                        <option value="ar" className="bg-[#F6F4FF] text-[#4F4F63]">العربية</option>
                      </select>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                    <p className="text-xs text-[#6B6487] mt-2">
                      {language === "ar" ? "اللغة الحالية:" : "Current language:"} <span className="font-medium text-[#040404]">{language === "ar" ? "العربية" : "English"}</span>
                    </p>
                  </div>
                </div>

                {/* Change Password */}
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                    {language === "ar" ? "تغيير كلمة المرور" : "Change Password"}
                  </h3>
                  <form onSubmit={handlePasswordSave} className="space-y-5">
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "كلمة المرور الحالية" : "Current Password"}</label>
                      <div className="relative">
                        <input type={showCurrent ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder={language === "ar" ? "أدخل كلمة المرور الحالية" : "Enter current password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
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
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "كلمة المرور الجديدة" : "New Password"}</label>
                      <div className="relative">
                        <input type={showNew ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder={language === "ar" ? "٨ أحرف على الأقل" : "Min. 8 characters"} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
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
                            {language === "ar"
                              ? (newPw.length < 8 ? "قصيرة جداً" : newPw.length < 10 ? "ضعيفة" : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && newPw.length >= 12 ? "قوية" : "جيدة")
                              : (newPw.length < 8 ? "Too short" : newPw.length < 10 ? "Weak" : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && newPw.length >= 12 ? "Strong" : "Good")}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-[#6A6A82] mb-1.5">{language === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</label>
                      <div className="relative">
                        <input type={showConfirm ? "text" : "password"} required className={`${INPUT} pr-11`} placeholder={language === "ar" ? "أعد إدخال كلمة المرور الجديدة" : "Re-enter new password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
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
                          {newPw === confirmPw
                            ? (language === "ar" ? "✓ كلمتا المرور متطابقتان" : "✓ Passwords match")
                            : (language === "ar" ? "✗ كلمتا المرور غير متطابقتين" : "✗ Passwords do not match")}
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
                            {language === "ar" ? "جارٍ التحديث…" : "Updating…"}
                          </>
                        ) : (language === "ar" ? "تحديث كلمة المرور" : "Update Password")}
                      </button>
                      {savedPassword && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          {language === "ar" ? "تم تحديث كلمة المرور" : "Password updated"}
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Danger Zone */}
                <div>
                  <h3 className="text-base font-medium text-red-500 mb-5 pb-3 border-b border-red-100">{language === "ar" ? "منطقة الخطر" : "Danger Zone"}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-2xl border border-red-100 bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">{language === "ar" ? "حذف الحساب" : "Delete Account"}</p>
                      <p className="text-xs text-[#6B6487] mt-0.5">{language === "ar" ? "حذف حسابك وجميع البيانات المرتبطة به بشكل نهائي. لا يمكن التراجع عن هذا الإجراء." : "Permanently delete your account and all associated data. This action cannot be undone."}</p>
                    </div>
                    <button type="button" className="self-start sm:self-auto shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">{language === "ar" ? "حذف الحساب" : "Delete Account"}</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {currentTab === "ai" && (
          <section data-tour="ai-settings" className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            <h2 className="text-xl font-semibold text-[#040404]">{language === "ar" ? "إعدادات الرد بالذكاء الاصطناعي" : "AI Reply Settings"}</h2>
            {settingsError && <p className="mt-4 text-sm text-red-500">{settingsError}</p>}
            <form onSubmit={saveSettings} className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[#4F4F63]">{language === "ar" ? "البرومبت" : "Prompt"}</label>
                  <span className="text-xs text-[#8A8AA0]">{prompt.length} {language === "ar" ? "حرف" : "chars"}</span>
                </div>
                <textarea rows={11} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={`${INPUT} min-h-[300px] resize-y`} />
              </div>
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4F4F63]">{language === "ar" ? "النبرة" : "Tone"}</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className={INPUT}>
                    {TONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4F4F63]">{language === "ar" ? "وضع النشر" : "Posting mode"}</label>
                  <div className="grid gap-3">
                    <label className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 text-sm text-[#4F4F63]"><input type="radio" className="mr-2 accent-[#5F30EB]" checked={postType === "auto"} onChange={() => { if (postType !== "auto") setShowAutoConfirm(true); }} />{language === "ar" ? "نشر الردود تلقائيًا" : "Auto post replies"}</label>
                    <label className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 text-sm text-[#4F4F63]"><input type="radio" className="mr-2 accent-[#5F30EB]" checked={postType === "review"} onChange={() => setPostType("review")} />{language === "ar" ? "مراجعة قبل النشر" : "Review before publish"}</label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setPrompt(DEFAULT_AI_PROMPT)} className="rounded-full border border-[#E6E9F8] px-4 py-2 text-sm text-[#6A6A82] cursor-pointer">{language === "ar" ? "إعادة تعيين" : "Reset"}</button>
                  <button type="submit" disabled={savingSettings} className="rounded-full bg-[#5F30EB] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-60">{savingSettings ? (language === "ar" ? "جارٍ الحفظ..." : "Saving...") : (language === "ar" ? "حفظ" : "Save")}</button>
                  {savedSettings && <span className="rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-600">{language === "ar" ? "تم الحفظ" : "Saved"}</span>}
                </div>
              </div>
            </form>

            {/* Auto-post confirmation modal */}
            {showAutoConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-sm rounded-3xl border border-[#E6E9F8] bg-white p-6 shadow-2xl">
                  <h3 className="text-base font-semibold text-[#040404]">
                    {language === "ar" ? "تأكيد النشر التلقائي" : "Enable auto-post?"}
                  </h3>
                  <p className="mt-2 text-sm text-[#6A6A82]">
                    {language === "ar"
                      ? "سيتم نشر الردود مباشرةً على ملف Google Business الخاص بك دون مراجعة. هل تريد المتابعة؟"
                      : "Replies will be posted directly to your Google Business Profile without review. Continue?"}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAutoConfirm(false)}
                      className="flex-1 rounded-full border border-[#E6E9F8] py-2 text-sm font-medium text-[#6A6A82] cursor-pointer"
                    >
                      {language === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPostType("auto"); setShowAutoConfirm(false); }}
                      className="flex-1 rounded-full bg-[#5F30EB] py-2 text-sm font-semibold text-white cursor-pointer"
                    >
                      {language === "ar" ? "نعم، فعّل" : "Yes, enable"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {currentTab === "google" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            {/* Header */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-[#040404]">Google Business</h2>
              <Link href="/dashboard/review-link" className="text-sm font-medium text-[#5F30EB] hover:underline self-start md:self-auto">{language === "ar" ? "فتح رابط التقييم" : "Open Review Link"}</Link>
            </div>

            {/* Messages */}
            {googleError && <p className="mt-4 rounded-2xl bg-red-500/8 px-4 py-3 text-sm text-red-500">{googleError}</p>}
            {googleNotice && <p className="mt-4 rounded-2xl bg-[#5F30EB]/8 px-4 py-3 text-sm text-[#5F30EB]">{googleNotice}</p>}
            {!googleError && getGoogleConnectBlockMessage(googleStatus, language) && (
              <p className="mt-4 rounded-2xl bg-orange-500/8 px-4 py-3 text-sm text-orange-600">{getGoogleConnectBlockMessage(googleStatus, language)}</p>
            )}

            {/* Location picker (shown while picking a new location to connect) */}
            {availableLocations && availableLocations.length > 1 && (
              <div className="mt-6 rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4 space-y-3">
                <p className="text-sm font-medium text-[#040404]">{language === "ar" ? "اختر موقعاً للربط:" : "Select a location to connect:"}</p>
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
                    {connectingGoogle ? (language === "ar" ? "جارٍ الربط..." : "Connecting...") : (language === "ar" ? "ربط الموقع المحدد" : "Connect Selected Location")}
                  </button>
                  <button
                    onClick={() => setAvailableLocations(null)}
                    className="rounded-2xl border border-[#E6E9F8] px-5 py-3 text-sm font-medium text-[#4F4F63] cursor-pointer"
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* Connected profiles list */}
            {!availableLocations && (
              <div className="mt-6 space-y-3">
                {connectedProfiles.length === 0 && !connected && (
                  <p className="text-sm text-[#6A6A82]">{language === "ar" ? "اربط ملف Google Business الخاص بك لبدء مزامنة التقييمات وتوليد الردود بالذكاء الاصطناعي." : "Connect your Google Business Profile to start syncing reviews and generating AI replies."}</p>
                )}

                {connectedProfiles.map((profile) => {
                  const isConfirmingDisconnect = showDisconnectConfirm === profile.id;
                  const isSyncing = syncingReviews === profile.id;

                  return (
                    <div key={profile.id} className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4">
                      {isConfirmingDisconnect ? (
                        <div className="space-y-3">
                          <p className="text-sm text-[#040404]">
                            {language === "ar"
                              ? <>{" "}<strong>{profile.name}</strong> — هل تريد قطع الاتصال؟ ستتوقف المزامنة حتى إعادة الربط.</>
                              : <>Disconnect <strong>{profile.name}</strong>? Review syncing will stop until you reconnect.</>}
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={async () => { setShowDisconnectConfirm(null); await handleDisconnectGoogle(profile.id); }}
                              disabled={disconnectingGoogle}
                              className="rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                            >
                              {disconnectingGoogle ? (language === "ar" ? "جارٍ قطع الاتصال..." : "Disconnecting...") : (language === "ar" ? "نعم، قطع الاتصال" : "Yes, Disconnect")}
                            </button>
                            <button
                              onClick={() => setShowDisconnectConfirm(null)}
                              className="rounded-2xl border border-[#E6E9F8] px-5 py-2.5 text-sm font-medium text-[#4F4F63] cursor-pointer"
                            >
                              {language === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#040404] truncate">{profile.name}</p>
                              <p className="text-xs text-[#8A8AA0]">{profile.syncedReviewCount} {language === "ar" ? "تقييم تمت مزامنته" : "reviews synced"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => void handleSyncReviews(profile.id)}
                              disabled={!!syncingReviews}
                              className="rounded-2xl bg-[#5F30EB] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                            >
                              {isSyncing ? (language === "ar" ? "جارٍ المزامنة..." : "Syncing...") : (language === "ar" ? "مزامنة" : "Sync")}
                            </button>
                            <button
                              onClick={() => setShowDisconnectConfirm(profile.id)}
                              className="rounded-2xl border border-red-500/20 px-4 py-2 text-xs font-medium text-red-500 cursor-pointer"
                            >
                              {language === "ar" ? "قطع الاتصال" : "Disconnect"}
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
                        {connectingGoogle ? (language === "ar" ? "جارٍ الربط..." : "Connecting...") : (language === "ar" ? "ربط ملف الأعمال" : "Connect Business Profile")}
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
                          {connectingGoogle ? (language === "ar" ? "جارٍ التحميل..." : "Loading...") : (language === "ar" ? "إضافة ملف أعمال" : "Add Business Profile")}
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
            <h2 className="text-xl font-semibold text-[#040404]">{language === "ar" ? "صلاحيات الفريق" : "Team Access"}</h2>
            {teamSuccess && <p className="mt-4 text-sm text-green-600">{teamSuccess}</p>}
            {teamError && <p className="mt-4 text-sm text-red-500">{teamError}</p>}
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={sendInvite} className="space-y-4 rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-5">
                <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="team@example.com" className={INPUT} />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className={INPUT}>
                  <option value="VIEWER">{language === "ar" ? "مشاهد" : "Viewer"}</option>
                  <option value="EDITOR">{language === "ar" ? "محرر" : "Editor"}</option>
                  <option value="MANAGER">{language === "ar" ? "مدير" : "Manager"}</option>
                </select>
                <div className="rounded-2xl border border-[#E6E9F8] bg-white p-4">
                  <p className="text-sm font-medium text-[#040404]">{language === "ar" ? "صلاحية الوصول للملفات" : "Profile access"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => { setInviteAccessMode("all"); setInviteBusinessIds([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${inviteAccessMode === "all" ? "border-[#5F30EB]/30 bg-[#5F30EB]/10 text-[#5F30EB]" : "border-[#E6E9F8] text-[#6A6A82]"}`}>{language === "ar" ? "جميع الملفات" : "All profiles"}</button>
                    <button type="button" onClick={() => setInviteAccessMode("selected")} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${inviteAccessMode === "selected" ? "border-[#5F30EB]/30 bg-[#5F30EB]/10 text-[#5F30EB]" : "border-[#E6E9F8] text-[#6A6A82]"}`}>{language === "ar" ? "ملفات محددة" : "Selected profiles"}</button>
                  </div>
                  {inviteAccessMode === "selected" && (
                    <div className="mt-3 space-y-2">
                      {businesses.length === 0 ? <p className="text-xs text-[#8A8AA0]">{language === "ar" ? "لا توجد ملفات متاحة بعد." : "No profiles available yet."}</p> : businesses.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-sm text-[#4F4F63]">
                          <input type="checkbox" checked={inviteBusinessIds.includes(item.id)} onChange={() => toggleInviteBusiness(item.id)} className="accent-[#5F30EB]" />
                          <span>{item.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={sendingInvite} className="w-full rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-60">{sendingInvite ? (language === "ar" ? "جارٍ الإرسال..." : "Sending...") : (language === "ar" ? "إرسال الدعوة" : "Send Invitation")}</button>
              </form>
              <div className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#040404]">{language === "ar" ? "الأعضاء" : "Members"}</h3>
                  <span className="text-sm text-[#8A8AA0]">{members.length} {language === "ar" ? "عضو" : "total"}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {members.length === 0 ? <p className="text-sm text-[#6A6A82]">{language === "ar" ? "لا يوجد أعضاء في الفريق بعد." : "No team members yet."}</p> : members.slice(0, 6).map((member) => (
                    <div key={`${member.kind}:${member.id}`} className={`rounded-2xl border border-[#E6E9F8] bg-white p-4 ${removingId === member.id ? "opacity-50" : ""}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#040404]">{member.email}</p>
                          <p className="text-xs text-[#8A8AA0]">{member.business} - {member.joinedAt}</p>
                          <p className="mt-1 text-xs text-[#6A6A82]">{member.accessMode === "all" ? (language === "ar" ? "الوصول: جميع الملفات" : "Access: All profiles") : `${language === "ar" ? "الوصول:" : "Access:"} ${getBusinessNames(member.assignedBusinessIds)}`}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[member.status]}`}>{member.status}</span>
                          <select value={member.role} disabled={!member.canEditRole} onChange={(e) => changeMemberRole(member, e.target.value as Role)} className={`appearance-none rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50 ${ROLE_COLORS[member.role]}`}>
                            <option value="VIEWER">{language === "ar" ? "مشاهد" : "Viewer"}</option>
                            <option value="EDITOR">{language === "ar" ? "محرر" : "Editor"}</option>
                            <option value="MANAGER">{language === "ar" ? "مدير" : "Manager"}</option>
                          </select>
                          <button onClick={() => removeMember(member)} disabled={!member.canRemove || removingId === member.id} className="rounded-full border border-red-500/15 px-3 py-1.5 text-xs font-medium text-red-500 cursor-pointer disabled:opacity-50">
                            {language === "ar" ? "إزالة" : "Remove"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-[#F0F2FA] bg-[#FBFBFF] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" disabled={!member.canEditAccess || updatingAccessId === member.id} onClick={() => void changeMemberAccess(member, "all", [])} className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${member.accessMode === "all" ? "border-[#5F30EB]/30 bg-[#5F30EB]/10 text-[#5F30EB]" : "border-[#E6E9F8] text-[#6A6A82]"}`}>{language === "ar" ? "جميع الملفات" : "All profiles"}</button>
                          <button type="button" disabled={!member.canEditAccess || updatingAccessId === member.id} onClick={() => void changeMemberAccess(member, "selected", member.assignedBusinessIds)} className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${member.accessMode === "selected" ? "border-[#5F30EB]/30 bg-[#5F30EB]/10 text-[#5F30EB]" : "border-[#E6E9F8] text-[#6A6A82]"}`}>{language === "ar" ? "ملفات محددة" : "Selected profiles"}</button>
                        </div>
                        {member.accessMode === "selected" && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {businesses.map((item) => {
                              const checked = member.assignedBusinessIds.includes(item.id);
                              const nextIds = checked ? member.assignedBusinessIds.filter((id) => id !== item.id) : [...member.assignedBusinessIds, item.id];
                              return (
                                <label key={`${member.id}:${item.id}`} className="flex items-center gap-2 text-sm text-[#4F4F63]">
                                  <input type="checkbox" checked={checked} disabled={!member.canEditAccess || updatingAccessId === member.id} onChange={() => void changeMemberAccess(member, "selected", nextIds)} className="accent-[#5F30EB]" />
                                  <span>{item.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {currentTab === "workspace" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            <h2 className="text-xl font-semibold text-[#040404]">
              {language === "ar" ? "مساحة العمل" : "Workspace"}
            </h2>
            <p className="text-sm text-[#6A6A82] mt-1">
              {language === "ar"
                ? "إدارة إعدادات مساحة العمل وعضويتك."
                : "Manage this workspace's settings and your membership."}
            </p>

            {workspaceError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {workspaceError}
              </div>
            )}

            <div className="mt-6 space-y-8">
              {/* Name */}
              <div>
                <h3 className="text-base font-medium text-[#040404] mb-4 pb-3 border-b border-[#E6E1FA]">
                  {language === "ar" ? "اسم مساحة العمل" : "Workspace Name"}
                </h3>
                <form onSubmit={handleWorkspaceNameSave} className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-[#6A6A82] mb-1.5">
                      {language === "ar" ? "الاسم" : "Name"}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      className={INPUT}
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      disabled={!workspaceIsOwner}
                    />
                    {!workspaceIsOwner && (
                      <p className="mt-1.5 text-xs text-[#9490A8]">
                        {language === "ar"
                          ? "يمكن لمالك مساحة العمل فقط إعادة تسميتها."
                          : "Only the workspace owner can rename it."}
                      </p>
                    )}
                  </div>
                  {workspaceIsOwner && (
                    <button
                      type="submit"
                      disabled={savingWorkspaceName}
                      className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2 shrink-0"
                    >
                      {savingWorkspaceName ? (
                        <>
                          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                          {language === "ar" ? "جارٍ الحفظ..." : "Saving…"}
                        </>
                      ) : (language === "ar" ? "حفظ" : "Save")}
                    </button>
                  )}
                  {savedWorkspaceName && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                      {language === "ar" ? "تم الحفظ" : "Saved"}
                    </div>
                  )}
                </form>
              </div>

              {/* Role */}
              <div>
                <h3 className="text-base font-medium text-[#040404] mb-4 pb-3 border-b border-[#E6E1FA]">
                  {language === "ar" ? "دورك" : "Your Role"}
                </h3>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E9F8] bg-[#FBFBFF] px-4 py-2 text-sm font-medium text-[#040404]">
                  {workspaceRole
                    ? language === "ar"
                      ? ({ owner: "مالك", manager: "مدير", editor: "محرر", viewer: "مشاهد" }[workspaceRole] ?? workspaceRole)
                      : workspaceRole.charAt(0).toUpperCase() + workspaceRole.slice(1)
                    : "—"}
                </div>
              </div>

              {/* Leave workspace (non-owners only) */}
              {!workspaceIsOwner && (
                <div>
                  <h3 className="text-base font-medium text-[#040404] mb-4 pb-3 border-b border-[#E6E1FA]">
                    {language === "ar" ? "مغادرة مساحة العمل" : "Leave Workspace"}
                  </h3>
                  <p className="text-sm text-[#6A6A82] mb-4">
                    {language === "ar"
                      ? "سيتم إزالتك من مساحة العمل هذه. يمكنك الانضمام مجدداً بدعوة جديدة لاحقاً."
                      : "You will be removed from this workspace. You can always be re-invited later."}
                  </p>
                  {!showLeaveConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(true)}
                      className="px-5 py-3 rounded-full text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      {language === "ar" ? "مغادرة مساحة العمل" : "Leave workspace"}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-[#040404] font-medium">
                        {language === "ar" ? "هل أنت متأكد؟" : "Are you sure?"}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleLeaveWorkspace()}
                        disabled={leavingWorkspace}
                        className="px-5 py-3 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {leavingWorkspace
                          ? (language === "ar" ? "جارٍ المغادرة..." : "Leaving…")
                          : (language === "ar" ? "نعم، غادر" : "Yes, leave")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLeaveConfirm(false)}
                        className="px-5 py-3 rounded-full text-sm font-medium text-[#5E5876] border border-[#E6E9F8] hover:bg-[#F0EBFF] transition-colors cursor-pointer"
                      >
                        {language === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {currentTab === "billing" && (
          <section className="rounded-[30px] border border-[#E6E9F8] p-6 md:p-8" style={panelStyle()}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#040404]">{language === "ar" ? "الفوترة والخطة" : "Billing And Plan"}</h2>
                <p className="text-sm text-[#6A6A82] mt-1">{language === "ar" ? "الخطة الحالية والاستخدام والترقيات." : "Current plan, usage, and upgrades."}</p>
              </div>
              <Link href="/pricing" className="text-sm font-medium text-[#5F30EB] hover:underline">{language === "ar" ? "مقارنة جميع الخطط" : "Compare all plans"}</Link>
            </div>
            {billingNotice && <p className="mt-4 text-sm text-green-600">{billingNotice}</p>}
            {billingError && <p className="mt-4 text-sm text-red-500">{billingError}</p>}

            {/* Cancel-at-period-end banner (without downgrade) */}
            {subscription.cancelAtPeriodEnd && !subscription.scheduledDowngradePlan && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700">
                    {language === "ar" ? `تنتهي الاشتراك في ${subscription.nextBillingAt}` : `Subscription ends on ${subscription.nextBillingAt}`}
                  </p>
                  <p className="mt-0.5 text-xs text-orange-600">
                    {language === "ar" ? "يستمر الوصول الكامل حتى ذلك الحين. يمكنك إعادة الاشتراك في أي وقت." : "Full access continues until then. You can re-subscribe any time."}
                  </p>
                </div>
                <button
                  onClick={() => startUpgrade(subscription.plan === "free" ? "Local Business" : subscription.plan)}
                  disabled={subscription.plan === "free" || !!upgrading}
                  className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {language === "ar" ? "إعادة الاشتراك" : "Re-subscribe"}
                </button>
              </div>
            )}

            {/* Downgrade-scheduled banner */}
            {subscription.scheduledDowngradePlan && (
              <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-800">
                  {language === "ar" ? `سيتم التخفيض إلى ${subscription.scheduledDowngradePlan} في ${subscription.nextBillingAt}` : `Downgrading to ${subscription.scheduledDowngradePlan} on ${subscription.nextBillingAt}`}
                </p>
                <p className="mt-0.5 text-xs text-yellow-700">
                  {language === "ar" ? `ستتلقى بريداً إلكترونياً عند انتهاء فترتك الحالية لإتمام اشتراك ${subscription.scheduledDowngradePlan} الجديد.` : `You'll receive an email when your current period ends to complete your new ${subscription.scheduledDowngradePlan} subscription.`}
                </p>
              </div>
            )}

            {/* Current plan stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {(
                [
                  { label: language === "ar" ? "الخطة" : "Plan", value: subscription.plan === "free" ? (language === "ar" ? "مجاني" : "Free") : subscription.plan },
                  { label: language === "ar" ? "الحالة" : "Status", value: subscription.status },
                  {
                    label: language === "ar" ? "السعر" : "Price",
                    value: subscription.plan === "free" ? (
                      language === "ar" ? "مجاني" : "Free"
                    ) : (
                      <span className="flex items-center gap-1">
                        <SarIcon className="h-3.5 w-auto flex-shrink-0" />
                        {subscription.price}
                        {subscription.billingInterval === "yearly" ? (language === "ar" ? "/سنة" : "/year") : (language === "ar" ? "/شهر" : "/month")}
                      </span>
                    ),
                  },
                  { label: language === "ar" ? "الفوترة التالية" : "Next Billing", value: subscription.nextBillingAt },
                ] as { label: string; value: React.ReactNode }[]
              ).map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#8A8AA0]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#040404] capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Billing interval toggle */}
            <div className="mt-7 flex flex-col items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-[#E6E9F8] bg-[#FBFBFF] p-1">
                <button
                  type="button"
                  onClick={() => setSelectedInterval("monthly")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
                    selectedInterval === "monthly"
                      ? "bg-[#1A1824] text-white shadow-sm"
                      : "text-[#5E5876] hover:text-[#5F30EB]"
                  }`}
                >
                  {language === "ar" ? "شهري" : "Monthly"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInterval("yearly")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
                    selectedInterval === "yearly"
                      ? "bg-[#1A1824] text-white shadow-sm"
                      : "text-[#5E5876] hover:text-[#5F30EB]"
                  }`}
                >
                  {language === "ar" ? "سنوي" : "Yearly"}
                </button>
              </div>
              {selectedInterval === "yearly" && (
                <p className="text-xs font-semibold text-green-600">{language === "ar" ? "وفّر شهرين — احصل على 12 شهراً بسعر 10" : "Save 2 months — get 12 months for the price of 10"}</p>
              )}
            </div>

            {/* Plan cards */}
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent =
                  subscription.plan === plan.name &&
                  subscription.billingInterval === selectedInterval;
                const displayPrice =
                  selectedInterval === "yearly" ? plan.yearlyMonthly : plan.monthlyPrice;
                const currentRank = PLAN_RANK[subscription.plan] ?? 0;
                const thisRank = PLAN_RANK[plan.name] ?? 0;
                const isDowngrade =
                  !isCurrent &&
                  subscription.status === "active" &&
                  !subscription.cancelAtPeriodEnd &&
                  thisRank < currentRank &&
                  // Multi-Location → Local Business is the only downgrade target row we support,
                  // and Agency Max → any lower; exclude free as a downgrade destination
                  plan.name !== ("free" as string);
                const blockedByPending =
                  subscription.cancelAtPeriodEnd || !!subscription.scheduledDowngradePlan;
                return (
                  <div key={plan.name} className={`rounded-[24px] border p-5 ${isCurrent ? "border-[#5F30EB]/30 bg-[#5F30EB]/[0.05]" : "border-[#E6E9F8] bg-[#FBFBFF]"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#040404]">{plan.name}</p>
                      {selectedInterval === "yearly" && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                          {language === "ar" ? "وفّر شهرين" : "Save 2 months"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-[#5F30EB] flex items-center gap-1">
                      <SarIcon className="h-5 w-auto flex-shrink-0" />
                      {displayPrice}
                      <span className="text-sm text-[#8A8AA0]">{language === "ar" ? "/شهر" : "/mo"}</span>
                    </p>
                    {selectedInterval === "yearly" && (
                      <p className="mt-0.5 text-xs text-[#8A8AA0] flex items-center gap-0.5">
                        {language === "ar" ? "يُفوتر بـ" : "Billed as"} <SarIcon className="h-2.5 w-auto" />{plan.yearlyPrice}{language === "ar" ? "/سنة" : "/year"}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-[#6A6A82]">{plan.accounts}</p>
                    <button
                      onClick={() => {
                        if (isCurrent) return;
                        if (isDowngrade) {
                          openDowngradeDialog(plan.name);
                        } else {
                          void startUpgrade(plan.name);
                        }
                      }}
                      disabled={isCurrent || upgrading === plan.name || blockedByPending}
                      className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold cursor-pointer transition-opacity ${
                        isCurrent
                          ? "bg-[#5F30EB]/12 text-[#5F30EB]"
                          : isDowngrade
                          ? "bg-white border border-[#5F30EB] text-[#5F30EB] hover:bg-[#5F30EB]/5"
                          : "bg-[#5F30EB] text-white hover:opacity-90"
                      } disabled:opacity-60`}
                    >
                      {upgrading === plan.name
                        ? (language === "ar" ? "جارٍ المعالجة..." : "Processing...")
                        : isCurrent
                        ? (language === "ar" ? "الخطة الحالية" : "Active Plan")
                        : isDowngrade
                        ? (language === "ar" ? "تخفيض الخطة" : "Downgrade")
                        : (language === "ar" ? "ترقية" : "Upgrade")}
                    </button>
                    {isCurrent &&
                      (subscription.status === "active" || subscription.status === "past_due") &&
                      !subscription.cancelAtPeriodEnd &&
                      !subscription.scheduledDowngradePlan &&
                      subscription.plan !== "free" && (
                        <button
                          onClick={() => setShowCancelDialog(true)}
                          className="mt-3 w-full text-xs font-medium text-red-500 hover:underline"
                        >
                          {language === "ar" ? "إلغاء الاشتراك" : "Cancel subscription"}
                        </button>
                      )}
                  </div>
                );
              })}
            </div>

            {/* Manage billing via Stripe Customer Portal */}
            {subscription.status === "active" && subscription.plan !== "free" && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void openBillingPortal()}
                  className="text-xs font-medium text-[#5F30EB] hover:underline"
                >
                  {language === "ar" ? "إدارة الفوترة" : "Manage billing"}
                </button>
              </div>
            )}

            {/* Cancel confirmation dialog */}
            {showCancelDialog && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => !cancelling && setShowCancelDialog(false)}
              >
                <div
                  className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-[#040404]">{language === "ar" ? "إلغاء اشتراكك؟" : "Cancel your subscription?"}</h3>
                  <p className="mt-3 text-sm text-[#6A6A82]">
                    {language === "ar"
                      ? <>{`ستحتفظ بالوصول الكامل إلى ${subscription.plan} حتى `}<span className="font-semibold text-[#040404]">{subscription.nextBillingAt}</span>{`. بعد ذلك، سيتم تعطيل توليد الردود بالذكاء الاصطناعي وإدارة Google Business.`}</>
                      : <>You&apos;ll keep full access to {subscription.plan} until{" "}<span className="font-semibold text-[#040404]">{subscription.nextBillingAt}</span>. After that, AI reply generation and Google Business management will be disabled.</>}
                  </p>
                  <p className="mt-3 text-sm text-[#6A6A82]">
                    {language === "ar" ? "لن تُجرى أي رسوم إضافية. يمكنك إعادة الاشتراك في أي وقت." : "No further charges will be made. You can re-subscribe any time."}
                  </p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => setShowCancelDialog(false)}
                      disabled={cancelling}
                      className="rounded-2xl border border-[#E6E9F8] px-4 py-2.5 text-sm font-semibold text-[#040404] hover:bg-[#FBFBFF] disabled:opacity-60"
                    >
                      {language === "ar" ? "الاحتفاظ بالاشتراك" : "Keep subscription"}
                    </button>
                    <button
                      onClick={handleConfirmCancel}
                      disabled={cancelling}
                      className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                    >
                      {cancelling ? (language === "ar" ? "جارٍ الإلغاء..." : "Cancelling...") : (language === "ar" ? "إلغاء في نهاية الفترة" : "Cancel at period end")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Downgrade confirmation dialog */}
            {showDowngradeDialog && downgradeTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => !downgrading && setShowDowngradeDialog(false)}
              >
                <div
                  className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-[#040404]">
                    {language === "ar" ? `التخفيض إلى ${downgradeTarget}؟` : `Downgrade to ${downgradeTarget}?`}
                  </h3>
                  <p className="mt-3 text-sm text-[#6A6A82]">
                    {language === "ar"
                      ? <>{`يستمر وصولك إلى ${subscription.plan} الحالي حتى `}<span className="font-semibold text-[#040404]">{subscription.nextBillingAt}</span>{`. بعد ذلك، ستتلقى بريداً إلكترونياً لإعداد اشتراك ${downgradeTarget} الجديد.`}</>
                      : <>Your current {subscription.plan} access continues until{" "}<span className="font-semibold text-[#040404]">{subscription.nextBillingAt}</span>. After that, you&apos;ll receive an email to set up your {downgradeTarget} subscription.</>}
                  </p>
                  {downgradeWarning && (
                    <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                      <p className="text-xs font-semibold text-yellow-800">⚠ {language === "ar" ? "تنبيه حد الحسابات" : "Account limit notice"}</p>
                      <p className="mt-1 text-xs text-yellow-700">{downgradeWarning}</p>
                    </div>
                  )}
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => setShowDowngradeDialog(false)}
                      disabled={downgrading}
                      className="rounded-2xl border border-[#E6E9F8] px-4 py-2.5 text-sm font-semibold text-[#040404] hover:bg-[#FBFBFF] disabled:opacity-60"
                    >
                      {language === "ar" ? "الاحتفاظ بالخطة الحالية" : "Keep current plan"}
                    </button>
                    <button
                      onClick={handleConfirmDowngrade}
                      disabled={downgrading}
                      className="rounded-2xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {downgrading ? (language === "ar" ? "جارٍ الجدولة..." : "Scheduling...") : (language === "ar" ? "جدولة التخفيض" : "Schedule downgrade")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
      </DashboardShell>
    </>
  );
}
