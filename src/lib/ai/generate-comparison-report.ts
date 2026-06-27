import { createMiniMaxChatCompletion } from "@/lib/ai/minimax";

export type ComparisonLanguage = "en" | "ar";

export type ComparisonReviewInput = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: Date;
};

export type ComparisonBusinessInput = {
  id: string;
  name: string;
  reviews: ComparisonReviewInput[];
  responseStats: {
    totalReplied: number;
    replyRatePercent: number;
  };
};

export type ComparisonTrend = {
  periodOverPeriod: "improving" | "declining" | "stable";
  changePercent: number;
};

export type BusinessComparisonMetrics = {
  businessId: string;
  businessName: string;
  totalReviews: number;
  averageRating: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  responseStats: {
    totalReplied: number;
    replyRatePercent: number;
  };
  trends: ComparisonTrend;
};

export type ComparisonRecommendation = {
  priority: "high" | "medium" | "low";
  businessId?: string;
  businessName?: string;
  recommendation: string;
};

export type ComparisonReportData = {
  businesses: BusinessComparisonMetrics[];
  executiveSummary: string;
  metricLeaders: Array<{
    metric: string;
    businessId: string;
    businessName: string;
    reason: string;
  }>;
  sharedThemes: string[];
  businessStrengths: Array<{
    businessId: string;
    businessName: string;
    strengths: string[];
  }>;
  risks: Array<{
    businessId: string;
    businessName: string;
    risks: string[];
  }>;
  recommendations: ComparisonRecommendation[];
};

type AiComparisonSections = Omit<ComparisonReportData, "businesses">;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function truncate(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

function averageRating(reviews: ComparisonReviewInput[]) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return round(sum / reviews.length);
}

function buildRatingDistribution(reviews: ComparisonReviewInput[]) {
  const distribution: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  for (const review of reviews) {
    const rating = String(Math.min(5, Math.max(1, Math.round(review.rating)))) as keyof typeof distribution;
    distribution[rating] += 1;
  }

  return distribution;
}

