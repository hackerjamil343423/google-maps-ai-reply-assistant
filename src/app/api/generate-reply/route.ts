import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateReviewReply } from "@/lib/ai/generate-review-reply";

const generateReplySchema = z.object({
  review: z.string().trim().min(1).max(4000),
  reviewerName: z.string().trim().max(120).optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  tone: z.string().trim().max(60).optional(),
  businessName: z.string().trim().max(120).optional(),
  customPrompt: z.string().trim().max(4000).optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = generateReplySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { reply, source } = await generateReviewReply(parsed.data);

    return NextResponse.json({ reply, source });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
