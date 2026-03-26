"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useLanguage } from "@/lib/i18n/language-context";

const inputCls =
  "w-full rounded-2xl border border-[#E6E9F8] bg-white px-4 py-3 text-sm text-[#4F4F63] outline-none transition-all focus:border-[#5F30EB]/35 focus:ring-2 focus:ring-[#5F30EB]/12";

const labelCls = "block text-sm text-[#6A6A82] mb-1.5";

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#3E3E52] cursor-pointer transition-colors"
      aria-label={show ? "Hide password" : "Show password"}>
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <path d="m2 2 20 20" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function SaveFeedback({ saved, label = "Saved successfully" }: { saved: boolean; label?: string }) {
  if (!saved) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-600 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {label}
    </div>
  );
}

export default function ProfilePage() {
  const { language, setLanguage, ready: languageReady } = useLanguage();
  /* ── Profile fields ── */
  const [firstName, setFirstName]   = useState("");
  const [lastName,  setLastName]    = useState("");
  const [email,     setEmail]       = useState("");
  const [phone,     setPhone]       = useState("");
  const [company,   setCompany]     = useState("");
  const [website,   setWebsite]     = useState("");
  const [bio,       setBio]         = useState("");

  /* ── Password fields ── */
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── UI state ── */
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [savedProfile,   setSavedProfile]   = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError,   setProfileError]   = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword,  setSavedPassword]  = useState(false);
  const [pwError,        setPwError]        = useState("");

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "A";

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        if (!active) return;
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setCompany(data.company || "");
        setWebsite(data.website || "");
        setBio(data.bio || "");
      } catch {
        if (active) setProfileError("Failed to load profile.");
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setSavedProfile(false);
    setProfileError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          company,
          website,
          bio,
        }),
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
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    setSavedPassword(false);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update password.");
      }

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
    <DashboardShell activeHref="/profile">
      <div>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F30EB]">Account</p>
          <h2 className="text-2xl font-semibold text-[#040404] mt-1">Profile</h2>
        </div>

          {loadingProfile && (
            <div className="mb-5 text-sm text-[#6B6487]">Loading profile…</div>
          )}

          {profileError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {profileError}
            </div>
          )}

          <div className="max-w-2xl space-y-10">

            {/* ── Avatar section ── */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 bg-[#5F30EB]">
                {initials}
              </div>
              <div>
                <p className="text-[#040404] font-medium">{firstName} {lastName}</p>
                <p className="text-[#6B6487] text-sm">{email}</p>
              </div>
            </div>

            {/* ── Profile form ── */}
            <section>
              <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                Personal Information
              </h3>
              <form onSubmit={handleProfileSave} className="space-y-5">
                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <input type="text" required className={inputCls}                      value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input type="text" required className={inputCls}                      value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input type="email" required className={inputCls}                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                {/* Phone */}
                <div>
                  <label className={labelCls}>Phone Number <span className="text-gray-600">(optional)</span></label>
                  <input type="tel" className={inputCls}                    placeholder="+1 (555) 000-0000"
                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                {/* Company + Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Company <span className="text-gray-600">(optional)</span></label>
                    <input type="text" className={inputCls}                      placeholder="Your business name"
                      value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Website <span className="text-gray-600">(optional)</span></label>
                    <input type="url" className={inputCls}                      placeholder="https://yourbusiness.com"
                      value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className={labelCls}>Bio <span className="text-gray-600">(optional)</span></label>
                  <textarea rows={3} className={inputCls}                    placeholder="A short description about yourself or your business…"
                    value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>

                {/* Save */}
                <div className="flex items-center gap-4 pt-1">
                  <button type="submit" disabled={savingProfile}
                    className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2">
                    {savingProfile ? (
                      <>
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Saving…
                      </>
                    ) : "Save Profile"}
                  </button>
                  <SaveFeedback saved={savedProfile} label="Profile updated" />
                </div>
              </form>
            </section>

            {/* Language section */}
            <section>
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
                    <option value="en" className="bg-[#F6F4FF] text-[#4F4F63]">
                      English
                    </option>
                    <option value="ar" className="bg-[#F6F4FF] text-[#4F4F63]">
                      Arabic
                    </option>
                  </select>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5F30EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-300"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <p className="text-xs text-[#6B6487] mt-2">
                  Current language:{" "}
                  <span className="font-medium text-[#040404]">
                    {language === "ar" ? "Arabic" : "English"}
                  </span>
                </p>
              </div>
            </section>
            {/* Password section */}
            <section>
              <h3 className="text-base font-medium text-[#040404] mb-5 pb-3 border-b border-[#E6E1FA]">
                Change Password
              </h3>
              <form onSubmit={handlePasswordSave} className="space-y-5">
                {/* Current password */}
                <div>
                  <label className={labelCls}>Current Password</label>
                  <div className="relative">
                    <input type={showCurrent ? "text" : "password"} required
                      className={`${inputCls} pr-11`}                      placeholder="Enter current password"
                      value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                    <EyeToggle show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className={labelCls}>New Password</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} required
                      className={`${inputCls} pr-11`}                      placeholder="Min. 8 characters"
                      value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                    <EyeToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
                  </div>
                  {/* Strength bar */}
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
                            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength ? color : "#E6E9F8" }} />
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#8A8AA0]">
                        {newPw.length < 8 ? "Too short" : newPw.length < 10 ? "Weak" : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && newPw.length >= 12 ? "Strong" : "Good"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} required
                      className={`${inputCls} pr-11`}                      placeholder="Re-enter new password"
                      value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                    <EyeToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                  </div>
                  {/* Match indicator */}
                  {confirmPw.length > 0 && (
                    <p className={`text-xs mt-1.5 ${newPw === confirmPw ? "text-green-400" : "text-red-400"}`}>
                      {newPw === confirmPw ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Error */}
                {pwError && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {pwError}
                  </div>
                )}

                {/* Save */}
                <div className="flex items-center gap-4 pt-1">
                  <button type="submit" disabled={savingPassword}
                    className="px-6 py-3 rounded-full font-semibold text-white bg-[#5F30EB] transition-all cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2">
                    {savingPassword ? (
                      <>
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Updating…
                      </>
                    ) : "Update Password"}
                  </button>
                  <SaveFeedback saved={savedPassword} label="Password updated" />
                </div>
              </form>
            </section>

            {/* ── Danger zone ── */}
            <section>
              <h3 className="text-base font-medium text-red-500 mb-5 pb-3 border-b border-red-100">
                Danger Zone
              </h3>
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-red-100 bg-red-50">
                <div>
                  <p className="text-sm font-medium text-[#040404]">Delete Account</p>
                  <p className="text-xs text-[#6B6487] mt-0.5">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            </section>

          </div>
      </div>
    </DashboardShell>
  );
}

