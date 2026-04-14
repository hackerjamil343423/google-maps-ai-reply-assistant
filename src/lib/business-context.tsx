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
  refresh: () => Promise<void>;
};

const DEFAULT_CONTEXT: BusinessContextValue = {
  businesses: [],
  activeBusiness: null,
  setActiveBusiness: () => {},
  loading: false,
  refresh: async () => {},
};

const BusinessContext = createContext<BusinessContextValue>(DEFAULT_CONTEXT);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<BusinessItem | null>(null);
  const [loading, setLoading] = useState(true);

  const applyBusinessList = useCallback((list: BusinessItem[]) => {
    setBusinesses(list);

    const storedId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

    setActiveBusinessState((current) => {
      if (current) {
        return list.find((b) => b.id === current.id) ?? null;
      }
      if (storedId) {
        return list.find((b) => b.id === storedId) ?? null;
      }
      return null;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/businesses", { cache: "no-store" });
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as { businesses: BusinessItem[] };
      applyBusinessList(data.businesses ?? []);
    } finally {
      setLoading(false);
    }
  }, [applyBusinessList]);

  useEffect(() => {
    let active = true;

    void fetch("/api/analytics/businesses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ businesses: BusinessItem[] }>;
      })
      .then((data) => {
        if (!active) return;
        applyBusinessList(data?.businesses ?? []);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [applyBusinessList]);

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
  return useContext(BusinessContext);
}
