import { createMiniMaxChatCompletion } from "@/lib/ai/minimax";
import { aggregateReviewsForBusiness, type AggregatedReviewData } from "@/lib/reviews/analysis";

export interface ReportData {
  overall: {
    totalReviews: number;
    averageRating: number;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    ratingDistribution: Record<number, number>;
  };
  commonThemes: Array<{ theme: string; count: number; examples: string[] }>;
  keyPhrases: string[];
  trends: {
    periodOverPeriod: "improving" | "declining" | "stable";
    changePercent: number;
  };
  insights: string[];
  responseStats: {
    totalReplied: number;
    replyRatePercent: number;
  };
}

function buildAnalysisPrompt(data: AggregatedReviewData): string {
  const sentimentBreakdown = {
    positive: data.ratingDistribution[5] + data.ratingDistribution[4],
    neutral: data.ratingDistribution[3],
    negative: data.ratingDistribution[2] + data.ratingDistribution[1],
  };

  const positiveExamples = data.reviews
    .filter((r) => r.rating >= 4)
    .slice(0, 5)
    .map((r) => `- "${r.text.substring(0, 200)}" (${r.rating}★ by ${r.authorName})`);

  const negativeExamples = data.reviews
    .filter((r) => r.rating <= 2)
    .slice(0, 5)
    .map((r) => `- "${r.text.substring(0, 200)}" (${r.rating}★ by ${r.authorName})`);

  return `You are an expert business analyst specializing in Google Business Profile reviews.

Analyze the following review data and generate a comprehensive report in JSON format.

## REVIEW DATA SUMMARY
- Total Reviews: ${data.totalCount}
- Average Rating: ${data.averageRating}/5
- Rating Distribution: 5★=${data.ratingDistribution[5]}, 4★=${data.ratingDistribution[4]}, 3★=${data.ratingDistribution[3]}, 2★=${data.ratingDistribution[2]}, 1★=${data.ratingDistribution[1]}
- Reviews with Replies: ${data.repliedCount} (${data.totalCount > 0 ? Math.round((data.repliedCount / data.totalCount) * 100) : 0}%)
- Period: ${data.periodStart.toISOString().split("T")[0]} to ${data.periodEnd.toISOString().split("T")[0]}

## POSITIVE REVIEW EXAMPLES
${positiveExamples.length > 0 ? positiveExamples.join("\n") : "(No positive reviews)"}

## NEGATIVE REVIEW EXAMPLES
${negativeExamples.length > 0 ? negativeExamples.join("\n") : "(No negative reviews)"}

## INSTRUCTIONS
Analyze all reviews and return a structured JSON report with:

1. **overall**: Overall summary with totalReviews, averageRating, sentimentBreakdown (positive/neutral/negative counts based on star ratings: 4-5=positive, 3=neutral, 1-2=negative), and ratingDistribution

2. **commonThemes**: Array of up to 5 most common themes found in reviews. Each theme should have:
   - theme: A short label (e.g., "Service Quality", "Wait Time", "Cleanliness")
   - count: How many reviews mention this theme
   - examples: Array of 2-3 short example snippets from actual reviews

3. **keyPhrases**: Array of 5-10 most impactful or memorable short phrases/quotes from reviews

4. **trends**: Analyze if the reviews show improving, declining, or stable patterns. Include changePercent (estimated % change in average rating or sentiment from older to newer reviews)

5. **insights**: Array of 3-5 actionable business recommendations based on patterns found in the reviews

6. **responseStats**: Include totalReplied and replyRatePercent

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the raw JSON object.

Return format:
{
  "overall": { "totalReviews": number, "averageRating": number, "sentimentBreakdown": { "positive": number, "neutral": number, "negative": number }, "ratingDistribution": { "1": number, "2": number, "3": number, "4": number, "5": number } },
  "commonThemes": [{ "theme": string, "count": number, "examples": string[] }],
  "keyPhrases": string[],
  "trends": { "periodOverPeriod": "improving" | "declining" | "stable", "changePercent": number },
  "insights": string[],
  "responseStats": { "totalReplied": number, "replyRatePercent": number }
}`;
}

export async function generateAnalysisReport(
  businessId: string
): Promise<{ reportData: ReportData; reviewCount: number }> {
  const aggregatedData = await aggregateReviewsForBusiness(businessId);

  if (aggregatedData.totalCount === 0) {
    return {
      reportData: {
        overall: {
          totalReviews: 0,
          averageRating: 0,
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        commonThemes: [],
        keyPhrases: [],
        trends: { periodOverPeriod: "stable", changePercent: 0 },
        insights: ["No reviews available to analyze."],
        responseStats: { totalReplied: 0, replyRatePercent: 0 },
      },
      reviewCount: 0,
    };
  }

  const prompt = buildAnalysisPrompt(aggregatedData);

  try {
    const completion = await createMiniMaxChatCompletion({
      model: "MiniMax-Text-01",
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
      temperature: 0.3,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";

    // Strip markdown code blocks if present
    let jsonString = rawContent;
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    }
    if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    const parsed = JSON.parse(jsonString) as ReportData;

    return {
      reportData: parsed,
      reviewCount: aggregatedData.totalCount,
    };
  } catch (error) {
    console.error("MiniMax analysis failed:", error);
    throw error;
  }
}
