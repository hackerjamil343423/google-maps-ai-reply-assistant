"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n/language-context";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard/overview",
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
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 21v-6" />
        <path d="M12 21V3" />
        <path d="M19 21V9" />
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
                ? "bg-[#ffffff14] text-white shadow-[0_10px_24px_rgba(95,48,235,0.24)]"
                : "text-[#B8B3D4] hover:bg-[#ffffff0d] hover:text-white"
            }`}
          >
            <span className={`${isActive ? "text-[#B79CFF]" : "text-current"}`}>{item.icon}</span>
            {!collapsed && <span className="truncate font-medium">{item.title}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#191821] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.title}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  activeHref,
  collapsed,
  onToggle,
  onLogout,
  onNavigate,
  profile,
  initials,
}: {
  activeHref: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
  profile: { name: string; email: string };
  initials: string;
}) {
  return (
    <div className={`flex h-full flex-col rounded-[28px] border border-[#2E2C3D] bg-[#1A1824] text-white shadow-[0_24px_80px_rgba(16,15,24,0.30)] transition-all ${collapsed ? "w-[88px]" : "w-[272px]"}`}>
      <div className={`flex items-center ${collapsed ? "justify-center px-3" : "justify-between px-4"} pt-4`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/wakkelni-logo.png" alt="Wakkelni" width={34} height={34} className="h-8 w-8 object-contain" />
            <div>
              <p className="text-sm font-semibold text-white">Wakkelni</p>
              <p className="text-[11px] text-[#9891B5]">Workspace</p>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffffff10]" onClick={onNavigate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/wakkelni-logo.png" alt="Wakkelni" width={28} height={28} className="h-7 w-7 object-contain" />
          </Link>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffffff12] bg-[#ffffff08] text-[#C8C2E7] transition-colors hover:bg-[#ffffff12] hover:text-white cursor-pointer ${collapsed ? "mt-4" : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[#ffffff08] px-3 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B94B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-sm text-[#9B94B8]">Navigate workspace</span>
          </div>
        </div>
      )}

      <div className={`brand-scrollbar flex-1 overflow-y-auto ${collapsed ? "px-3" : "px-4"}`}>
        <SidebarSection activeHref={activeHref} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className={`${collapsed ? "px-3 pb-3" : "px-4 pb-4"} mt-auto`}>
        <div className={`rounded-2xl border border-[#ffffff10] bg-[#ffffff08] ${collapsed ? "px-0 py-3" : "px-3 py-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0EBFF] text-xs font-semibold text-[#1A1824]">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{profile.name}</p>
                  <p className="truncate text-xs text-[#9B94B8]">{profile.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="rounded-xl border border-[#ffffff10] px-3 py-2 text-xs font-medium text-[#E9E5FF] hover:bg-[#ffffff10] cursor-pointer"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffffff10] text-[#E9E5FF] hover:bg-[#ffffff10] cursor-pointer"
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

export default function DashboardShell({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("dashboard_sidebar_collapsed") === "true";
  });
  const [profile, setProfile] = useState({
    name: "Account",
    email: "",
  });

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
        setProfile({
          name: fullName || "Account",
          email: data.email || "",
        });
      })
      .catch(() => {
        // Keep fallback profile values.
      });

    return () => {
      mounted = false;
    };
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

  const desktopOffset = collapsed ? "md:pl-[120px]" : "md:pl-[304px]";
  const desktopOffsetRtl = collapsed ? "md:pr-[120px]" : "md:pr-[304px]";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(95,48,235,0.10),_transparent_28%),linear-gradient(180deg,_#F8F7FF_0%,_#F2EEFF_100%)] text-[#040404]">
      <aside
        className={`fixed inset-y-0 z-30 hidden px-4 py-5 md:flex ${isRtl ? "right-0" : "left-0"}`}
      >
        <SidebarContent
          activeHref={activeHref}
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onLogout={handleLogout}
          profile={profile}
          initials={initials}
        />
      </aside>

      {mobileOpen && (
        <div className={`fixed inset-0 z-40 flex md:hidden ${isRtl ? "justify-end" : "justify-start"}`}>
          <div className="absolute inset-0 bg-[#130F1D]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 p-4">
            <SidebarContent
              activeHref={activeHref}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
              profile={profile}
              initials={initials}
            />
          </div>
        </div>
      )}

      <main className={`min-h-screen px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6 ${isRtl ? desktopOffsetRtl : desktopOffset}`}>
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6E1FA] bg-white/70 text-[#5F30EB] shadow-sm md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8F82BF]">Dashboard</p>
              <p className="text-sm text-[#6B6487]">Manage reviews, settings, and business activity.</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/profile" className="rounded-2xl border border-[#E6E1FA] bg-white/70 px-4 py-2.5 text-sm font-medium text-[#4F4A67] hover:border-[#5F30EB]/25 hover:text-[#5F30EB]">
              Profile
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
