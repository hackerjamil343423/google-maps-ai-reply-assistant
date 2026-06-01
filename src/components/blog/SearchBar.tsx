"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string };

export default function SearchBar({
  categories,
  initialQuery = "",
  initialCategory = "",
}: {
  categories: Category[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [pending, startTransition] = useTransition();

  function buildUrl(q: string, category: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }

  function applyFilters(q: string, category: string) {
    startTransition(() => {
      router.push(buildUrl(q, category));
    });
  }

  function handleInputChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      applyFilters(value, activeCategory);
    }, 350);
  }

  function handleCategoryClick(slug: string) {
    const next = activeCategory === slug ? "" : slug;
    setActiveCategory(next);
    applyFilters(query, next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearTimeout(timerRef.current);
    applyFilters(query, activeCategory);
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <svg
            className="absolute left-4 h-5 w-5 text-[#8A8AA0] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-2xl border border-[rgba(95,48,235,0.2)] bg-[rgba(255,255,255,0.8)] backdrop-blur-[14px] py-3.5 pl-12 pr-4 text-[#040404] placeholder-[#8A8AA0] shadow-[0_12px_32px_rgba(20,20,40,0.08)] outline-none transition-all focus:border-[rgba(95,48,235,0.4)] focus:shadow-[0_12px_32px_rgba(95,48,235,0.14)]"
          />
          {pending && (
            <div className="absolute right-4 h-5 w-5 animate-spin rounded-full border-2 border-[#5F30EB] border-t-transparent" />
          )}
        </div>
      </form>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategoryClick("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              activeCategory === ""
                ? "bg-[#5F30EB] text-white shadow-[0_4px_12px_rgba(95,48,235,0.25)]"
                : "border border-[rgba(95,48,235,0.2)] bg-white text-[#5E5876] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                activeCategory === cat.slug
                  ? "bg-[#5F30EB] text-white shadow-[0_4px_12px_rgba(95,48,235,0.25)]"
                  : "border border-[rgba(95,48,235,0.2)] bg-white text-[#5E5876] hover:border-[rgba(95,48,235,0.4)] hover:text-[#5F30EB]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
