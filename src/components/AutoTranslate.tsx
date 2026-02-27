"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { AR_STATIC_MAP } from "@/lib/i18n/ar-static-map";
import { useLanguage } from "@/lib/i18n/language-context";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;
const CACHE_STORAGE_KEY = "i18n_ar_cache_v1";

type TranslationApiResponse = {
  translations?: Record<string, string>;
};

function shouldSkipText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^[0-9\s.,:/\-+()%]+$/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getNodesInScope(root: Node) {
  const textNodes: Text[] = [];
  const elements: Element[] = [];

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parentName = node.parentElement?.tagName.toLowerCase() || "";
      if (!["script", "style", "noscript", "textarea", "code", "pre"].includes(parentName)) {
        textNodes.push(node as Text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      elements.push(node as Element);
    }

    node = walker.nextNode();
  }

  return { textNodes, elements };
}

export default function AutoTranslate() {
  const { language, ready } = useLanguage();

  const textOriginalRef = useRef(new WeakMap<Text, string>());
  const attrOriginalRef = useRef(new WeakMap<Element, Map<string, string>>());
  const observerRef = useRef<MutationObserver | null>(null);
  const applyingRef = useRef(false);
  const pendingTextsRef = useRef(new Set<string>());
  const flushTimerRef = useRef<number | null>(null);
  const cacheRef = useRef<Record<string, string>>({});
  const applyFnRef = useRef<(root: Node) => void>(() => {});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      cacheRef.current = parsed;
    } catch {
      cacheRef.current = {};
    }
  }, []);

  const persistCache = useCallback(() => {
    try {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheRef.current));
    } catch {
      // Ignore storage quota errors.
    }
  }, []);

  const translateBatch = useCallback(
    async (texts: string[]) => {
      if (texts.length === 0) return;

      try {
        const res = await fetch("/api/i18n/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            texts,
            target: "ar",
          }),
        });

        const json = (await res.json().catch(() => null)) as
          | TranslationApiResponse
          | null;
        if (!res.ok || !json?.translations) {
          return;
        }

        let changed = false;
        for (const [source, translated] of Object.entries(json.translations)) {
          if (!translated || translated === source) continue;
          cacheRef.current[source] = translated;
          changed = true;
        }

        if (changed) {
          persistCache();
          applyFnRef.current(document.body);
        }
      } catch {
        // Keep source text if translation service fails.
      }
    },
    [persistCache]
  );

  const flushPending = useCallback(() => {
    flushTimerRef.current = null;
    const items = [...pendingTextsRef.current];
    pendingTextsRef.current.clear();
    void translateBatch(items);
  }, [translateBatch]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushPending();
    }, 180);
  }, [flushPending]);

  const resolveArabic = useCallback(
    (source: string) => {
      const normalized = normalizeText(source);
      if (!normalized) return source;

      if (AR_STATIC_MAP[normalized]) {
        return AR_STATIC_MAP[normalized];
      }

      if (cacheRef.current[normalized]) {
        return cacheRef.current[normalized];
      }

      if (!shouldSkipText(normalized)) {
        pendingTextsRef.current.add(normalized);
        scheduleFlush();
      }

      return source;
    },
    [scheduleFlush]
  );

  const applyTranslationsFn = useCallback(
    (root: Node) => {
      if (!ready) return;

      applyingRef.current = true;
      try {
        const { textNodes, elements } = getNodesInScope(root);

        for (const textNode of textNodes) {
          const current = textNode.nodeValue ?? "";
          if (!textOriginalRef.current.has(textNode)) {
            textOriginalRef.current.set(textNode, current);
          }

          const original = textOriginalRef.current.get(textNode) ?? current;
          if (language === "en") {
            textNode.nodeValue = original;
            continue;
          }

          textNode.nodeValue = resolveArabic(original);
        }

        for (const element of elements) {
          for (const attr of TRANSLATABLE_ATTRS) {
            const current = element.getAttribute(attr);
            if (!current) continue;

            if (!attrOriginalRef.current.has(element)) {
              attrOriginalRef.current.set(element, new Map());
            }
            const attrMap = attrOriginalRef.current.get(element) as Map<string, string>;

            if (!attrMap.has(attr)) {
              attrMap.set(attr, current);
            }

            const original = attrMap.get(attr) ?? current;
            if (language === "en") {
              element.setAttribute(attr, original);
              continue;
            }

            element.setAttribute(attr, resolveArabic(original));
          }
        }
      } finally {
        applyingRef.current = false;
      }
    },
    [language, ready, resolveArabic]
  );
  applyFnRef.current = applyTranslationsFn;

  const observerConfig = useMemo<MutationObserverInit>(
    () => ({
      childList: true,
      subtree: true,
      characterData: true,
    }),
    []
  );

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;

    applyTranslationsFn(document.body);

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      if (applyingRef.current) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          if (mutation.target) applyTranslationsFn(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          applyTranslationsFn(node);
        }
      }
    });
    observerRef.current.observe(document.body, observerConfig);

    return () => {
      observerRef.current?.disconnect();
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [applyTranslationsFn, observerConfig, ready]);

  return null;
}
