"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import NewReportWizard, { type ComparisonSummary, type ConnectedBusiness, type HistoryItem, type ReportSummary } from "@/components/dashboard/analytics/reports/NewReportWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessContext } from "@/lib/business-context";

export default function ReportsPageClient() {
  const router = useRouter();
  const { activeBusiness } = useBusinessContext();
  const [businesses, setBusinesses] = useState<ConnectedBusiness[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [comparisonReports, setComparisonReports] = useState<ComparisonSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingComparisonReports, setLoadingComparisonReports] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/analytics/businesses", { cache: "no-store" }).then(async (res) => res.ok ? res.json() as Promise<{ businesses: ConnectedBusiness[] }> : { businesses: [] }).then((data) => { if (mounted) setBusinesses(data.businesses ?? []); }).catch(() => null);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/analytics/reports/url/history", { cache: "no-store" }).then(async (res) => res.ok ? res.json() as Promise<{ reports: ReportSummary[] }> : null).then((data) => { if (mounted && data) setReports(data.reports); }).catch(() => null).finally(() => { if (mounted) setLoadingReports(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/analytics/comparison-reports/history", { cache: "no-store" }).then(async (res) => res.ok ? res.json() as Promise<{ reports: ComparisonSummary[] }> : null).then((data) => { if (mounted && data) setComparisonReports(data.reports); }).catch(() => null).finally(() => { if (mounted) setLoadingComparisonReports(false); });
    return () => { mounted = false; };
  }, []);

  const historyItems = useMemo<HistoryItem[]>(() => {
    const singles = (activeBusiness ? reports.filter((report) => report.businessId === activeBusiness.id) : reports).map((report) => ({ ...report, type: "single" as const }));
    const comparisons = activeBusiness ? comparisonReports.filter((report) => report.businesses.some((business) => business.id === activeBusiness.id)) : comparisonReports;
    return [...singles, ...comparisons].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [activeBusiness, comparisonReports, reports]);

  function handleCreated(item: HistoryItem, detailHref: string) {
    if (item.type === "comparison") setComparisonReports((current) => [item, ...current]);
    else { const { type: _type, ...summary } = item; void _type; setReports((current) => [summary, ...current]); }
    router.push(detailHref);
  }

  return <DashboardShell activeHref="/dashboard/reports"><div>
    <div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold text-[#040404] md:text-3xl">AI Reviews Analysis</h2><Button data-tour="new-report-button" onClick={() => setWizardOpen(true)}><Plus />New Report</Button></div>
    <section data-tour="report-history" className="rounded-2xl border border-[#E6E9F8] bg-white p-5"><h3 className="mb-4 text-sm font-semibold text-[#040404]">Report History</h3>
      {loadingReports || loadingComparisonReports ? <div className="space-y-3">{[1,2,3].map((row) => <div key={row} className="flex items-center gap-4 rounded-2xl border border-border p-4"><Skeleton className="size-10 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div> : historyItems.length === 0 ? <div className="py-10 text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" /><p className="font-medium">No reports yet</p><p className="mt-1 text-sm text-muted-foreground">Generate your first AI review analysis.</p><Button className="mt-4" onClick={() => setWizardOpen(true)}><Plus />Generate your first report</Button></div> : <div className="space-y-3">{historyItems.map((report) => { const comparison = report.type === "comparison"; const title = comparison ? report.businesses.map((business) => business.name).join(" vs ") : report.businessName || "Google Business"; return <button key={`${report.type}-${report.id}`} type="button" onClick={() => router.push(comparison ? `/dashboard/reports/comparisons/${report.id}` : `/dashboard/reports/${report.id}`)} className="flex w-full items-center justify-between rounded-2xl border border-[#E6E9F8] p-4 text-start transition-all hover:border-primary/30 hover:bg-muted"><div className="flex min-w-0 items-center gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><FileText /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{title}</p>{comparison && <Badge variant="secondary">Comparison</Badge>}</div><p className="mt-0.5 text-xs text-muted-foreground">{report.reviewCount} reviews · {new Date(report.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p></div></div><span aria-hidden className="text-muted-foreground rtl:rotate-180">›</span></button>; })}</div>}
    </section>
    <NewReportWizard open={wizardOpen} onOpenChange={setWizardOpen} businesses={businesses} activeBusinessId={activeBusiness?.id} onReportCreated={handleCreated} />
  </div></DashboardShell>;
}
