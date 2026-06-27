"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { useBusinessContext } from "@/lib/business-context";
import { useLanguage } from "@/lib/i18n/language-context";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
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
    href: "/dashboard/reviews",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "AI Reports",
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
  return (
    <nav className="mt-6 flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.title : undefined}
            className={`group relative flex items-center rounded-2xl px-3 py-3 text-sm transition-all ${
              collapsed ? "justify-center" : "gap-3"
            } ${
              isActive
                ? "bg-[#5F30EB] text-white shadow-[0_4px_16px_rgba(95,48,235,0.24)]"
                : "text-[#6B6487] hover:bg-[#F0EBFF] hover:text-[#5F30EB]"
            }`}
          >
            <span className={`${isActive ? "text-white" : "text-current"}`}>{item.icon}</span>
            {!collapsed && <span className="truncate font-medium">{item.title}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute start-full top-1/2 z-20 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#5F30EB] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.title}
              </span>
            )}
          </Link>
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.isActive) ?? workspaces[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!active) return null;

  const initial = active.name.charAt(0).toUpperCase();

  function roleLabel(role: string) {
    if (isArabic) return ROLE_AR[role] ?? role;
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  return (
    <div ref={ref} className={`relative ${collapsed ? "flex justify-center" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <div
          className={`absolute z-50 min-w-[220px] rounded-2xl border border-[#E6E1FA] bg-white shadow-[0_8px_24px_rgba(95,48,235,0.12)] overflow-hidden ${
            collapsed ? "start-full ms-3 top-0" : "top-full mt-2 start-0 end-0"
          }`}
        >
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9490A8]">
            {isArabic ? "مساحات العمل" : "Workspaces"}
          </p>
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => { onSwitch(w.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-start transition-colors hover:bg-[#F0EBFF] cursor-pointer border-t border-[#F4F2FC] ${
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
            </button>
          ))}
          <div className="border-t border-[#F4F2FC] p-2">
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5F30EB] transition-colors hover:bg-[#F0EBFF]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <path d="M3 3h7v7H3z" />
                <path d="M14 3h7v7h-7z" />
                <path d="M14 14h7v7h-7z" />
                <path d="M3 14h7v7H3z" />
              </svg>
              <span>Back to workspaces</span>
            </Link>
          </div>
        </div>
      )}
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
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Collapsed header: toggle on top, logo below */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 px-3 pt-4">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
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
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="rounded-xl border border-[#E6E1FA] px-3 py-2 text-xs font-medium text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
                >
                  Logout
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void onLogout()}
                title="Logout"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6E1FA] text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessSelector() {
  const { businesses, activeBusiness, setActiveBusiness } = useBusinessContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (businesses.length <= 1) return null;

  const label = activeBusiness ? activeBusiness.name : "All Profiles";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <div className="absolute top-full mt-2 start-0 z-50 min-w-[200px] rounded-2xl border border-[#E6E1FA] bg-white shadow-[0_8px_24px_rgba(95,48,235,0.12)] overflow-hidden">
          <button
            type="button"
            onClick={() => { setActiveBusiness(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-start transition-colors hover:bg-[#F0EBFF] cursor-pointer ${activeBusiness === null ? "bg-[#F0EBFF] font-semibold text-[#5F30EB]" : "text-[#040404]"}`}
          >
            <span className="h-2 w-2 rounded-full bg-[#5F30EB] shrink-0" />
            All Profiles
          </button>
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { setActiveBusiness(b); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-start transition-colors hover:bg-[#F0EBFF] cursor-pointer border-t border-[#F0EBFF] ${activeBusiness?.id === b.id ? "bg-[#F0EBFF] font-semibold text-[#5F30EB]" : "text-[#040404]"}`}
            >
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
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
  useLanguage(); // ensures LanguageProvider sets dir on <html> before first paint
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

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex justify-start md:hidden rtl:justify-end">
          <div className="absolute inset-0 bg-[#130F1D]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 p-4">
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
          </div>
        </div>
      )}

      {/* ps-* = padding-inline-start — also follows dir automatically */}
      <main className={`min-h-screen px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6 ${desktopOffset}`}>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6E1FA] bg-white/70 text-[#5F30EB] shadow-sm cursor-pointer shrink-0"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
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
  return <DashboardShellInner activeHref={activeHref}>{children}</DashboardShellInner>;
}
