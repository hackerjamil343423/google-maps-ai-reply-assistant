"use client";

import { useEffect, useState } from "react";

import DashboardShell from "@/components/DashboardShell";

type Role = "VIEWER" | "EDITOR" | "MANAGER";
type MemberStatus = "active" | "pending";
type MemberKind = "active" | "invitation";

interface TeamMember {
  id: string;
  kind: MemberKind;
  email: string;
  role: Role;
  business: string;
  status: MemberStatus;
  joinedAt: string;
  canEditRole: boolean;
  canRemove: boolean;
}

const ROLE_COLORS: Record<Role, string> = {
  VIEWER: "text-[#6A6A82] bg-gray-500/10 border-gray-500/20",
  EDITOR: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  MANAGER: "text-[#5F30EB] bg-[#5F30EB]/10 border-[#5F30EB]/20",
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  active: "text-green-400 bg-green-500/10 border-green-500/20",
  pending: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const inputCls =
  "w-full px-3 py-2 rounded-md text-[#4E4E5E] focus:outline-none focus:ring-2 focus:ring-[#5F30EB] focus:border-transparent transition-all";
const inputStyle = {
  background: "#EEF2FF",
  border: "1px solid rgba(255,255,255,0.15)",
};

const AVATAR_COLORS = [
  "#7C3AED",
  "#0284C7",
  "#059669",
  "#D97706",
  "#DC2626",
  "#0891B2",
];

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(email: string) {
  const local = email.split("@")[0] || email;
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function loadMembers() {
    setLoadingMembers(true);
    setError("");
    try {
      const res = await fetch("/api/team/members", { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to load team members.");
      }
      const data = await res.json();
      const nextBusinesses = Array.isArray(data.businesses) ? data.businesses : [];
      const firstBusiness = nextBusinesses[0] ?? "Primary Workspace";

      setMembers(Array.isArray(data.members) ? data.members : []);
      setBusinesses(nextBusinesses.length ? nextBusinesses : [firstBusiness]);
      setBusiness((prev) => prev || firstBusiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members.");
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !business) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, business, role }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to send invitation.");
      }
      setSuccess(
        payload?.status === "active"
          ? `${email} added to workspace.`
          : `Invitation sent to ${email}.`
      );
      setEmail("");
      setRole("EDITOR");
      setTimeout(() => setSuccess(""), 4000);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!member.canRemove) return;
    setRemovingId(member.id);
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          kind: member.kind,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to remove member.");
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRoleChange(member: TeamMember, newRole: Role) {
    if (!member.canEditRole) return;
    try {
      const res = await fetch("/api/team/members/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          kind: member.kind,
          role: newRole,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update role.");
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  return (
    <DashboardShell activeHref="/dashboard/team">
      <div className="brand-scrollbar min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#4E4E5E] mb-2">Team Management</h1>
            <p className="text-[#646478]">Invite and manage team members for your businesses</p>
          </div>

          <div
            className="rounded-xl border border-[#5F30EB]/20 p-6 mb-8"
            style={{ background: "rgba(255,255,255,0.82)" }}
          >
            <h2 className="text-xl font-semibold text-[#4E4E5E] mb-4">Invite Team Member</h2>

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
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#646478] mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="team@example.com"
                    className={inputCls}
                    style={inputStyle}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#646478] mb-1">Business</label>
                  <div className="relative">
                    <select
                      required
                      className={`${inputCls} appearance-none cursor-pointer pr-8`}
                      style={inputStyle}
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                    >
                      {businesses.map((item) => (
                        <option key={item} value={item} className="bg-[#EEF2FF]">
                          {item}
                        </option>
                      ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#646478] mb-1">Role</label>
                  <div className="relative">
                    <select
                      required
                      className={`${inputCls} appearance-none cursor-pointer pr-8`}
                      style={inputStyle}
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                    >
                      <option value="VIEWER" className="bg-[#EEF2FF]">Viewer - Can view reviews</option>
                      <option value="EDITOR" className="bg-[#EEF2FF]">Editor - Can view and reply to reviews</option>
                      <option value="MANAGER" className="bg-[#EEF2FF]">Manager - Full team management access</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-md font-medium text-[#F6F4FF] hover:opacity-80 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                style={{ background: "#5F30EB" }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Sending...</>
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

          <div className="rounded-xl border border-[#5F30EB]/20 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.82)" }}>
            <div className="p-6 border-b border-[#5F30EB]/20 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#4E4E5E]">Team Members</h2>
              <span className="text-xs text-[#8A8AA0] bg-[#E6E9F8] border border-[#5F30EB20] px-2.5 py-1 rounded-full">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-[#5F30EB]/10">
              {loadingMembers ? (
                <div className="p-10 text-center text-[#646478]">Loading team members...</div>
              ) : members.length === 0 ? (
                <div className="p-10 text-center text-[#646478]">
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
                  <div
                    key={`${member.kind}:${member.id}`}
                    className={`p-4 md:p-5 flex flex-wrap md:flex-nowrap items-center gap-4 transition-opacity ${
                      removingId === member.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#040404] text-sm font-semibold flex-shrink-0"
                      style={{ background: getAvatarColor(member.email) }}>
                      {getInitials(member.email)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[#4E4E5E] font-medium text-sm truncate">{member.email}</p>
                      <p className="text-[#8A8AA0] text-xs truncate">
                        {member.business} - Joined {member.joinedAt}
                      </p>
                    </div>

                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLORS[member.status]}`}>
                      {member.status === "active" ? "Active" : "Pending"}
                    </span>

                    <div className="relative flex-shrink-0">
                      <select
                        value={member.role}
                        disabled={!member.canEditRole}
                        onChange={(e) => handleRoleChange(member, e.target.value as Role)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border appearance-none cursor-pointer pr-6 disabled:opacity-50 disabled:cursor-not-allowed ${ROLE_COLORS[member.role]}`}
                        style={{ background: "transparent" }}
                      >
                        <option value="VIEWER" className="bg-[#EEF2FF] text-[#4F4F63]">Viewer</option>
                        <option value="EDITOR" className="bg-[#EEF2FF] text-[#4F4F63]">Editor</option>
                        <option value="MANAGER" className="bg-[#EEF2FF] text-[#4F4F63]">Manager</option>
                      </select>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>

                    <button
                      onClick={() => handleRemove(member)}
                      disabled={removingId === member.id || !member.canRemove}
                      title="Remove member"
                      className="flex-shrink-0 p-2 rounded-lg text-[#8A8AA0] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
    </DashboardShell>
  );
}

