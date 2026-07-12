"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConnectedBusiness = { id: string; name: string; googleLocationId: string | null; connectedAt: string | null; syncedReviewCount: number };
export type ReportSummary = { id: string; businessId: string; businessName?: string; generatedAt: string; reviewCount: number; periodStart: string; periodEnd: string };
export type ComparisonSummary = { id: string; type: "comparison"; businesses: Array<{ id: string; name: string }>; businessCount: number; generatedAt: string; reviewCount: number; periodStart: string; periodEnd: string };
export type HistoryItem = (ReportSummary & { type: "single" }) | ComparisonSummary;

type Props = { open: boolean; onOpenChange(open: boolean): void; businesses: ConnectedBusiness[]; activeBusinessId?: string; onReportCreated(item: HistoryItem, detailHref: string): void };
type ReportType = "single" | "comparison";
type Period = "all_time" | "this_month";

function Choice({ selected, disabled, title, description, onClick }: { selected: boolean; disabled?: boolean; title: string; description: string; onClick(): void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition-colors", selected ? "border-primary bg-secondary" : "border-border hover:border-primary/40 hover:bg-muted", disabled && "cursor-not-allowed opacity-50")}><span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-border")}>{selected && <Check className="size-3" />}</span><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span></button>;
}

export default function NewReportWizard({ open, onOpenChange, businesses, activeBusinessId, onReportCreated }: Props) {
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("this_month");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const singleCandidates = useMemo(() => activeBusinessId ? businesses.filter((business) => business.id === activeBusinessId) : businesses, [activeBusinessId, businesses]);
  const eligibleSingle = useMemo(() => singleCandidates.filter((business) => business.syncedReviewCount > 0), [singleCandidates]);
  const selected = businesses.filter((business) => selectedBusinessIds.includes(business.id));

  useEffect(() => {
    if (!open) return;
    setStep(1); setReportType(null); setSelectedBusinessIds([]); setPeriod("this_month"); setLanguage("en"); setGenerating(false); setError(""); setInfo("");
  }, [open]);

  function changeOpen(next: boolean) { if (!generating) onOpenChange(next); }
  function selectType(type: ReportType) { setReportType(type); setSelectedBusinessIds(type === "single" && activeBusinessId && eligibleSingle.some((b) => b.id === activeBusinessId) ? [activeBusinessId] : []); setError(""); setInfo(""); }
  function next() {
    if (step === 1 && reportType === "single" && eligibleSingle.length === 1) { setSelectedBusinessIds([eligibleSingle[0].id]); setStep(3); return; }
    setStep((value) => Math.min(4, value + 1));
  }
  function back() { setStep((value) => value === 3 && reportType === "single" && eligibleSingle.length === 1 ? 1 : Math.max(1, value - 1)); setError(""); setInfo(""); }
  function toggleBusiness(id: string) {
    if (reportType === "single") { setSelectedBusinessIds([id]); return; }
    setSelectedBusinessIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }
  const canNext = step === 1 ? reportType !== null : step === 2 ? reportType === "single" ? selectedBusinessIds.length === 1 : selectedBusinessIds.length >= 2 && selectedBusinessIds.length <= 3 : true;

  async function generate() {
    if (!reportType) return;
    setGenerating(true); setError(""); setInfo("");
    try {
      const comparison = reportType === "comparison";
      const response = await fetch(comparison ? "/api/analytics/comparison-reports" : "/api/analytics/reports/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(comparison ? { businessIds: selectedBusinessIds, period, language } : { businessId: selectedBusinessIds[0], period, language }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 422) setInfo(data.message || "No reviews were found for this period."); else setError(data.error || "Failed to generate report."); return; }
      const item: HistoryItem = comparison ? { id: data.id, type: "comparison", businesses: data.businesses, businessCount: data.businessCount ?? data.businesses.length, generatedAt: data.generatedAt, reviewCount: data.reviewCount, periodStart: data.periodStart, periodEnd: data.periodEnd } : { id: data.id, type: "single", businessId: data.businessId, businessName: data.businessName, generatedAt: data.generatedAt, reviewCount: data.reviewCount, periodStart: data.periodStart, periodEnd: data.periodEnd };
      onReportCreated(item, comparison ? `/dashboard/reports/comparisons/${data.id}` : `/dashboard/reports/${data.id}`);
      onOpenChange(false);
    } catch { setError("An error occurred. Please try again."); }
    finally { setGenerating(false); }
  }

  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="sm:max-w-xl" onEscapeKeyDown={(event) => generating && event.preventDefault()} onInteractOutside={(event) => generating && event.preventDefault()} showCloseButton={!generating}>
    {businesses.length === 0 ? <div className="py-8 text-center"><Building2 className="mx-auto mb-3 size-10 text-muted-foreground" /><DialogTitle>Connect your Google Business</DialogTitle><DialogDescription className="mt-2">Connect a business profile before generating reports.</DialogDescription><Button asChild className="mt-5"><Link href="/dashboard/settings">Open Settings</Link></Button></div> : <>
      <DialogHeader><DialogTitle>New Report</DialogTitle><DialogDescription>Choose one option at a time. You can review everything before generation.</DialogDescription><div className="flex gap-2 pt-2" aria-label={`Step ${step} of 4`}>{[1,2,3,4].map((value) => <span key={value} className={cn("h-1.5 flex-1 rounded-full", value <= step ? "bg-primary" : "bg-muted")} />)}</div></DialogHeader>
      <div className="min-h-72 py-2">
        {step === 1 && <div className="space-y-3"><h3 className="font-semibold">What would you like to analyze?</h3><Choice selected={reportType === "single"} title="Single business" description="Deep-dive into one business's reviews" onClick={() => selectType("single")} /><Choice selected={reportType === "comparison"} disabled={businesses.length < 2} title="Compare businesses" description={businesses.length < 2 ? "Connect at least 2 businesses" : "Side-by-side analysis of 2-3 businesses"} onClick={() => selectType("comparison")} /></div>}
        {step === 2 && <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Choose {reportType === "single" ? "a business" : "2-3 businesses"}</h3>{reportType === "comparison" && <span className="text-xs text-muted-foreground">{selectedBusinessIds.length}/3 selected</span>}</div>{(reportType === "single" ? singleCandidates : businesses).map((business) => { const disabled = business.syncedReviewCount === 0 || (reportType === "comparison" && !selectedBusinessIds.includes(business.id) && selectedBusinessIds.length >= 3); return <Choice key={business.id} selected={selectedBusinessIds.includes(business.id)} disabled={disabled} title={business.name} description={business.syncedReviewCount === 0 ? "No synced reviews yet" : `${business.syncedReviewCount} synced reviews`} onClick={() => toggleBusiness(business.id)} />; })}</div>}
        {step === 3 && <div className="space-y-5"><div className="space-y-3"><h3 className="font-semibold">Period</h3><div className="grid gap-3 sm:grid-cols-2"><Choice selected={period === "this_month"} title="This Month" description="Only reviews from this month" onClick={() => setPeriod("this_month")} /><Choice selected={period === "all_time"} title="All Time" description="Use every synced review" onClick={() => setPeriod("all_time")} /></div></div><div><h3 className="mb-3 font-semibold">Report language</h3><div className="flex gap-2"><Button type="button" variant={language === "en" ? "default" : "outline"} className="flex-1" onClick={() => setLanguage("en")}>English</Button><Button type="button" variant={language === "ar" ? "default" : "outline"} className="flex-1" onClick={() => setLanguage("ar")}>العربية</Button></div></div></div>}
        {step === 4 && <div className="space-y-3"><h3 className="font-semibold">Review your report</h3>{[["Type", reportType === "single" ? "Single business" : "Comparison", 1], ["Business(es)", selected.map((b) => b.name).join(", "), 2], ["Period", period === "this_month" ? "This Month" : "All Time", 3], ["Language", language === "en" ? "English" : "Arabic", 3]].map(([label, value, edit]) => <div key={String(label)} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div><Button variant="link" size="sm" disabled={generating} onClick={() => setStep(Number(edit))}>Edit</Button></div>)}{generating && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Analyzing reviews… this can take up to a minute.</p>}{info && <p className="flex gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground"><AlertCircle className="mt-0.5 size-4 shrink-0" />{info}</p>}{error && <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void generate()}>Retry</Button></div>}</div>}
      </div>
      <DialogFooter><Button variant="ghost" disabled={generating || step === 1} onClick={back}>Back</Button>{step < 4 ? <Button disabled={!canNext} onClick={next}>Next</Button> : <Button disabled={generating} onClick={() => void generate()}>{generating && <Loader2 className="animate-spin" />}Generate Report</Button>}</DialogFooter>
    </>}
  </DialogContent></Dialog>;
}
