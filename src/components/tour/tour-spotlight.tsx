"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/components/tour/steps";

type Rect = { top: number; left: number; width: number; height: number };
export default function TourSpotlight({ step, index, total, language, onNext, onPrev, onSkip }: { step: TourStep; index: number; total: number; language: "en" | "ar"; onNext(): void; onPrev(): void; onSkip(): void }) {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    let frame = 0;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const value = target.getBoundingClientRect(); setRect({ top: value.top - 8, left: value.left - 8, width: value.width + 16, height: value.height + 16 }); }); };
    measure(); window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step.target]);
  if (!rect) return null;
  const below = rect.top + rect.height + 16;
  const top = below + 230 < window.innerHeight ? below : Math.max(16, rect.top - 230);
  const left = language === "ar" ? Math.max(16, Math.min(window.innerWidth - 336, rect.left + rect.width - 320)) : Math.max(16, Math.min(window.innerWidth - 336, rect.left));
  return <div className="fixed inset-0 z-[100] pointer-events-none" dir={language === "ar" ? "rtl" : "ltr"}><div className="fixed rounded-2xl ring-2 ring-primary transition-all" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 100vmax rgba(19,15,29,0.55)" }} /><div className="pointer-events-auto fixed w-80 rounded-2xl border border-border bg-white p-4 shadow-2xl" style={{ top, left }}><p className="font-semibold">{step.title[language]}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body[language]}</p><div className="mt-4 flex gap-1">{Array.from({ length: total }, (_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-muted"}`} />)}</div><div className="mt-4 flex items-center justify-between"><Button variant="ghost" size="sm" onClick={onSkip}>{language === "ar" ? "تخطي الجولة" : "Skip tour"}</Button><div className="flex gap-2"><Button variant="outline" size="sm" disabled={index === 0} onClick={onPrev}>{language === "ar" ? "السابق" : "Back"}</Button><Button size="sm" onClick={onNext}>{index === total - 1 ? (language === "ar" ? "إنهاء" : "Finish") : (language === "ar" ? "التالي" : "Next")}</Button></div></div></div></div>;
}
