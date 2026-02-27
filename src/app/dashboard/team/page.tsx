"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";

type Role = "VIEWER" | "EDITOR" | "MANAGER";
type MemberStatus = "active" | "pending";

interface TeamMember {
  id: number;
  email: string;
  role: Role;
  business: string;
  status: MemberStatus;
  joinedAt: string;
  initials: string;
  avatarColor: string;
}

const ROLE_LABELS: Record<Role, string> = {
  VIEWER:  "Viewer",
  EDITOR:  "Editor",
  MANAGER: "Manager",
};

const ROLE_COLORS: Record<Role, string> = {
  VIEWER:  "text-gray-400 bg-gray-500/10 border-gray-500/20",
  EDITOR:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  MANAGER: "text-[#00FFE9] bg-[#00FFE9]/10 border-[#00FFE9]/20",
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  active:  "text-green-400 bg-green-500/10 border-green-500/20",
  pending: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 1,
    email: "sarah@acmecafe.com",
    role: "MANAGER",
    business: "Acme Café",
    status: "active",
    joinedAt: "Jan 10, 2025",
    initials: "SA",
    avatarColor: "#7C3AED",
  },
  {
    id: 2,
    email: "james@acmecafe.com",
    role: "EDITOR",
    business: "Acme Café",
    status: "active",
    joinedAt: "Feb 1, 2025",
    initials: "JA",
    avatarColor: "#0284C7",
  },
  {
    id: 3,
    email: "nina@downtown.biz",
    role: "VIEWER",
    business: "Downtown Bistro",
    status: "pending",
    joinedAt: "—",
    initials: "NI",
    avatarColor: "#059669",
  },
];

const inputCls =
  "w-full px-3 py-2 rounded-md text-[#C3C3C3] focus:outline-none focus:ring-2 focus:ring-[#00FFE9] focus:border-transparent transition-all";
const inputStyle = { background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.15)" };

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !business) { setError("Please fill in all fields."); return; }
    setError(""); setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    const initials = email.slice(0, 2).toUpperCase();
    const colors = ["#7C3AED","#0284C7","#059669","#D97706","#DC2626","#0891B2"];
    const newMember: TeamMember = {
      id: Date.now(),
      email,
      role,
      business,
      status: "pending",
      joinedAt: "—",
      initials,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };
    setMembers((prev) => [...prev, newMember]);
    setSuccess(`Invitation sent to ${email}`);
    setEmail(""); setBusiness(""); setRole("EDITOR");
    setSubmitting(false);
    setTimeout(() => setSuccess(""), 4000);
  }

  async function handleRemove(id: number) {
    setRemovingId(id);
    await new Promise((r) => setTimeout(r, 600));
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setRemovingId(null);
  }

  function handleRoleChange(id: number, newRole: Role) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m));
  }

  return (
    <DashboardShell activeHref="/dashboard/team">
      <div className="h-full">
        <div className="p-2 md:p-4 max-w-5xl mx-auto min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#C3C3C3] mb-2">Team Management</h1>
            <p className="text-[#B0B0B0]">Invite and manage team members for your businesses</p>
          </div>

          {/* ── Invite form ── */}
          <div className="rounded-xl border border-[#ffffff]/20 p-6 mb-8"
            style={{ background: "rgba(11,9,10,0.2)" }}>
            <h2 className="text-xl font-semibold text-[#C3C3C3] mb-4">Invite Team Member</h2>

            {success && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#B0B0B0] mb-1">Email Address</label>
                  <input
                    required type="email" placeholder="team@example.com"
                    className={inputCls} style={inputStyle}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {/* Business */}
                <div>
                  <label className="block text-sm font-medium text-[#B0B0B0] mb-1">Business</label>
                  <div className="relative">
                    <select
                      required className={`${inputCls} appearance-none cursor-pointer pr-8`} style={inputStyle}
                      value={business} onChange={(e) => setBusiness(e.target.value)}>
                      <option value="" className="bg-[#1a1a1a]">Select Business</option>
                      <option value="Acme Café" className="bg-[#1a1a1a]">Acme Café</option>
                      <option value="Downtown Bistro" className="bg-[#1a1a1a]">Downtown Bistro</option>
                      <option value="The Corner Bakery" className="bg-[#1a1a1a]">The Corner Bakery</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-[#B0B0B0] mb-1">Role</label>
                  <div className="relative">
                    <select
                      required className={`${inputCls} appearance-none cursor-pointer pr-8`} style={inputStyle}
                      value={role} onChange={(e) => setRole(e.target.value as Role)}>
                      <option value="VIEWER"  className="bg-[#1a1a1a]">Viewer — Can view reviews</option>
                      <option value="EDITOR"  className="bg-[#1a1a1a]">Editor — Can view and reply to reviews</option>
                      <option value="MANAGER" className="bg-[#1a1a1a]">Manager — Full team management access</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="px-6 py-2 rounded-md font-medium text-[#0B090A] hover:opacity-80 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                style={{ background: "#00FFE9" }}>
                {submitting ? (
                  <>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" />
                    </svg>
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Members list ── */}
          <div className="rounded-xl border border-[#ffffff]/20 overflow-hidden"
            style={{ background: "rgba(11,9,10,0.2)" }}>
            <div className="p-6 border-b border-[#ffffff]/20 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#C3C3C3]">Team Members</h2>
              <span className="text-xs text-gray-500 bg-[#1f1f1f] border border-[#ffffff10] px-2.5 py-1 rounded-full">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-[#ffffff]/10">
              {members.length === 0 ? (
                <div className="p-10 text-center text-[#B0B0B0]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-gray-600 mx-auto mb-3" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  No team members yet. Invite someone to get started!
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id}
                    className={`p-4 md:p-5 flex flex-wrap md:flex-nowrap items-center gap-4 transition-opacity ${
                      removingId === member.id ? "opacity-40" : "opacity-100"
                    }`}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: member.avatarColor }}>
                      {member.initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#C3C3C3] font-medium text-sm truncate">{member.email}</p>
                      <p className="text-gray-500 text-xs truncate">{member.business} · Joined {member.joinedAt}</p>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLORS[member.status]}`}>
                      {member.status === "active" ? "Active" : "Pending"}
                    </span>

                    {/* Role selector */}
                    <div className="relative flex-shrink-0">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border appearance-none cursor-pointer pr-6 ${ROLE_COLORS[member.role]}`}
                        style={{ background: "transparent" }}>
                        <option value="VIEWER"  className="bg-[#1a1a1a] text-gray-300">Viewer</option>
                        <option value="EDITOR"  className="bg-[#1a1a1a] text-gray-300">Editor</option>
                        <option value="MANAGER" className="bg-[#1a1a1a] text-gray-300">Manager</option>
                      </select>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                      title="Remove member"
                      className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
