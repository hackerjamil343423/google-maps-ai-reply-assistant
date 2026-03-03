"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { DEFAULT_AI_PROMPT, TONE_OPTIONS } from "@/lib/ai/default-settings";

type PostType = "auto" | "review";

export default function SettingsPage() {
  const [prompt, setPrompt]         = useState(DEFAULT_AI_PROMPT);
  const [tone, setTone]             = useState("Professional");
  const [postType, setPostType]     = useState<PostType>("auto");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");
  const [charCount, setCharCount]   = useState(DEFAULT_AI_PROMPT.length);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await res.json();
        if (!active) return;
        const nextPrompt = data.prompt || DEFAULT_AI_PROMPT;
        setPrompt(nextPrompt);
        setTone(data.tone || "Professional");
        setPostType(data.postType === "review" ? "review" : "auto");
        setCharCount(nextPrompt.length);
      } catch {
        if (active) setError("Failed to load settings.");
      } finally {
        if (active) setLoadingInitial(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  function handlePromptChange(v: string) {
    setPrompt(v);
    setCharCount(v.length);
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          tone,
          postType,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save settings.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  const postLabel = postType === "auto"
    ? "Auto Post (no approval needed)"
    : "Review before publish";

  return (
    <DashboardShell activeHref="/dashboard/settings">
      <div className="h-full">
        <div
          className="brand-scrollbar rounded-3xl border border-[#E6E9F8] p-6 md:p-10 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(255,255,255,0.82)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          <h2 className="text-xl md:text-2xl font-medium mb-6">Settings</h2>

          {loadingInitial && (
            <div className="mb-5 text-sm text-[#6A6A82]">Loading settings…</div>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8 max-w-3xl">

            {/* ── AI Prompt ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-[#6A6A82]">
                  AI-generated response
                </label>
                <span className="text-xs text-gray-600">{charCount} chars</span>
              </div>
              <textarea
                rows={12}
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Enter the instruction for AI to write reviews"
                className="w-full px-4 py-3 rounded-lg text-[#4F4F63] focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 resize-vertical text-sm leading-relaxed transition-all"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "inset 0px -4.65px 116.24px 24.41px #EFEFEF14",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#5F30EB #E6E9F8",
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { handlePromptChange(DEFAULT_AI_PROMPT); }}
                  className="text-xs text-[#8A8AA0] hover:text-[#5F30EB] transition-colors cursor-pointer underline-offset-2 hover:underline"
                >
                  Reset to default
                </button>
              </div>
            </div>

            {/* ── Tone Style ── */}
            <div>
              <label className="block text-sm text-[#6A6A82] mb-2">
                Set AI Tone Style
              </label>
              <div className="relative max-w-sm">
                <select
                  value={tone}
                  onChange={(e) => { setTone(e.target.value); setSaved(false); }}
                  className="w-full px-4 py-3 pr-10 rounded-lg text-[#4F4F63] font-medium focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 focus:border-[#5F30EB]/50 appearance-none cursor-pointer transition-all duration-300 hover:border-[#5F30EB]/30"
                  style={{
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid #E6E9F8",
                    boxShadow: "inset 0px -4px 40px 5px #0B385829",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#F6F4FF] text-[#4F4F63]">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="#5F30EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-300"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {/* Tone preview chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setTone(opt.value); setSaved(false); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      tone === opt.value
                        ? "bg-[#5F30EB]/20 text-[#5F30EB] border border-[#5F30EB]/40"
                        : "bg-[#EEF2FF] text-[#8A8AA0] border border-[#5F30EB20] hover:text-[#4F4F63] hover:border-[#5F30EB25]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Post Approval ── */}
            <div>
              <label className="block text-sm text-[#6A6A82] mb-3">
                Reviews Post Approval
              </label>
              <div className="flex items-center gap-8">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="accent-[#5F30EB] w-4 h-4 cursor-pointer"
                    type="radio"
                    name="postType"
                    checked={postType === "auto"}
                    onChange={() => { setPostType("auto"); setSaved(false); }}
                  />
                  <span className="text-[#4F4F63] text-sm group-hover:text-[#040404] transition-colors">
                    Auto Post
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="accent-[#5F30EB] w-4 h-4 cursor-pointer"
                    type="radio"
                    name="postType"
                    checked={postType === "review"}
                    onChange={() => { setPostType("review"); setSaved(false); }}
                  />
                  <span className="text-[#4F4F63] text-sm group-hover:text-[#040404] transition-colors">
                    Review before publish
                  </span>
                </label>
              </div>
              <p className="text-xs text-[#8A8AA0] mt-2">
                Current setting: <span className="text-[#6A6A82]">{postLabel}</span>
              </p>
            </div>


            {/* ── Save ── */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-full font-semibold text-black transition-all duration-300 cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2"
                style={{
                  background: "#5F30EB",
                  boxShadow: "0px 4.65px 9.3px 1.16px #F4F4FE40 inset",
                }}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  "Save Settings"
                )}
              </button>

              {/* Success toast */}
              {saved && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-sm animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Settings saved successfully
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}

