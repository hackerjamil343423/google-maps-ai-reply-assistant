"use client";

import { useEffect, useState } from "react";

type PlatformSetting = {
  key: string;
  value: string;
  description: string | null;
};

const BLOG_SETTINGS = [
  { key: "blog_posts_per_page", label: "Posts per Page", type: "number" as const, description: "Number of blog posts shown per page" },
  { key: "blog_title", label: "Blog Title", type: "text" as const, description: "Title displayed on the blog homepage" },
  { key: "blog_description", label: "Blog Description", type: "textarea" as const, description: "Short description shown below the blog title" },
  { key: "blog_comments_enabled", label: "Enable Comments", type: "boolean" as const, description: "Allow readers to leave comments on blog posts" },
  { key: "blog_social_sharing", label: "Enable Social Sharing", type: "boolean" as const, description: "Show social media sharing buttons on blog posts" },
];

export default function BlogSettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  function getValue(key: string): string {
    return settingsMap.get(key) ?? "";
  }

  useEffect(() => {
    fetch("/api/admin/platform-settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(key);
    setSaved(null);
    await fetch("/api/admin/platform-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);

    setSettings((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value, description: null }];
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Blog Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* General Settings */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">General</h2>
            <div className="space-y-4">
              {BLOG_SETTINGS.filter((s) => s.type === "text" || s.type === "number").map((setting) => {
                const currentValue = getValue(setting.key);
                return (
                  <div key={setting.key}>
                    <label className="mb-1.5 block text-sm font-medium text-[#040404]">{setting.label}</label>
                    <input
                      type={setting.type === "number" ? "number" : "text"}
                      defaultValue={currentValue}
                      onBlur={(e) => {
                        if (e.target.value !== currentValue) {
                          saveSetting(setting.key, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder={setting.label}
                      className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                    />
                    <p className="mt-1 text-xs text-[#9490A8]">{setting.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Description</h2>
            {BLOG_SETTINGS.filter((s) => s.type === "textarea").map((setting) => {
              const currentValue = getValue(setting.key);
              return (
                <div key={setting.key}>
                  <label className="mb-1.5 block text-sm font-medium text-[#040404]">{setting.label}</label>
                  <textarea
                    defaultValue={currentValue}
                    onBlur={(e) => {
                      if (e.target.value !== currentValue) {
                        saveSetting(setting.key, e.target.value);
                      }
                    }}
                    placeholder={setting.label}
                    rows={3}
                    className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] resize-none"
                  />
                  <p className="mt-1 text-xs text-[#9490A8]">{setting.description}</p>
                </div>
              );
            })}
          </div>

          {/* Feature Toggles */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Features</h2>
            <div className="space-y-4">
              {BLOG_SETTINGS.filter((s) => s.type === "boolean").map((setting) => {
                const currentValue = getValue(setting.key);
                const isChecked = currentValue === "true";
                return (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#040404]">{setting.label}</p>
                      <p className="text-xs text-[#9490A8]">{setting.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveSetting(setting.key, String(!isChecked))}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          isChecked ? "bg-[#5F30EB]" : "bg-[#E6E1FA]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            isChecked ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                      {saving === setting.key && (
                        <div className="h-4 w-4 animate-spin rounded-full border border-[#5F30EB] border-t-transparent" />
                      )}
                      {saved === setting.key && (
                        <span className="text-xs font-medium text-green-600">Saved</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
