"use client";

import { useEffect, useState } from "react";

type SeoSettings = {
  id?: string;
  siteTitle: string;
  siteDescription: string;
  ogImage: string;
  twitterHandle: string;
  googleAnalyticsId: string;
  robotsTxt: string;
  structuredDataJson: string;
};

const DEFAULT_SETTINGS: SeoSettings = {
  siteTitle: "",
  siteDescription: "",
  ogImage: "",
  twitterHandle: "",
  googleAnalyticsId: "",
  robotsTxt: "",
  structuredDataJson: "",
};

export default function BlogSeoPage() {
  const [settings, setSettings] = useState<SeoSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/blog/seo")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof SeoSettings, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/blog/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#040404]">SEO Settings</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm font-medium text-green-600">Saved successfully</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1FD4] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* General SEO */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">General</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Site Title</label>
                <input
                  type="text"
                  value={settings.siteTitle}
                  onChange={(e) => updateField("siteTitle", e.target.value)}
                  placeholder="My Blog"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Site Description</label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => updateField("siteDescription", e.target.value)}
                  placeholder="A short description of your blog for search engines"
                  rows={3}
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Social / Open Graph */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Social &amp; Open Graph</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">OG Image URL</label>
                <input
                  type="text"
                  value={settings.ogImage}
                  onChange={(e) => updateField("ogImage", e.target.value)}
                  placeholder="https://example.com/og-image.jpg"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
                <p className="mt-1 text-xs text-[#9490A8]">Default image for social media sharing (1200x630 recommended)</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Twitter Handle</label>
                <input
                  type="text"
                  value={settings.twitterHandle}
                  onChange={(e) => updateField("twitterHandle", e.target.value)}
                  placeholder="@yourhandle"
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
                />
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Analytics</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#040404]">Google Analytics ID</label>
              <input
                type="text"
                value={settings.googleAnalyticsId}
                onChange={(e) => updateField("googleAnalyticsId", e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB]"
              />
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Advanced</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">robots.txt Content</label>
                <textarea
                  value={settings.robotsTxt}
                  onChange={(e) => updateField("robotsTxt", e.target.value)}
                  placeholder={"User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml"}
                  rows={6}
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 font-mono text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#040404]">Structured Data (JSON-LD)</label>
                <textarea
                  value={settings.structuredDataJson}
                  onChange={(e) => updateField("structuredDataJson", e.target.value)}
                  placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Blog",\n  "name": "My Blog"\n}'}
                  rows={8}
                  className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-2.5 font-mono text-sm text-[#040404] outline-none placeholder:text-[#9490A8] focus:border-[#5F30EB] resize-none"
                />
                <p className="mt-1 text-xs text-[#9490A8]">JSON-LD structured data injected into the blog head</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
