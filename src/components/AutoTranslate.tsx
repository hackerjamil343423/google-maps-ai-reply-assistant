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
  if (trimmed.length > 500) return true;
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
      if (language !== "ar") return;

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
    [language, persistCache]
  );

  const flushPending = useCallback(() => {
    flushTimerRef.current = null;
    const items = [...pendingTextsRef.current].slice(0, 120);
    if (items.length === 0) return;

    for (const item of items) {
      pendingTextsRef.current.delete(item);
    }

    void translateBatch(items).finally(() => {
      if (pendingTextsRef.current.size > 0 && !flushTimerRef.current) {
        flushTimerRef.current = window.setTimeout(() => {
          flushPending();
        }, 180);
      }
    });
  }, [translateBatch]);

  const scheduleFlush = useCallback(() => {
    if (language !== "ar") return;
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushPending();
    }, 180);
  }, [flushPending, language]);

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
          if (language === "en") {
            const original = textOriginalRef.current.get(textNode);
            if (typeof original === "string" && original !== current) {
              textNode.nodeValue = original;
            }
            continue;
          }

          if (!textOriginalRef.current.has(textNode)) {
            textOriginalRef.current.set(textNode, current);
          }

          const original = textOriginalRef.current.get(textNode) ?? current;
          const translated = resolveArabic(original);
          if (translated !== current) {
            textNode.nodeValue = translated;
          }
        }

        for (const element of elements) {
          for (const attr of TRANSLATABLE_ATTRS) {
            const current = element.getAttribute(attr);
            if (!current) continue;

            if (language === "en") {
              const attrMap = attrOriginalRef.current.get(element);
              if (!attrMap) continue;
              const original = attrMap.get(attr);
              if (typeof original === "string" && original !== current) {
                element.setAttribute(attr, original);
              }
              continue;
            }

            if (!attrOriginalRef.current.has(element)) {
              attrOriginalRef.current.set(element, new Map());
            }
            const attrMap = attrOriginalRef.current.get(element) as Map<string, string>;

            if (!attrMap.has(attr)) {
              attrMap.set(attr, current);
            }

            const original = attrMap.get(attr) ?? current;
            const translated = resolveArabic(original);
            if (translated !== current) {
              element.setAttribute(attr, translated);
            }
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
    }),
    []
  );

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;

    observerRef.current?.disconnect();
    applyTranslationsFn(document.body);

    if (language !== "ar") {
      pendingTextsRef.current.clear();
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      return;
    }

    observerRef.current = new MutationObserver((mutations) => {
      if (applyingRef.current) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType !== Node.ELEMENT_NODE &&
            node.nodeType !== Node.TEXT_NODE
          ) {
            continue;
          }
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
  }, [applyTranslationsFn, language, observerConfig, ready]);

  return null;
}
