"use client";

import type { ReactNode } from "react";

import AutoTranslate from "@/components/AutoTranslate";
import AssistantChatWidget from "@/components/AssistantChatWidget";
import { LanguageProvider } from "@/lib/i18n/language-context";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AutoTranslate />
      {children}
      <AssistantChatWidget />
    </LanguageProvider>
  );
}
