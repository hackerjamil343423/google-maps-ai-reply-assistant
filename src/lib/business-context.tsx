"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "active_business_id";

export type BusinessItem = {
  id: string;
  name: string;
  googleLocationId: string | null;
  connectedAt: string | null;
  syncedReviewCount: number;
};

type BusinessContextValue = {
  businesses: BusinessItem[];
  activeBusiness: BusinessItem | null; // null = All Profiles
  setActiveBusiness: (b: BusinessItem | null) => void;
  loading: boolean;
  refresh: () => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<BusinessItem | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    let mounted = true;
    setLoading(true);
    void fetch("/api/analytics/businesses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ businesses: BusinessItem[] }>;
      })
      .then((data) => {
        if (!mounted) return;
        const list = data?.businesses ?? [];
        setBusinesses(list);

        // Restore persisted selection
        const storedId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        if (storedId) {
          const match = list.find((b) => b.id === storedId) ?? null;
          setActiveBusinessState(match);
        } else {
          setActiveBusinessState(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveBusiness = useCallback((b: BusinessItem | null) => {
    setActiveBusinessState(b);
    if (typeof window !== "undefined") {
      if (b) {
        window.localStorage.setItem(STORAGE_KEY, b.id);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const value = useMemo<BusinessContextValue>(
    () => ({ businesses, activeBusiness, setActiveBusiness, loading, refresh }),
    [businesses, activeBusiness, setActiveBusiness, loading, refresh]
  );

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessContext must be used within BusinessProvider");
  return ctx;
}
