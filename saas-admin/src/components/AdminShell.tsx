"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { adminAuthClient } from "@/lib/auth/admin-auth-client";

type Section = "general" | "blog";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const MENU_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    title: "Users",
    href: "/users",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Workspaces",
    href: "/workspaces",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    title: "Businesses",
    href: "/businesses",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Reviews",
    href: "/reviews",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "Invitations",
    href: "/invitations",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
];

const SYSTEM_ITEMS: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
  },
];

const BLOG_ITEMS: NavItem[] = [
  {
    title: "Articles",
    href: "/blog/articles",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
  },
  {
    title: "New Article",
    href: "/blog/articles/new",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "Categories",
    href: "/blog/categories",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M7 7h.01" />
      </svg>
    ),
  },
  {
    title: "Tags",
    href: "/blog/tags",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M7 7h.01" />
      </svg>
    ),
  },
  {
    title: "SEO Settings",
    href: "/blog/seo",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "Blog Settings",
    href: "/blog/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

function getActiveSection(pathname: string): Section {
  if (pathname.startsWith("/blog")) return "blog";
  return "general";
}

function SectionSwitcher({
  active,
  onChange,
  collapsed,
}: {
  active: Section;
  onChange: (s: Section) => void;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onChange("general")}
          title="General Management"
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            active === "general"
              ? "bg-[#5F30EB] text-white"
              : "bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA]"
          }`}
        >
          GM
        </button>
        <button
          type="button"
          onClick={() => onChange("blog")}
          title="Blog"
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            active === "blog"
              ? "bg-[#5F30EB] text-white"
              : "bg-[#F0EBFF] text-[#5F30EB] hover:bg-[#E6E1FA]"
          }`}
        >
          B
        </button>
      </div>
    );
  }

  return (
    <div className="flex rounded-xl bg-[#F0EBFF] p-1">
      <button
        type="button"
        onClick={() => onChange("general")}
        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
          active === "general"
            ? "bg-[#5F30EB] text-white shadow-sm"
            : "text-[#6B6487] hover:text-[#5F30EB]"
        }`}
      >
        General
      </button>
      <button
        type="button"
        onClick={() => onChange("blog")}
        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
          active === "blog"
            ? "bg-[#5F30EB] text-white shadow-sm"
            : "text-[#6B6487] hover:text-[#5F30EB]"
        }`}
      >
        Blog
      </button>
    </div>
  );
}

function NavSection({
  items,
  label,
  activeHref,
  collapsed,
}: {
  items: NavItem[];
  label: string;
  activeHref: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#9490A8]">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-1.5">
        {items.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={`group relative flex items-center rounded-2xl px-3 py-2.5 text-sm transition-all ${
                collapsed ? "justify-center" : "gap-3"
              } ${
                isActive
                  ? "bg-[#5F30EB] text-white shadow-[0_4px_16px_rgba(95,48,235,0.24)]"
                  : "text-[#6B6487] hover:bg-[#F0EBFF] hover:text-[#5F30EB]"
              }`}
            >
              <span className={isActive ? "text-white" : "text-current"}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="truncate font-medium">{item.title}</span>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute start-full top-1/2 z-20 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#5F30EB] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState({ name: "Admin", email: "" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [section, setSection] = useState<Section>("general");

  useEffect(() => {
    const stored = localStorage.getItem("admin_sidebar_collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    setSection(getActiveSection(pathname));
  }, [pathname]);

  useEffect(() => {
    void adminAuthClient.getSession().then((res) => {
      if (res.data?.user) {
        setProfile({ name: res.data.user.name ?? "Admin", email: res.data.user.email });
      }
    }).catch(() => {});
  }, []);

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [profile.name]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  }

  function handleSectionChange(s: Section) {
    setSection(s);
    if (s === "blog") {
      router.push("/blog/articles");
    } else {
      router.push("/");
    }
  }

  async function handleLogout() {
    await adminAuthClient.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  const desktopOffset = collapsed ? "md:ps-[120px]" : "md:ps-[304px]";

  const sidebarContent = (
    <div
      className={`flex h-full flex-col rounded-[28px] border border-[#E6E1FA] bg-white text-[#040404] shadow-[0_4px_24px_rgba(95,48,235,0.08)] transition-all ${
        collapsed ? "w-[88px]" : "w-[272px]"
      }`}
    >
      {!collapsed ? (
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5F30EB] text-white text-sm font-bold">
              SA
            </div>
            <p className="text-sm font-semibold text-[#040404]">SaaS Admin</p>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-3 pt-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E1FA] bg-white text-[#5F30EB] transition-colors hover:bg-[#F0EBFF] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5F30EB] text-white text-xs font-bold">
            SA
          </div>
        </div>
      )}

      {/* Section Switcher */}
      <div className={collapsed ? "px-2 pt-2" : "px-4 pt-3"}>
        <SectionSwitcher active={section} onChange={handleSectionChange} collapsed={collapsed} />
      </div>

      <div className={`no-scrollbar flex-1 overflow-y-auto ${collapsed ? "px-3" : "px-4"}`}>
        {section === "general" ? (
          <>
            <div className="mt-4">
              <NavSection items={MENU_ITEMS} label="Menu" activeHref={pathname} collapsed={collapsed} />
            </div>
            <div className="mt-6">
              <NavSection items={SYSTEM_ITEMS} label="System" activeHref={pathname} collapsed={collapsed} />
            </div>
          </>
        ) : (
          <div className="mt-4">
            <NavSection items={BLOG_ITEMS} label="Blog" activeHref={pathname} collapsed={collapsed} />
          </div>
        )}
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
                  <p className="truncate text-xs text-[#9490A8]">Admin</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
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
                onClick={() => void handleLogout()}
                title="Logout"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6E1FA] text-[#5F30EB] hover:bg-[#F0EBFF] cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(95,48,235,0.10),_transparent_28%),linear-gradient(180deg,_#F8F7FF_0%,_#F2EEFF_100%)] text-[#040404]">
      <aside className="fixed inset-y-0 start-0 z-30 hidden px-4 py-5 md:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex justify-start md:hidden">
          <div className="absolute inset-0 bg-[#130F1D]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 p-4">{sidebarContent}</div>
        </div>
      )}

      <main className={`min-h-screen px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6 ${desktopOffset}`}>
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6E1FA] bg-white/70 text-[#5F30EB] shadow-sm cursor-pointer shrink-0"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
