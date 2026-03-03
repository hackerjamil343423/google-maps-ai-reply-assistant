"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n/language-context";

/* ─── Nav items ─────────────────────────────────────────── */
export const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard/overview",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    title: "Reviews",
    href: "/dashboard/reviews",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 21v-6" />
        <path d="M12 21V3" />
        <path d="M19 21V9" />
      </svg>
    ),
  },
  {
    title: "Team",
    href: "/dashboard/team",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <path d="M16 3.128a4 4 0 0 1 0 7.744" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: "Subscription",
    href: "/dashboard/subscription",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    title: "Get More Reviews",
    href: "/dashboard/get-more-reviews",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "API",
    href: "/dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5V19A9 3 0 0 0 21 19V5" />
        <path d="M3 12A9 3 0 0 0 21 12" />
      </svg>
    ),
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

/* ─── Sidebar inner ──────────────────────────────────────── */
function SidebarInner({
  activeHref,
  onClose,
  onLogout,
  profile,
  initials,
}: {
  activeHref: string;
  onClose?: () => void;
  onLogout: () => Promise<void>;
  profile: { name: string; email: string };
  initials: string;
}) {
  return (
    <div className="flex flex-col h-full bg-[#F6F4FF33] border border-[#5F30EB]/20 shadow-[0_-4px_100px_21px_#efefef14_inset] py-4 rounded-3xl overflow-hidden">
      <div className="brand-scrollbar flex flex-col flex-1 overflow-y-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 shrink-0 mt-1 mb-2"
          onClick={onClose}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Wakkelni Stars"
            src="/assets/brand/wakkelni-logo.png"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
          />
        </Link>

        <nav className="flex flex-col items-stretch w-full px-2 space-y-1 mt-4 mb-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link key={item.title} href={item.href} title={item.title} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-[#5F30EB20] text-[#5F30EB] shadow-[0_0_10px_#5F30EB40]"
                    : "text-[#646478] hover:text-[#5F30EB] hover:bg-[#5F30EB10]"
                }`}>
                <span className="shrink-0">{item.icon}</span>
                <span className="text-xs font-medium leading-tight">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profile at bottom — hover reveals logout */}
      <div className="px-2 pt-3 mt-auto border-t border-[#5F30EB]/12 shrink-0">
        <div className="group relative">
          {/* Logout popup — appears above on hover */}
          <button
            onClick={onLogout}
            className="absolute bottom-full left-0 right-0 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#FF4E4E]/20 text-[#FF4E4E] text-xs font-medium shadow-md
              opacity-0 pointer-events-none translate-y-1
              group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0
              transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
            Logout
          </button>

          {/* Profile row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default hover:bg-[#5F30EB08] transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#E6E9F8] text-[#040404] text-xs font-semibold border border-[#5F30EB]/20 select-none shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#040404] truncate">{profile.name}</p>
              <p className="text-[10px] text-[#8A8AA0] truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shell (sidebar + header + slot for content) ─────────── */
export default function DashboardShell({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "Account",
    email: "",
  });
  const isRtl = language === "ar";

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

  async function handleLogout() {
    await authClient.signOut();
    setMobileOpen(false);
    router.push("/GetStarted?mode=login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F6F4FF] text-[#040404]">
      {/* Desktop sidebar */}
      <aside
        className={`fixed top-1/2 -translate-y-1/2 h-[88vh] max-h-[860px] w-[200px] px-4 hidden md:block z-10 ${
          isRtl ? "right-0" : "left-0"
        }`}
      >
        <SidebarInner activeHref={activeHref} onLogout={handleLogout} profile={profile} initials={initials} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className={`fixed inset-0 z-40 flex md:hidden ${
            isRtl ? "justify-end" : "justify-start"
          }`}
        >
          <div className="absolute inset-0 bg-[#F8F9FF]/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[200px] h-full px-3 pt-4 pb-3 z-50">
            <SidebarInner
              activeHref={activeHref}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
              profile={profile}
              initials={initials}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <main
        className={`ml-0 w-full px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8 min-h-screen md:h-screen overflow-hidden ${
          isRtl ? "md:pr-[200px]" : "md:pl-[200px]"
        }`}
      >
        {/* Top header — mobile hamburger only */}
        <header className="flex justify-start items-center w-full mb-4 md:mb-5 md:hidden">
          <button className="p-2 rounded-lg hover:bg-[#5F30EB10] transition-colors cursor-pointer"
            aria-label="Toggle menu" onClick={() => setMobileOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}


