"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { AR_STATIC_MAP } from "@/lib/i18n/ar-static-map";
import { useLanguage } from "@/lib/i18n/language-context";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const REPLACEABLE_AR_ENTRIES = Object.entries(AR_STATIC_MAP)
  .filter(([source, translated]) => {
    if (!source || !translated) return false;
    if (!/[A-Za-z]/.test(source)) return false;
    // Skip single-character keys to avoid accidental substitutions.
    return source.length > 1;
  })
  .sort((a, b) => b[0].length - a[0].length);

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
      const inExcludedSubtree = Boolean(
        node.parentElement?.closest("[data-no-auto-translate='true']")
      );
      if (
        !inExcludedSubtree &&
        !["script", "style", "noscript", "textarea", "code", "pre"].includes(parentName)
      ) {
        textNodes.push(node as Text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!element.closest("[data-no-auto-translate='true']")) {
        elements.push(element);
      }
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
  const titleObserverRef = useRef<MutationObserver | null>(null);
  const titleOriginalRef = useRef<string | null>(null);
  const applyingRef = useRef(false);

  const resolveArabic = useCallback(
    (source: string) => {
      const normalized = normalizeText(source);
      if (!normalized) return source;
      if (/^https?:\/\//i.test(normalized)) return source;

      const planLimit = normalized.match(
        /^Your (.+) plan allows up to (\d+) connected account\(s\)\. Upgrade your plan to add more\.$/
      );
      if (planLimit) {
        return `تسمح خطة ${planLimit[1]} بربط ${planLimit[2]} حساب كحد أقصى. رقِّ خطتك لإضافة المزيد.`;
      }

      const singleReportLimit = normalized.match(
        /^Report already generated for "(.+)" this month\. Next available: (.+)$/
      );
      if (singleReportLimit) {
        return `تم إنشاء تقرير للنشاط "${singleReportLimit[1]}" هذا الشهر بالفعل. الموعد التالي المتاح: ${singleReportLimit[2]}`;
      }

      const comparisonLimit = normalized.match(
        /^Comparison already generated for this business set this month\. Next available: (.+)$/
      );
      if (comparisonLimit) {
        return `تم إنشاء مقارنة لهذه المجموعة من الأنشطة هذا الشهر بالفعل. الموعد التالي المتاح: ${comparisonLimit[1]}`;
      }

      const missingReviews = normalized.match(/^No reviews found for: (.+)$/);
      if (missingReviews) {
        return `لم يتم العثور على تقييمات للأنشطة التالية: ${missingReviews[1]}`;
      }

      const reportTitle = normalized.match(/^Report (.+) \| Wakkelni$/);
      if (reportTitle) {
        return `تقرير ${reportTitle[1]} | Wakkelni`;
      }

      if (AR_STATIC_MAP[normalized]) {
        return AR_STATIC_MAP[normalized];
      }

      const noColon = normalized.endsWith(":")
        ? normalized.slice(0, -1).trim()
        : normalized;
      if (noColon !== normalized && AR_STATIC_MAP[noColon]) {
        return `${AR_STATIC_MAP[noColon]}:`;
      }

      const noPeriod = normalized.endsWith(".")
        ? normalized.slice(0, -1).trim()
        : normalized;
      if (noPeriod !== normalized && AR_STATIC_MAP[noPeriod]) {
        return `${AR_STATIC_MAP[noPeriod]}.`;
      }

      // Deterministic dictionary phrase replacement for dynamic strings.
      let replaced = normalized;
      for (const [key, value] of REPLACEABLE_AR_ENTRIES) {
        if (!replaced.includes(key)) continue;
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const startBoundary = /^[A-Za-z0-9]/.test(key)
          ? "(?<![A-Za-z0-9])"
          : "";
        const endBoundary = /[A-Za-z0-9]$/.test(key)
          ? "(?![A-Za-z0-9])"
          : "";
        replaced = replaced.replace(
          new RegExp(`${startBoundary}${escapedKey}${endBoundary}`, "g"),
          value
        );
      }
      if (replaced !== normalized) {
        return replaced;
      }

      return source;
    },
    []
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
            if (typeof original === "string") {
              const translatedOriginal = resolveArabic(original);
              if (current === translatedOriginal && current !== original) {
                textNode.nodeValue = original;
              } else if (current !== original) {
                // Explicit bilingual React content changed itself. Treat the
                // newly rendered English value as authoritative.
                textOriginalRef.current.set(textNode, current);
              }
            }
            continue;
          }

          if (!textOriginalRef.current.has(textNode)) {
            textOriginalRef.current.set(textNode, current);
          }

          let original = textOriginalRef.current.get(textNode) ?? current;
          const previousTranslation = resolveArabic(original);
          if (current !== original && current !== previousTranslation) {
            // The component rendered a new source value (for example its own
            // Arabic branch or route-specific copy). Do not overwrite it with
            // a stale translation captured on an earlier render.
            textOriginalRef.current.set(textNode, current);
            original = current;
          }
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
              if (typeof original === "string") {
                const translatedOriginal = resolveArabic(original);
                if (current === translatedOriginal && current !== original) {
                  element.setAttribute(attr, original);
                } else if (current !== original) {
                  attrMap.set(attr, current);
                }
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

            let original = attrMap.get(attr) ?? current;
            const previousTranslation = resolveArabic(original);
            if (current !== original && current !== previousTranslation) {
              attrMap.set(attr, current);
              original = current;
            }
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

    if (language !== "ar") return;

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
    };
  }, [applyTranslationsFn, language, observerConfig, ready]);

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;

    const applyTitle = () => {
      const current = document.title;
      const previous = titleOriginalRef.current;
      const previousArabic = previous ? resolveArabic(previous) : null;

      if (language === "en") {
        if (previous && current === previousArabic) {
          document.title = previous;
        } else {
          titleOriginalRef.current = current;
        }
        return;
      }

      if (!previous || (current !== previous && current !== previousArabic)) {
        titleOriginalRef.current = current;
      }
      const original = titleOriginalRef.current ?? current;
      const translated = resolveArabic(original);
      if (translated !== current) document.title = translated;
    };

    titleObserverRef.current?.disconnect();
    applyTitle();
    titleObserverRef.current = new MutationObserver(applyTitle);
    titleObserverRef.current.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => titleObserverRef.current?.disconnect();
  }, [language, ready, resolveArabic]);

  return null;
}
