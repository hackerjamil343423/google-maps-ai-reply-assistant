"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";

const DEFAULT_PROMPT = `You are an AI assistant specializing in crafting professional, personalized responses to Google Reviews for businesses. Your goal is to create replies that are helpful, engaging, and build positive relationships with customers.

RESPONSE GUIDELINES:
1. PERSONALIZATION: Reference specific aspects of the review to show you've read and understood their feedback.
2. GRATITUDE: Always start with sincere thanks for their review and business.
3. ADDRESS CONCERNS: If there are complaints or suggestions, acknowledge them empathetically and explain any actions taken or planned.
4. HIGHLIGHT POSITIVES: If the review is positive, amplify their satisfaction and invite them back.
5. LENGTH: Keep responses concise (2-4 sentences) but comprehensive.
6. TONE: Maintain professional tone - be warm, authentic, and approachable.
7. CALL TO ACTION: End with an invitation for future business or continued feedback.
8. SIGNATURE: Always close with "Best regards," followed by just the business name (without full address or location details).

Remember: Each response should feel genuine, not generic. Make customers feel heard and valued.`;

const TONE_OPTIONS = [
  { value: "Professional", label: "Professional" },
  { value: "Friendly",     label: "Friendly" },
  { value: "Concise",      label: "Concise" },
  { value: "Detailed",     label: "Detailed" },
  { value: "Empathetic",   label: "Empathetic" },
  { value: "Casual",       label: "Casual" },
  { value: "Luxurious",    label: "Luxurious" },
  { value: "Playful",      label: "Playful" },
];

type PostType = "auto" | "review";

export default function SettingsPage() {
  const [prompt, setPrompt]         = useState(DEFAULT_PROMPT);
  const [tone, setTone]             = useState("Professional");
  const [postType, setPostType]     = useState<PostType>("auto");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [charCount, setCharCount]   = useState(DEFAULT_PROMPT.length);

  function handlePromptChange(v: string) {
    setPrompt(v);
    setCharCount(v.length);
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    // TODO: persist to backend
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  const postLabel = postType === "auto"
    ? "Auto Post (no approval needed)"
    : "Review before publish";

  return (
    <DashboardShell activeHref="/dashboard/settings">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#1f1f1f] p-6 md:p-10 min-h-[70vh] max-h-[calc(100vh-120px)] overflow-y-auto backdrop-blur-[80px]"
          style={{
            background: "rgba(11,9,10,0.2)",
            boxShadow: "inset 0px -4px 100px 21px #EFEFEF14",
          }}
        >
          <h2 className="text-xl md:text-2xl font-medium mb-6">Settings</h2>

          <form onSubmit={handleSave} className="space-y-8 max-w-3xl">

            {/* ── AI Prompt ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-400">
                  AI-generated response
                </label>
                <span className="text-xs text-gray-600">{charCount} chars</span>
              </div>
              <textarea
                rows={12}
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Enter the instruction for AI to write reviews"
                className="w-full px-4 py-3 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00FFE9]/50 resize-vertical text-sm leading-relaxed transition-all"
                style={{
                  background: "rgba(11,9,10,0.2)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "inset 0px -4.65px 116.24px 24.41px #EFEFEF14",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#00FFE9 #1f1f1f",
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { handlePromptChange(DEFAULT_PROMPT); }}
                  className="text-xs text-gray-500 hover:text-[#00FFE9] transition-colors cursor-pointer underline-offset-2 hover:underline"
                >
                  Reset to default
                </button>
              </div>
            </div>

            {/* ── Tone Style ── */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Set AI Tone Style
              </label>
              <div className="relative max-w-sm">
                <select
                  value={tone}
                  onChange={(e) => { setTone(e.target.value); setSaved(false); }}
                  className="w-full px-4 py-3 pr-10 rounded-lg text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-[#00FFE9]/50 focus:border-[#00FFE9]/50 appearance-none cursor-pointer transition-all duration-300 hover:border-[#00FFE9]/30"
                  style={{
                    background: "rgba(11,9,10,0.2)",
                    border: "1px solid #2A2A2A",
                    boxShadow: "inset 0px -4px 40px 5px #0B385829",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0B090A] text-gray-300">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="#00FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
                        ? "bg-[#00FFE9]/20 text-[#00FFE9] border border-[#00FFE9]/40"
                        : "bg-[#1a1a1a] text-gray-500 border border-[#ffffff10] hover:text-gray-300 hover:border-[#ffffff25]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Post Approval ── */}
            <div>
              <label className="block text-sm text-gray-400 mb-3">
                Reviews Post Approval
              </label>
              <div className="flex items-center gap-8">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="accent-[#00FFE9] w-4 h-4 cursor-pointer"
                    type="radio"
                    name="postType"
                    checked={postType === "auto"}
                    onChange={() => { setPostType("auto"); setSaved(false); }}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    Auto Post
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="accent-[#00FFE9] w-4 h-4 cursor-pointer"
                    type="radio"
                    name="postType"
                    checked={postType === "review"}
                    onChange={() => { setPostType("review"); setSaved(false); }}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    Review before publish
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Current setting: <span className="text-gray-400">{postLabel}</span>
              </p>
            </div>

            {/* ── Save ── */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-full font-semibold text-black transition-all duration-300 cursor-pointer disabled:opacity-60 hover:opacity-90 active:scale-[0.97] flex items-center gap-2"
                style={{
                  background: "#00FFE9",
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
