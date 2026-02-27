import OpenAI from "openai";

import { env } from "@/lib/env";
import { TONE_OPTIONS, type ToneValue } from "@/lib/ai/default-settings";

const model = env.OPENAI_MODEL ?? "gpt-4.1-mini";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const TONE_TEMPLATES: Record<ToneValue, string> = {
  Professional:
    "Use polished, confident business language. Keep it clear, respectful, and trustworthy.",
  Friendly:
    "Sound warm, welcoming, and personal. Use approachable phrasing while staying professional.",
  Concise:
    "Use short, direct sentences with minimal filler. Keep the response compact and actionable.",
  Detailed:
    "Provide slightly richer detail and context while staying focused. Mention specific actions or follow-up steps.",
  Empathetic:
    "Acknowledge emotions clearly and validate the customer's experience before offering resolution or thanks.",
  Casual:
    "Use relaxed, natural language that still reflects good customer service and brand reliability.",
  Luxurious:
    "Use refined, premium language that feels elevated, attentive, and high-touch without sounding exaggerated.",
  Playful:
    "Use light, upbeat phrasing with subtle personality, while remaining appropriate and respectful.",
};

const VALID_TONES = new Set<string>(TONE_OPTIONS.map((item) => item.value));

function normalizeTone(value?: string): ToneValue {
  if (!value) return "Professional";
  return VALID_TONES.has(value) ? (value as ToneValue) : "Professional";
}

export interface GenerateReplyInput {
  review: string;
  reviewerName?: string;
  starRating?: number;
  tone?: string;
  businessName?: string;
  customPrompt?: string;
}

export interface GenerateReplyOutput {
  reply: string;
  source: "openai" | "template";
}

export async function generateReviewReply(
  input: GenerateReplyInput
): Promise<GenerateReplyOutput> {
  const review = input.review.trim();
  const reviewerName = input.reviewerName?.trim() || "there";
  const starRating = Number(input.starRating) || 5;
  const tone = normalizeTone(input.tone);
  const toneTemplate = TONE_TEMPLATES[tone];
  const businessName = input.businessName ?? "our team";

  const templateFallback = buildTemplateReply(
    review,
    reviewerName,
    starRating,
    tone
  );

  if (!openai) {
    return { reply: templateFallback, source: "template" };
  }

  const systemPrompt = [
    "You write concise, human-sounding Google review replies for businesses.",
    `Selected tone: ${tone}.`,
    `Tone template: ${toneTemplate}`,
    "Keep responses to 2-4 sentences.",
    "Always thank the reviewer and reference a specific detail when possible.",
    "For negative reviews: acknowledge, apologize, and offer a next step.",
    `Sign off with: Best regards, ${businessName}.`,
    input.customPrompt?.trim() ? `Extra instructions: ${input.customPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Reviewer name: ${reviewerName}`,
    `Star rating: ${starRating}`,
    `Review text: ${review}`,
    "Write one final reply only.",
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (reply) {
      return { reply, source: "openai" };
    }
  } catch {
    // Fallback below keeps existing demo and dashboard flows usable.
  }

  return { reply: templateFallback, source: "template" };
}

function buildTemplateReply(
  review: string,
  name: string,
  stars: number,
  tone: ToneValue
): string {
  const isPositive = stars >= 4;
  const isNeutral = stars === 3;
  const isNegative = stars <= 2;

  const mentionsService = /service|staff|team|employee|helped|help/i.test(review);
  const mentionsQuality = /quality|product|food|drink|meal|item/i.test(review);
  const mentionsWait = /wait|slow|long|time|quick|fast/i.test(review);
  const mentionsPrice = /price|cost|expensive|cheap|value|worth/i.test(review);
  const mentionsCleanliness = /clean|dirty|hygiene|tidy/i.test(review);

  if (isPositive) {
    let reply = `Thank you so much for your wonderful review, ${name}! `;
    reply += "We're absolutely thrilled to hear about your positive experience with us. ";

    if (mentionsService) {
      reply += "It's great to know our team made a lasting impression and we will pass along your kind words. ";
    }
    if (mentionsQuality) {
      reply += "We take great pride in quality and it means a lot when customers notice. ";
    }
    if (mentionsWait) {
      reply += "We're glad we could serve you efficiently. ";
    }

    reply += "We look forward to seeing you again soon.";
    return applyToneToTemplate(reply, tone);
  }

  if (isNeutral) {
    let reply = `Thank you for taking the time to share your feedback, ${name}. `;
    reply += "We're glad your experience was satisfactory, and we're always working to improve. ";

    if (mentionsWait) {
      reply += "We understand wait times matter and we're improving efficiency. ";
    }
    if (mentionsPrice) {
      reply += "We also continue working to provide strong value at our price point. ";
    }

    reply += "We hope to give you a five-star experience next time.";
    return applyToneToTemplate(reply, tone);
  }

  if (isNegative) {
    let reply = `Dear ${name}, thank you for bringing this to our attention. `;
    reply += "We're truly sorry your experience did not meet expectations. ";

    if (mentionsService) {
      reply += "We are addressing the service issue with our team immediately. ";
    }
    if (mentionsCleanliness) {
      reply += "Cleanliness is a top priority and we're correcting this right away. ";
    }
    if (mentionsWait) {
      reply += "We understand waiting is frustrating and are improving response times. ";
    }
    if (mentionsQuality) {
      reply += "We're reviewing this quality concern urgently. ";
    }

    reply += "Please reach out directly so we can make this right.";
    return applyToneToTemplate(reply, tone);
  }

  return applyToneToTemplate(
    `Thank you for your review, ${name}. We appreciate your feedback and hope to serve you again soon.`,
    tone
  );
}

function applyToneToTemplate(base: string, tone: ToneValue): string {
  if (tone === "Concise") {
    return base
      .replace("We're absolutely thrilled to hear about your positive experience with us. ", "")
      .replace("We're glad your experience was satisfactory, and we're always working to improve. ", "")
      .replace("We're truly sorry your experience did not meet expectations. ", "We're sorry your experience did not meet expectations. ");
  }

  if (tone === "Friendly") {
    return base.replace("Thank you so much", "Thanks so much");
  }

  if (tone === "Empathetic") {
    return base.replace("We're sorry", "We sincerely understand and are sorry");
  }

  if (tone === "Casual") {
    return base.replace("Thank you for taking the time to share your feedback", "Thanks for sharing your feedback");
  }

  if (tone === "Luxurious") {
    return base.replace("Thank you", "Thank you sincerely").replace("We look forward to seeing you again soon.", "We look forward to welcoming you back again soon.");
  }

  if (tone === "Playful") {
    return base.replace("We look forward to seeing you again soon.", "We can't wait to see you again soon.");
  }

  return base;
}
