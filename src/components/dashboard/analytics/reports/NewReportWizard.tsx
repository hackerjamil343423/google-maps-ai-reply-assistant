"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

export type ConnectedBusiness = {
  id: string;
  name: string;
  googleLocationId: string | null;
  connectedAt: string | null;
  syncedReviewCount: number;
};

export type ReportSummary = {
  id: string;
  businessId: string;
  businessName?: string;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
};

export type ComparisonSummary = {
  id: string;
  type: "comparison";
  businesses: Array<{ id: string; name: string }>;
  businessCount: number;
  generatedAt: string;
  reviewCount: number;
  periodStart: string;
  periodEnd: string;
};

export type HistoryItem =
  | (ReportSummary & { type: "single" })
  | ComparisonSummary;

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  businesses: ConnectedBusiness[];
  activeBusinessId?: string;
  onReportCreated(item: HistoryItem, detailHref: string): void;
};

type ReportType = "single" | "comparison";
type Period = "all_time" | "this_month";

function Choice({
  selected,
  disabled,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition-colors",
        selected
          ? "border-primary bg-secondary"
          : "border-border hover:border-primary/40 hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-white" : "border-border"
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export default function NewReportWizard({
  open,
  onOpenChange,
  businesses,
  activeBusinessId,
  onReportCreated,
}: Props) {
  const { language: uiLanguage } = useLanguage();
  const isArabic = uiLanguage === "ar";
  const text = (english: string, arabic: string) => (isArabic ? arabic : english);
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("this_month");
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">("en");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const singleCandidates = useMemo(
    () =>
      activeBusinessId
        ? businesses.filter((business) => business.id === activeBusinessId)
        : businesses,
    [activeBusinessId, businesses]
  );
  const eligibleSingle = useMemo(
    () => singleCandidates.filter((business) => business.syncedReviewCount > 0),
    [singleCandidates]
  );
  const selected = businesses.filter((business) =>
    selectedBusinessIds.includes(business.id)
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setReportType(null);
    setSelectedBusinessIds([]);
    setPeriod("this_month");
    setReportLanguage("en");
    setGenerating(false);
    setError("");
    setInfo("");
  }, [open]);

  function changeOpen(next: boolean) {
    if (!generating) onOpenChange(next);
  }

  function selectType(type: ReportType) {
    setReportType(type);
    setSelectedBusinessIds(
      type === "single" &&
        activeBusinessId &&
        eligibleSingle.some((business) => business.id === activeBusinessId)
        ? [activeBusinessId]
        : []
    );
    setError("");
    setInfo("");
  }

  function next() {
    if (step === 1 && reportType === "single" && eligibleSingle.length === 1) {
      setSelectedBusinessIds([eligibleSingle[0].id]);
      setStep(3);
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  }

  function back() {
    setStep((value) =>
      value === 3 && reportType === "single" && eligibleSingle.length === 1
        ? 1
        : Math.max(1, value - 1)
    );
    setError("");
    setInfo("");
  }

  function toggleBusiness(id: string) {
    if (reportType === "single") {
      setSelectedBusinessIds([id]);
      return;
    }
    setSelectedBusinessIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current
    );
  }

  const canNext =
    step === 1
      ? reportType !== null
      : step === 2
        ? reportType === "single"
          ? selectedBusinessIds.length === 1
          : selectedBusinessIds.length >= 2 && selectedBusinessIds.length <= 3
        : true;

  async function generate() {
    if (!reportType) return;
    setGenerating(true);
    setError("");
    setInfo("");

    try {
      const comparison = reportType === "comparison";
      const response = await fetch(
        comparison
          ? "/api/analytics/comparison-reports"
          : "/api/analytics/reports/url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            comparison
              ? { businessIds: selectedBusinessIds, period, language: reportLanguage }
              : {
                  businessId: selectedBusinessIds[0],
                  period,
                  language: reportLanguage,
                }
          ),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          setInfo(
            data.message ||
              text(
                "No reviews were found for this period.",
                "لم يتم العثور على تقييمات في هذه الفترة."
              )
          );
        } else {
          setError(
            data.error || text("Failed to generate report.", "تعذر إنشاء التقرير.")
          );
        }
        return;
      }

      const item: HistoryItem = comparison
        ? {
            id: data.id,
            type: "comparison",
            businesses: data.businesses,
            businessCount: data.businessCount ?? data.businesses.length,
            generatedAt: data.generatedAt,
            reviewCount: data.reviewCount,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
          }
        : {
            id: data.id,
            type: "single",
            businessId: data.businessId,
            businessName: data.businessName,
            generatedAt: data.generatedAt,
            reviewCount: data.reviewCount,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
          };

      onReportCreated(
        item,
        comparison
          ? `/dashboard/reports/comparisons/${data.id}`
          : `/dashboard/reports/${data.id}`
      );
      onOpenChange(false);
    } catch {
      setError(
        text(
          "An error occurred. Please try again.",
          "حدث خطأ. يرجى المحاولة مرة أخرى."
        )
      );
    } finally {
      setGenerating(false);
    }
  }

  const summaryRows: Array<[string, string, number]> = [
    [
      text("Type", "النوع"),
      reportType === "single"
        ? text("Single business", "نشاط واحد")
        : text("Comparison", "مقارنة"),
      1,
    ],
    [text("Business(es)", "الأنشطة"), selected.map((business) => business.name).join(", "), 2],
    [
      text("Period", "الفترة"),
      period === "this_month" ? text("This Month", "هذا الشهر") : text("All Time", "كل الوقت"),
      3,
    ],
    [
      text("Language", "اللغة"),
      reportLanguage === "en" ? text("English", "الإنجليزية") : text("Arabic", "العربية"),
      3,
    ],
  ];

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="sm:max-w-xl"
        onEscapeKeyDown={(event) => generating && event.preventDefault()}
        onInteractOutside={(event) => generating && event.preventDefault()}
        showCloseButton={!generating}
        closeLabel={text("Close", "إغلاق")}
      >
        {businesses.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-3 size-10 text-muted-foreground" />
            <DialogTitle>
              {text("Connect your Google Business", "اربط نشاطك التجاري على Google")}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {text(
                "Connect a business profile before generating reports.",
                "اربط ملف نشاط تجاري قبل إنشاء التقارير."
              )}
            </DialogDescription>
            <Button asChild className="mt-5">
              <Link href="/dashboard/settings">
                {text("Open Settings", "فتح الإعدادات")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{text("New Report", "تقرير جديد")}</DialogTitle>
              <DialogDescription>
                {text(
                  "Choose one option at a time. You can review everything before generation.",
                  "اختر خيارًا واحدًا في كل خطوة. يمكنك مراجعة كل شيء قبل إنشاء التقرير."
                )}
              </DialogDescription>
              <div
                className="flex gap-2 pt-2"
                aria-label={text(`Step ${step} of 4`, `الخطوة ${step} من 4`)}
              >
                {[1, 2, 3, 4].map((value) => (
                  <span
                    key={value}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      value <= step ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </DialogHeader>

            <div className="min-h-72 py-2">
              {step === 1 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    {text("What would you like to analyze?", "ما الذي ترغب في تحليله؟")}
                  </h3>
                  <Choice
                    selected={reportType === "single"}
                    title={text("Single business", "نشاط واحد")}
                    description={text(
                      "Deep-dive into one business's reviews",
                      "تحليل متعمق لتقييمات نشاط واحد"
                    )}
                    onClick={() => selectType("single")}
                  />
                  <Choice
                    selected={reportType === "comparison"}
                    disabled={businesses.length < 2}
                    title={text("Compare businesses", "مقارنة الأنشطة")}
                    description={
                      businesses.length < 2
                        ? text("Connect at least 2 businesses", "اربط نشاطين على الأقل")
                        : text(
                            "Side-by-side analysis of 2-3 businesses",
                            "تحليل مقارن لنشاطين أو ثلاثة أنشطة"
                          )
                    }
                    onClick={() => selectType("comparison")}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {reportType === "single"
                        ? text("Choose a business", "اختر نشاطًا")
                        : text("Choose 2-3 businesses", "اختر نشاطين أو ثلاثة")}
                    </h3>
                    {reportType === "comparison" && (
                      <span className="text-xs text-muted-foreground">
                        {text(
                          `${selectedBusinessIds.length}/3 selected`,
                          `تم اختيار ${selectedBusinessIds.length}/3`
                        )}
                      </span>
                    )}
                  </div>
                  {(reportType === "single" ? singleCandidates : businesses).map(
                    (business) => {
                      const disabled =
                        business.syncedReviewCount === 0 ||
                        (reportType === "comparison" &&
                          !selectedBusinessIds.includes(business.id) &&
                          selectedBusinessIds.length >= 3);
                      return (
                        <Choice
                          key={business.id}
                          selected={selectedBusinessIds.includes(business.id)}
                          disabled={disabled}
                          title={business.name}
                          description={
                            business.syncedReviewCount === 0
                              ? text("No synced reviews yet", "لا توجد تقييمات متزامنة بعد")
                              : text(
                                  `${business.syncedReviewCount} synced reviews`,
                                  `${business.syncedReviewCount} تقييم متزامن`
                                )
                          }
                          onClick={() => toggleBusiness(business.id)}
                        />
                      );
                    }
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h3 className="font-semibold">{text("Period", "الفترة")}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Choice
                        selected={period === "this_month"}
                        title={text("This Month", "هذا الشهر")}
                        description={text(
                          "Only reviews from this month",
                          "تقييمات هذا الشهر فقط"
                        )}
                        onClick={() => setPeriod("this_month")}
                      />
                      <Choice
                        selected={period === "all_time"}
                        title={text("All Time", "كل الوقت")}
                        description={text(
                          "Use every synced review",
                          "استخدام جميع التقييمات المتزامنة"
                        )}
                        onClick={() => setPeriod("all_time")}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 font-semibold">
                      {text("Report language", "لغة التقرير")}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={reportLanguage === "en" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setReportLanguage("en")}
                      >
                        {text("English", "الإنجليزية")}
                      </Button>
                      <Button
                        type="button"
                        variant={reportLanguage === "ar" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setReportLanguage("ar")}
                      >
                        {text("Arabic", "العربية")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    {text("Review your report", "راجع تقريرك")}
                  </h3>
                  {summaryRows.map(([label, value, edit]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        disabled={generating}
                        onClick={() => setStep(edit)}
                      >
                        {text("Edit", "تعديل")}
                      </Button>
                    </div>
                  ))}
                  {generating && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="animate-spin" />
                      {text(
                        "Analyzing reviews… this can take up to a minute.",
                        "جارٍ تحليل التقييمات… قد يستغرق ذلك دقيقة."
                      )}
                    </p>
                  )}
                  {info && (
                    <p className="flex gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      {info}
                    </p>
                  )}
                  {error && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      <span>{error}</span>
                      <Button variant="outline" size="sm" onClick={() => void generate()}>
                        {text("Retry", "إعادة المحاولة")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                disabled={generating || step === 1}
                onClick={back}
              >
                {text("Back", "السابق")}
              </Button>
              {step < 4 ? (
                <Button disabled={!canNext} onClick={next}>
                  {text("Next", "التالي")}
                </Button>
              ) : (
                <Button disabled={generating} onClick={() => void generate()}>
                  {generating && <Loader2 className="animate-spin" />}
                  {text("Generate Report", "إنشاء التقرير")}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