function computeTrend(reviews: ComparisonReviewInput[]): ComparisonTrend {
  if (reviews.length < 4) {
    return { periodOverPeriod: "stable", changePercent: 0 };
  }

  const sorted = [...reviews].sort(
    (a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime()
  );
  const midpoint = Math.floor(sorted.length / 2);
  const olderAverage = averageRating(sorted.slice(0, midpoint));
  const newerAverage = averageRating(sorted.slice(midpoint));
  const delta = newerAverage - olderAverage;

  if (Math.abs(delta) < 0.15) {
    return { periodOverPeriod: "stable", changePercent: 0 };
  }

  const changePercent = Math.round((delta / Math.max(olderAverage, 1)) * 100);

  return {
    periodOverPeriod: delta > 0 ? "improving" : "declining",
    changePercent,
  };
}

function buildBusinessMetrics(
  business: ComparisonBusinessInput
): BusinessComparisonMetrics {
  const ratingDistribution = buildRatingDistribution(business.reviews);
  const sentimentBreakdown = {
    positive: ratingDistribution["4"] + ratingDistribution["5"],
    neutral: ratingDistribution["3"],
    negative: ratingDistribution["1"] + ratingDistribution["2"],
  };

  return {
    businessId: business.id,
    businessName: business.name,
    totalReviews: business.reviews.length,
    averageRating: averageRating(business.reviews),
    sentimentBreakdown,
    ratingDistribution,
    responseStats: business.responseStats,
    trends: computeTrend(business.reviews),
  };
}

function defaultAiSections(metrics: BusinessComparisonMetrics[]): AiComparisonSections {
  const bestRated = [...metrics].sort((a, b) => b.averageRating - a.averageRating)[0];
  const bestReplyRate = [...metrics].sort(
    (a, b) => b.responseStats.replyRatePercent - a.responseStats.replyRatePercent
  )[0];

  return {
    executiveSummary:
      "The selected businesses have enough review data for a side-by-side comparison. Use the metric leaders and recommendations below to prioritize reputation improvements.",
    metricLeaders: [
      bestRated
        ? {
            metric: "Average rating",
            businessId: bestRated.businessId,
            businessName: bestRated.businessName,
            reason: `${bestRated.businessName} has the highest average rating at ${bestRated.averageRating}.`,
          }
        : null,
      bestReplyRate
        ? {
            metric: "Reply rate",
            businessId: bestReplyRate.businessId,
            businessName: bestReplyRate.businessName,
            reason: `${bestReplyRate.businessName} has the strongest reply coverage at ${bestReplyRate.responseStats.replyRatePercent}%.`,
          }
        : null,
    ].filter(Boolean) as AiComparisonSections["metricLeaders"],
    sharedThemes: [],
    businessStrengths: metrics.map((metric) => ({
      businessId: metric.businessId,
      businessName: metric.businessName,
      strengths: [],
    })),
    risks: metrics.map((metric) => ({
      businessId: metric.businessId,
      businessName: metric.businessName,
      risks: [],
    })),
    recommendations: [
      {
        priority: "high",
        recommendation:
          "Review the lowest-rated themes and improve response coverage before the next reporting period.",
      },
    ],
  };
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePriority(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeAiSections(
  raw: unknown,
  metrics: BusinessComparisonMetrics[]
): AiComparisonSections {
  const fallback = defaultAiSections(metrics);
  if (!raw || typeof raw !== "object") return fallback;

  const data = raw as Record<string, unknown>;

  return {
    executiveSummary:
      typeof data.executiveSummary === "string" && data.executiveSummary.trim()
        ? data.executiveSummary.trim()
        : fallback.executiveSummary,
    metricLeaders: safeArray<Record<string, unknown>>(data.metricLeaders)
      .map((item) => ({
        metric: typeof item.metric === "string" ? item.metric : "Metric leader",
        businessId: typeof item.businessId === "string" ? item.businessId : "",
        businessName:
          typeof item.businessName === "string" ? item.businessName : "Business",
        reason: typeof item.reason === "string" ? item.reason : "",
      }))
      .filter((item) => item.businessId && item.reason)
      .slice(0, 6),
    sharedThemes: safeArray<unknown>(data.sharedThemes)
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8),
    businessStrengths: safeArray<Record<string, unknown>>(data.businessStrengths)
      .map((item) => ({
        businessId: typeof item.businessId === "string" ? item.businessId : "",
        businessName:
          typeof item.businessName === "string" ? item.businessName : "Business",
        strengths: safeArray<unknown>(item.strengths)
          .filter((strength): strength is string => typeof strength === "string")
          .map((strength) => strength.trim())
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((item) => item.businessId)
      .slice(0, metrics.length),
    risks: safeArray<Record<string, unknown>>(data.risks)
      .map((item) => ({
        businessId: typeof item.businessId === "string" ? item.businessId : "",
        businessName:
          typeof item.businessName === "string" ? item.businessName : "Business",
        risks: safeArray<unknown>(item.risks)
          .filter((risk): risk is string => typeof risk === "string")
          .map((risk) => risk.trim())
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((item) => item.businessId)
      .slice(0, metrics.length),
    recommendations: safeArray<Record<string, unknown>>(data.recommendations)
      .map((item) => ({
        priority: normalizePriority(item.priority),
        businessId: typeof item.businessId === "string" ? item.businessId : undefined,
        businessName:
          typeof item.businessName === "string" ? item.businessName : undefined,
        recommendation:
          typeof item.recommendation === "string" ? item.recommendation.trim() : "",
      }))
      .filter((item) => item.recommendation)
      .slice(0, 8),
  };
}

function parseJsonResponse(rawContent: string) {
  let jsonString = rawContent.replace(/<[^>]*>/g, "").trim();

  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }

  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }

  jsonString = jsonString.trim();

  try {
    return JSON.parse(jsonString);
  } catch {
    const match = jsonString.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in comparison report response");
    return JSON.parse(match[0]);
  }
}

function buildComparisonPrompt(args: {
  businesses: ComparisonBusinessInput[];
  metrics: BusinessComparisonMetrics[];
  language: ComparisonLanguage;
  periodStart: Date;
  periodEnd: Date;
}) {
  const examplesByBusiness = args.businesses.map((business) => ({
    businessId: business.id,
    businessName: business.name,
    positiveExamples: business.reviews
      .filter((review) => review.rating >= 4)
      .slice(0, 5)
      .map((review) => ({
        rating: review.rating,
        text: truncate(review.text, 220),
      })),
    negativeExamples: business.reviews
      .filter((review) => review.rating <= 2)
      .slice(0, 5)
      .map((review) => ({
        rating: review.rating,
        text: truncate(review.text, 220),
      })),
  }));

  const outputLanguage =
    args.language === "ar"
      ? "Write every user-facing string in Arabic."
      : "Write every user-facing string in English.";

  return `You are an expert business analyst for Google Business Profile reviews.

${outputLanguage}

Compare the selected businesses using the fixed metrics below. Do not invent or modify metrics. Your job is to explain what the metrics and review examples imply.

Period: ${args.periodStart.toISOString().split("T")[0]} to ${args.periodEnd.toISOString().split("T")[0]}

Fixed metrics:
${JSON.stringify(args.metrics, null, 2)}

Review examples:
${JSON.stringify(examplesByBusiness, null, 2)}

Return ONLY valid JSON with this shape:
{
  "executiveSummary": string,
  "metricLeaders": [{ "metric": string, "businessId": string, "businessName": string, "reason": string }],
  "sharedThemes": string[],
  "businessStrengths": [{ "businessId": string, "businessName": string, "strengths": string[] }],
  "risks": [{ "businessId": string, "businessName": string, "risks": string[] }],
  "recommendations": [{ "priority": "high" | "medium" | "low", "businessId"?: string, "businessName"?: string, "recommendation": string }]
}`;
}

export async function generateBusinessComparisonReport(args: {
  businesses: ComparisonBusinessInput[];
  language: ComparisonLanguage;
  periodStart: Date;
  periodEnd: Date;
}): Promise<{ reportData: ComparisonReportData; reviewCount: number }> {
  const metrics = args.businesses.map(buildBusinessMetrics);
  const prompt = buildComparisonPrompt({ ...args, metrics });

  const completion = await createMiniMaxChatCompletion({
    model: "MiniMax-M2.7",
    messages: [
      {
        role: "system",
        content:
          "You are an expert business analyst. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 8000,
  });

  const rawContent = completion.choices[0]?.message?.content ?? "";
  const aiSections = normalizeAiSections(parseJsonResponse(rawContent), metrics);

  return {
    reportData: {
      businesses: metrics,
      ...aiSections,
    },
    reviewCount: metrics.reduce((total, metric) => total + metric.totalReviews, 0),
  };
}
