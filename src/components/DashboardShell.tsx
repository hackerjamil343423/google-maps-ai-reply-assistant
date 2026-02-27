"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

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
}: {
  activeHref: string;
  onClose?: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col h-full bg-[#0B090A33] border border-[#ffffff]/20 shadow-[0_-4px_100px_21px_#efefef14_inset] py-6 rounded-3xl overflow-hidden">
      <div className="flex flex-col items-center flex-1 overflow-y-auto">
        <Link href="/" className="w-10 h-10 flex items-center justify-center shrink-0" onClick={onClose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Five Star Reply" src="/assets/brand/logo-icon.svg"
            width={40} height={40} className="w-10 h-10 object-contain" />
        </Link>

        <nav className="flex flex-col items-center space-y-4 mt-8 mb-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link key={item.title} href={item.href} title={item.title} onClick={onClose}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-[#00FFE920] text-[#00FFE9] shadow-[0_0_10px_#00FFE940]"
                    : "text-[#B0B0B0] hover:text-[#00FFE9] hover:bg-[#00FFE910]"
                }`}>
                {item.icon}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center pt-4 mt-auto border-t border-white/10 shrink-0">
        <button
          title="Logout"
          onClick={onLogout}
          className="p-3 rounded-xl transition-all duration-300 cursor-pointer text-[#B0B0B0] hover:text-[#FF4E4E] hover:bg-[#FF4E4E20]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          </svg>
        </button>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  async function handleLogout() {
    await authClient.signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/GetStarted?mode=login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0B090A] text-white">
      {/* Desktop sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[150px] px-6 pt-6 hidden md:block z-10">
        <SidebarInner activeHref={activeHref} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[150px] h-full px-3 pt-6 pb-4 z-50">
            <SidebarInner
              activeHref={activeHref}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="ml-0 md:pl-[150px] w-full p-4 md:p-8 lg:py-10 min-h-screen md:h-screen overflow-hidden">
        {/* Top header */}
        <header className="flex justify-between items-center w-full mb-10">
          <div className="w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Five Star Reply Logo" className="w-full h-auto"
              src="/assets/brand/logo-02.svg" />
          </div>
          <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 rounded-lg hover:bg-[#00FFE910] transition-colors cursor-pointer"
              aria-label="Toggle menu" onClick={() => setMobileOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />
              </svg>
            </button>

            <div className="relative">
              <button className="flex items-center cursor-pointer" aria-label="Toggle profile"
                onClick={() => setProfileOpen(!profileOpen)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2A2A2A] text-white font-semibold border border-[#00FFE9]/20 select-none">
                  {initials}
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-xl border border-[#ffffff22] py-2 z-50"
                  style={{ background: "#141414" }}>
                  <div className="px-4 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-medium text-white">{profile.name}</p>
                    <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                  </div>
                  <Link href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-[#00FFE9] hover:bg-[#00FFE910] transition-colors"
                    onClick={() => setProfileOpen(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M20 21a8 8 0 1 0-16 0" />
                    </svg>
                    Profile
                  </Link>
                  <Link href="/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-[#00FFE9] hover:bg-[#00FFE910] transition-colors"
                    onClick={() => setProfileOpen(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#FF4E4E] hover:bg-[#FF4E4E10] transition-colors cursor-pointer"
                    onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}

