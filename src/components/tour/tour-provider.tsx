"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import { dashboardWelcomeTour } from "@/components/tour/steps";
const TourSpotlight = dynamic(() => import("@/components/tour/tour-spotlight"), { ssr: false });

type TourContextValue = { startTour(): void };
const TourContext = createContext<TourContextValue>({ startTour() {} });
export const useTour = () => useContext(TourContext);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const { language } = useLanguage();
  const [welcome, setWelcome] = useState(false); const [active, setActive] = useState(false); const [index, setIndex] = useState(0); const [routeReady, setRouteReady] = useState(0);
  const complete = useCallback(() => { localStorage.setItem("tour_completed_dashboard-welcome", "true"); setActive(false); setWelcome(false); void fetch("/api/tours/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tourId: "dashboard-welcome" }) }).catch(() => null); }, []);
  const startTour = useCallback(() => { setWelcome(false); setIndex(0); setActive(true); }, []);
  useEffect(() => { if (sessionStorage.getItem("tour_prompt_checked")) return; sessionStorage.setItem("tour_prompt_checked", "true"); if (localStorage.getItem("tour_completed_dashboard-welcome")) return; void fetch("/api/me", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then((me) => { if (me?.onboardingCompleted && !me?.toursCompleted?.includes("dashboard-welcome")) setWelcome(true); }).catch(() => null); }, []);
  const step = dashboardWelcomeTour.steps[index];
  useEffect(() => { if (!active) return; const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") complete(); }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [active, complete]);
  useEffect(() => { if (!active || !step) return; if (step.route && pathname !== step.route) { router.push(step.route); return; } const timer = window.setTimeout(() => { if (!document.querySelector(`[data-tour="${step.target}"]`)) { if (index >= dashboardWelcomeTour.steps.length - 1) complete(); else setIndex((value) => value + 1); } else setRouteReady((value) => value + 1); }, 500); return () => window.clearTimeout(timer); }, [active, complete, index, pathname, router, step]);
  function next() { if (index >= dashboardWelcomeTour.steps.length - 1) complete(); else setIndex((value) => value + 1); }
  return <TourContext.Provider value={{ startTour }}>{children}<Dialog open={welcome} onOpenChange={(open) => { if (!open) complete(); }}><DialogContent closeLabel={language === "ar" ? "إغلاق" : "Close"}><DialogHeader><DialogTitle>{language === "ar" ? "مرحبًا بك في Wakkelni Stars" : "Welcome to Wakkelni Stars"}</DialogTitle><DialogDescription>{language === "ar" ? "هل ترغب في جولة سريعة لمدة دقيقتين للتعرف على أهم الأدوات؟" : "Take a two-minute tour of the tools that help you manage reviews and grow your reputation."}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={complete}>{language === "ar" ? "لاحقًا" : "Skip for now"}</Button><Button onClick={startTour}>{language === "ar" ? "ابدأ الجولة" : "Start tour"}</Button></DialogFooter></DialogContent></Dialog>{active && step && (!step.route || pathname === step.route) && <TourSpotlight key={`${index}-${routeReady}`} step={step} index={index} total={dashboardWelcomeTour.steps.length} language={language} onNext={next} onPrev={() => setIndex((value) => Math.max(0, value - 1))} onSkip={complete} />}</TourContext.Provider>;
}
