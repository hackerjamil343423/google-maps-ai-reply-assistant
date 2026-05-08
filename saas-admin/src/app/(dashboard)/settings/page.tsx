"use client";

import { useEffect, useState } from "react";

type PlatformSetting = {
  key: string;
  value: string;
  description: string | null;
};

const SETTING_GROUPS = [
  {
    label: "AI Defaults",
    key: "ai_defaults",
    settings: [
      { key: "default_tone", label: "Default Tone", description: "Default AI reply tone", type: "text" },
      { key: "ai_model", label: "AI Model", description: "OpenAI model to use", type: "text" },
    ],
  },
  {
    label: "Platform Limits",
    key: "platform_limits",
    settings: [
      { key: "max_users_per_workspace", label: "Max Users per Workspace", description: "Limit users per workspace", type: "number" },
    ],
  },
  {
    label: "Platform Behavior",
    key: "platform_behavior",
    settings: [
      { key: "require_onboarding", label: "Require Onboarding", description: "Force users to complete onboarding", type: "boolean" },
      { key: "maintenance_mode", label: "Maintenance Mode", description: "Put the platform in maintenance mode", type: "boolean" },
    ],
  },
];

export default function SettingsPage() {
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
      method: "PUT",
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
      <h1 className="mb-6 text-2xl font-bold text-[#040404]">Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {SETTING_GROUPS.map((group) => (
            <div key={group.key} className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#040404]">{group.label}</h2>
              <div className="space-y-4">
                {group.settings.map((setting) => {
                  const isBoolean = setting.type === "boolean";
                  const currentValue = getValue(setting.key);
                  const isChecked = currentValue === "true";

                  return (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#040404]">{setting.label}</p>
                        <p className="text-xs text-[#9490A8]">{setting.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isBoolean ? (
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
                        ) : (
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
                            className="rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-3 py-2 text-sm text-[#040404] outline-none focus:border-[#5F30EB] w-40"
                          />
                        )}
                        {saving === setting.key && (
                          <div className="h-4 w-4 animate-spin rounded-full border border-[#5F30EB] border-t-transparent" />
                        )}
                        {saved === setting.key && (
                          <span className="text-xs text-green-600 font-medium">Saved</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-[#E6E1FA] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#040404]">Admin Users</h2>
            <p className="text-sm text-[#9490A8]">
              Grant or revoke admin access from the{" "}
              <a href="/users" className="text-[#5F30EB] hover:underline">
                Users
              </a>{" "}
              page by toggling the &ldquo;Admin&rdquo; flag on individual user profiles.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
