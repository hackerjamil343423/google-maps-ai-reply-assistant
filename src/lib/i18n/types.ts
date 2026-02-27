export type AppLanguage = "en" | "ar";

export const APP_LANGUAGE_STORAGE_KEY = "app_language";

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (!value) return "en";
  return value.toLowerCase().startsWith("ar") ? "ar" : "en";
}
