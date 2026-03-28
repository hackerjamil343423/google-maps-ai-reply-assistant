# Google Maps Reviews Analysis Tool — Implementation Plan

## Overview

A new "Reviews Analysis" tool that allows users to select a connected Google Business and generate an AI-powered analysis report of their reviews using MiniMax M2.7. Each business is limited to **1 report per month**.

---

## Features

1. **Business Selector** — Dropdown to select from user's connected Google Businesses
2. **Generate Report Button** — Triggers analysis; disabled if report already generated this month
3. **Report History Table** — Shows past reports for the selected business (date, status, summary preview)
4. **View Report** — Expand/click a report to see full AI-generated analysis
5. **Monthly Limit Enforcement** — 1 report/business/month enforced via DB check + UI disable

---

## Data Model

### New Table: `reviewAnalysisReports`

```sql
CREATE TABLE reviewAnalysisReports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  businessId UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workspaceId UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  generatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  reportData JSONB NOT NULL,         -- Full AI report content
  reviewCount INTEGER NOT NULL,       -- How many reviews were analyzed
  periodStart TIMESTAMP NOT NULL,     -- Start of review period analyzed
  periodEnd TIMESTAMP NOT NULL,       -- End of review period analyzed
  UNIQUE(businessId, DATE_TRUNC('month', generatedAt))
);
```

### Report Data Shape (JSONB)

```typescript
interface ReportData {
  overall: {
    totalReviews: number;
    averageRating: number;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  commonThemes: Array<{ theme: string; count: number; examples: string[] }>;
  keyPhrases: string[];
  trends: {
    periodOverPeriod: 'improving' | 'declining' | 'stable';
    changePercent: number;
  };
  insights: string[];          // AI recommendations
  responseStats: {
    totalReplied: number;
    replyRatePercent: number;
  };
}
```

---

## File Structure

```
src/
  lib/
    ai/
      minimax.ts                    # MiniMax API client
      generate-analysis-report.ts   # Report generation logic
    reviews/
      analysis.ts                   # Data aggregation helpers

  app/
    api/
      analytics/
        reports/
          route.ts                  # GET list, POST create report
          [id]/
            route.ts               # GET single report
          [businessId]/
            can-generate/
              route.ts            # GET check monthly limit

    dashboard/
      analytics/
        reports/
          page.tsx                 # Main reports page (business selector + history + generation)
        page.tsx                   # Existing analytics → link to new reports page
```

---

## API Endpoints

### `GET /api/analytics/reports`
- **Query params:** `businessId` (required)
- **Returns:** List of all reports for that business (newest first)

### `POST /api/analytics/reports`
- **Body:** `{ businessId: string }`
- **Checks:** Monthly limit (1/business/month) — returns 429 if exceeded
- **Flow:**
  1. Fetch all reviews for business from DB
  2. Aggregate review data (rating distribution, themes, etc.)
  3. Send aggregated data + prompt to MiniMax M2.7
  4. Parse AI response into `ReportData` shape
  5. Save to `reviewAnalysisReports` table
  6. Return the new report

### `GET /api/analytics/reports/[id]`
- **Returns:** Single report by ID

### `GET /api/analytics/reports/[businessId]/can-generate`
- **Returns:** `{ canGenerate: boolean; reason?: string; lastReportAt?: string }`
- Checks if a report was already generated this calendar month

---

## Page: `/dashboard/analytics/reports`

### Layout Sections

1. **Header** — "Reviews Analysis" title + "How it works" info button
2. **Business Selector Card** — Dropdown of connected businesses
3. **Generate Report Card** — Shows if report can be generated, or countdown to next available
4. **Report History Table** — Columns: Date, Reviews Analyzed, Avg Rating, Actions

### UI States

| State | Display |
|-------|---------|
| No business selected | "Select a business above to get started" |
| Can generate | Green button "Generate Report" |
| Already generated this month | Disabled button + "Next report available: [date]" |
| Generating | Loading spinner + "Analyzing reviews..." |
| Report history empty | "No reports yet. Generate your first report above." |

---

## MiniMax Integration

- API base: `https://api.minimax.chat/v1`
- Model: `MiniMax-Text-01` (or `MiniMax-Text-01` for analysis)
- Use same pattern as OpenAI client in `src/lib/ai/minimax.ts`
- System prompt instructs the AI to output structured JSON matching `ReportData`
- Fallback: If MiniMax fails, return error (no template fallback needed for analysis)

---

## Monthly Limit Logic

```typescript
async function canGenerateReport(businessId: string): Promise<{
  canGenerate: boolean;
  reason?: string;
  lastReportAt?: Date;
}> {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastReport = await db.query.reviewAnalysisReports.findFirst({
    where: and(
      eq(reviewAnalysisReports.businessId, businessId),
      gte(reviewAnalysisReports.generatedAt, thisMonth)
    ),
    orderBy: desc(reviewAnalysisReports.generatedAt)
  });

  if (lastReport) {
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return { canGenerate: false, reason: `Report already generated this month. Next available: ${nextMonth.toLocaleDateString()}`, lastReportAt: lastReport.generatedAt };
  }

  return { canGenerate: true };
}
```

---

## Implementation Steps

1. Add `MINIMAX_API_KEY` to `src/lib/env.ts`
2. Add `reviewAnalysisReports` table to `src/lib/db/schema.ts`
3. Create `src/lib/ai/minimax.ts` — MiniMax API client
4. Create `src/lib/ai/generate-analysis-report.ts` — Report generation logic
5. Create `src/lib/reviews/analysis.ts` — Data aggregation helpers
6. Create `POST /api/analytics/reports` route
7. Create `GET /api/analytics/reports` route
8. Create `GET /api/analytics/reports/[id]` route
9. Create `GET /api/analytics/reports/[businessId]/can-generate` route
10. Create `src/components/dashboard/analytics/reports/ReportsPageClient.tsx`
11. Create `src/app/dashboard/analytics/reports/page.tsx`
12. Update `src/app/dashboard/analytics/page.tsx` to add link to new reports page
13. Run database migration

---

## Environment Variables

```env
MINIMAX_API_KEY=your_minimax_api_key_here
```

---

## Dependencies

No new packages required. MiniMax uses standard HTTP calls via `fetch` (built into Node.js 18+ and Next.js).
