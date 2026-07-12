"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { useBusinessContext } from "@/lib/business-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTour } from "@/components/tour/tour-provider";

type NavItem = {
  title: string;
  titleAr: string;
  href: string;
  icon: React.ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    titleAr: "لوحة التحكم",
    href: "/dashboard/analytics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    title: "Reviews",
    titleAr: "التقييمات",
    href: "/dashboard/reviews",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "AI Reports",
    titleAr: "تقارير الذكاء الاصطناعي",
    href: "/dashboard/reports",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v4" /><path d="m6.34 7.34 2.83 2.83" /><path d="M2 12h4" />
        <path d="m17.66 7.34-2.83 2.83" /><path d="M22 12h-4" />
        <path d="M12 18v4" /><path d="m6.34 16.66 2.83-2.83" />
        <path d="m17.66 16.66-2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "Review Link",
    titleAr: "رابط التقييم",
    href: "/dashboard/review-link",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Settings",
    titleAr: "الإعدادات",
    href: "/dashboard/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

function SidebarSection({
  activeHref,
  collapsed,
  onNavigate,
}: {
  activeHref: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { language } = useLanguage();
  return (
    <nav data-tour="sidebar-nav" className="mt-6 flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = activeHref === item.href;
        const title = language === "ar" ? item.titleAr : item.title;
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? title : undefined}
            className={`group relative flex items-center rounded-2xl px-3 py-3 text-sm transition-all ${
              collapsed ? "justify-center" : "gap-3"
            } ${
              isActive
                ? "bg-[#5F30EB] text-white shadow-[0_4px_16px_rgba(95,48,235,0.24)]"
                : "text-[#6B6487] hover:bg-[#F0EBFF] hover:text-[#5F30EB]"
            }`}
          >
            <span className={`${isActive ? "text-white" : "text-current"}`}>{item.icon}</span>
            {!collapsed && <span className="truncate font-medium">{title}</span>}
          </Link>
        );
        if (!collapsed) return link;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side={language === "ar" ? "left" : "right"}>{title}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

type WorkspaceEntry = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

const ROLE_AR: Record<string, string> = {
  owner: "مالك",
  manager: "مدير",
  editor: "محرر",
  viewer: "مشاهد",
};

function WorkspaceSelector({
  workspaces,
  collapsed,
  onSwitch,
}: {
  workspaces: WorkspaceEntry[];
  collapsed: boolean;
  onSwitch: (id: string) => void;
}) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const active = workspaces.find((w) => w.isActive) ?? workspaces[0];

  if (!active) return null;

  const initial = active.name.charAt(0).toUpperCase();

  function roleLabel(role: string) {
    if (isArabic) return ROLE_AR[role] ?? role;
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  return (
    <div data-tour="workspace-selector" className={`relative ${collapsed ? "flex justify-center" : ""}`}>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <button
        type="button"
        title={collapsed ? active.name : undefined}
        className={`flex items-center gap-2.5 rounded-2xl border border-[#E6E1FA] bg-[#F8F7FF] transition-colors hover:bg-[#F0EBFF] cursor-pointer ${
          collapsed ? "h-10 w-10 justify-center" : "w-full px-3 py-2.5"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#5F30EB] text-xs font-bold text-white">
          {initial}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-start text-sm font-medium text-[#040404]">
              {active.name}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[#9490A8]">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={collapsed ? (isArabic ? "left" : "right") : "bottom"} className="min-w-[220px] rounded-2xl border-[#E6E1FA] p-0 shadow-[0_8px_24px_rgba(95,48,235,0.12)]">
          <DropdownMenuLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9490A8]">
            {isArabic ? "مساحات العمل" : "Workspaces"}
          </DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onSelect={() => onSwitch(w.id)}
              className={`w-full flex items-center gap-3 rounded-none px-4 py-3 text-sm text-start border-t border-[#F4F2FC] ${
                w.isActive ? "bg-[#F0EBFF]" : ""
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5F30EB] text-xs font-bold text-white">
                {w.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`truncate text-sm ${w.isActive ? "font-semibold text-[#5F30EB]" : "font-medium text-[#040404]"}`}>
                  {w.name}
                </p>
                <p className="text-xs text-[#9490A8]">{roleLabel(w.role)}</p>
              </div>
              {w.isActive && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[#5F30EB]">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="m-0" />
          <div className="p-2">
            <Link
              href="/workspaces"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5F30EB] transition-colors hover:bg-[#F0EBFF]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <path d="M3 3h7v7H3z" />
                <path d="M14 3h7v7h-7z" />
                <path d="M14 14h7v7h-7z" />
                <path d="M3 14h7v7H3z" />
              </svg>
              <span>{isArabic ? "العودة إلى مساحات العمل" : "Back to workspaces"}</span>
            </Link>
          </div>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarContent({
  activeHref,
  collapsed,
  onToggle,
  onLogout,
  onNavigate,
  onSwitchWorkspace,
  profile,
  initials,
  workspaces: workspaceList,
}: {
  activeHref: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
  onSwitchWorkspace: (id: string) => void;
  profile: { name: string; email: string };
  initials: string;
  workspaces: WorkspaceEntry[];
}) {
  const { startTour } = useTour();
  const { language } = useLanguage();
  return (
    <div className={`flex h-full flex-col rounded-[28px] border border-[#E6E1FA] bg-white text-[#040404] shadow-[0_4px_24px_rgba(95,48,235,0.08)] transition-all ${collapsed ? "w-[88px]" : "w-[272px]"}`}>

      {/* Expanded header */}
      {!collapsed && (
        <div className="flex items-center justify-between px-4 pt-4">
          <Link href="/dashboard/analytics" className="flex items-center gap-3" onClick={onNavigate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/wakkelni-logo.png" alt="Wakkelni" width={34} height={34} className="h-8 w-8 object-contain" />
            <p className="text-sm font-semibold text-[#040404]">Wakkelni</p>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggle}
            aria-label={language === "ar" ? "طي الشريط الجانبي" : "Collapse sidebar"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </Button>
        </div>
      )}

      {/* Collapsed header: toggle on top, logo below */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 px-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggle}
            aria-label={language === "ar" ? "توسيع الشريط الجانبي" : "Expand sidebar"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </Button>
          <Link href="/dashboard/analytics" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0EBFF]" onClick={onNavigate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/wakkelni-logo.png" alt="Wakkelni" width={26} height={26} className="h-6 w-6 object-contain" />
          </Link>
        </div>
      )}

      <div className={`no-scrollbar flex-1 overflow-y-auto ${collapsed ? "px-3" : "px-4"}`}>
        {workspaceList.length > 0 && (
          <div className="mt-4">
            <WorkspaceSelector
              workspaces={workspaceList}
              collapsed={collapsed}
              onSwitch={onSwitchWorkspace}
            />
          </div>
        )}
        <SidebarSection activeHref={activeHref} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className={`${collapsed ? "px-3 pb-3" : "px-4 pb-4"} mt-auto`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size={collapsed ? "icon" : "default"} onClick={startTour} className={collapsed ? "mb-2 w-full" : "mb-2 w-full justify-start"} aria-label={language === "ar" ? "عرض الجولة التعريفية" : "Show product tour"}>
              <span className="flex size-5 items-center justify-center rounded-full border border-current text-xs font-bold">?</span>{!collapsed && <span>{language === "ar" ? "عرض الجولة" : "Show tour"}</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side={language === "ar" ? "left" : "right"}>{language === "ar" ? "عرض الجولة" : "Show tour"}</TooltipContent>}
        </Tooltip>
        <div className={`rounded-2xl border border-[#E6E1FA] bg-[#F8F7FF] ${collapsed ? "px-0 py-3" : "px-3 py-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0EBFF] text-xs font-semibold text-[#5F30EB]">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#040404]">{profile.name}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onLogout()}
                  className="rounded-xl border border-[#E6E1FA] px-3 py-2 text-xs font-medium text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
                >
                  {language === "ar" ? "تسجيل الخروج" : "Logout"}
                </Button>
              </>
            )}
          </div>
          {collapsed && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={() => void onLogout()}
                title={language === "ar" ? "تسجيل الخروج" : "Logout"}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6E1FA] text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessSelector() {
  const { businesses, activeBusiness, setActiveBusiness } = useBusinessContext();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  if (businesses.length <= 1) return null;

  const label = activeBusiness
    ? activeBusiness.name
    : isArabic
      ? "جميع الملفات"
      : "All Profiles";

  return (
    <div data-tour="business-selector" className="relative">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="flex items-center gap-2 rounded-2xl border border-[#E6E1FA] bg-white px-3 py-2 text-sm font-medium text-[#040404] shadow-sm hover:bg-[#F0EBFF] hover:text-[#5F30EB] transition-colors cursor-pointer max-w-[200px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[#5F30EB]">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="truncate">{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px] rounded-2xl p-0 shadow-[0_8px_24px_rgba(95,48,235,0.12)]">
          <DropdownMenuItem
            onSelect={() => setActiveBusiness(null)}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-start transition-colors hover:bg-[#F0EBFF] cursor-pointer ${activeBusiness === null ? "bg-[#F0EBFF] font-semibold text-[#5F30EB]" : "text-[#040404]"}`}
          >
            <span className="h-2 w-2 rounded-full bg-[#5F30EB] shrink-0" />
            {isArabic ? "جميع الملفات" : "All Profiles"}
          </DropdownMenuItem>
          {businesses.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onSelect={() => setActiveBusiness(b)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-start transition-colors hover:bg-[#F0EBFF] cursor-pointer border-t border-[#F0EBFF] ${activeBusiness?.id === b.id ? "bg-[#F0EBFF] font-semibold text-[#5F30EB]" : "text-[#040404]"}`}
            >
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="truncate">{b.name}</span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DashboardShellInner({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("dashboard_sidebar_collapsed") === "true";
  });
  const [profile, setProfile] = useState({
    name: "Account",
    email: "",
  });
  const [workspaceList, setWorkspaceList] = useState<WorkspaceEntry[]>([]);

  useEffect(() => {
    let mounted = true;

    void fetch("/api/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          firstName: string;
          lastName: string;
          email: string;
        }>;
      })
      .then((data) => {
        if (!mounted || !data) return;
        const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
        setProfile({ name: fullName || "Account", email: data.email || "" });
      })
      .catch(() => null);

    void fetch("/api/workspaces", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ workspaces: WorkspaceEntry[] }>;
      })
      .then((data) => {
        if (!mounted || !data) return;
        setWorkspaceList(data.workspaces);
      })
      .catch(() => null);

    return () => { mounted = false; };
  }, []);

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [profile.name]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard_sidebar_collapsed", String(next));
      return next;
    });
  }

  async function handleLogout() {
    await authClient.signOut();
    setMobileOpen(false);
    router.push("/GetStarted?mode=login");
    router.refresh();
  }

  async function handleSwitchWorkspace(workspaceId: string) {
    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    if (!res.ok) return;
    setWorkspaceList((prev) =>
      prev.map((w) => ({ ...w, isActive: w.id === workspaceId }))
    );
    router.refresh();
  }

  const desktopOffset = collapsed ? "md:ps-[120px]" : "md:ps-[304px]";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(95,48,235,0.10),_transparent_28%),linear-gradient(180deg,_#F8F7FF_0%,_#F2EEFF_100%)] text-[#040404]">
      {/* start-0 = inset-inline-start:0 — resolves to left-0 in LTR, right-0 in RTL
          via the dir attribute set synchronously in LanguageProvider */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden px-4 py-5 md:flex">
        <SidebarContent
          activeHref={activeHref}
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onLogout={handleLogout}
          onSwitchWorkspace={handleSwitchWorkspace}
          profile={profile}
          initials={initials}
          workspaces={workspaceList}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={language === "ar" ? "right" : "left"} showCloseButton={false} className="w-auto border-0 bg-transparent p-4 md:hidden">
            <SheetTitle className="sr-only">{language === "ar" ? "التنقل" : "Navigation"}</SheetTitle>
            <SidebarContent
              activeHref={activeHref}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
              onSwitchWorkspace={handleSwitchWorkspace}
              profile={profile}
              initials={initials}
              workspaces={workspaceList}
            />
        </SheetContent>
      </Sheet>

      {/* ps-* = padding-inline-start — also follows dir automatically */}
      <main className={`min-h-screen px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6 ${desktopOffset}`}>
        <div className="mb-4 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6E1FA] bg-white/70 text-[#5F30EB] shadow-sm cursor-pointer shrink-0"
            aria-label={language === "ar" ? "فتح القائمة" : "Open menu"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </Button>
          <BusinessSelector />
        </div>

        {children}
      </main>
    </div>
  );
}

export default function DashboardShell({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  return <TooltipProvider><DashboardShellInner activeHref={activeHref}>{children}</DashboardShellInner></TooltipProvider>;
}
