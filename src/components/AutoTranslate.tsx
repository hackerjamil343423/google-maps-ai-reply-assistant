"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { AR_STATIC_MAP } from "@/lib/i18n/ar-static-map";
import { useLanguage } from "@/lib/i18n/language-context";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;
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

  const resolveArabic = useCallback(
    (source: string) => {
      const normalized = normalizeText(source);
      if (!normalized) return source;
      if (/^https?:\/\//i.test(normalized)) return source;

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
        replaced = replaced.split(key).join(value);
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

  return null;
}
