import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { review, reviewerName, starRating } = await req.json();

    if (!review || typeof review !== "string" || review.trim().length === 0) {
      return NextResponse.json(
        { error: "Review text is required" },
        { status: 400 }
      );
    }

    const name = reviewerName?.trim() || "there";
    const stars = Number(starRating) || 5;

    // Build a prompt and call an AI API.
    // Replace the block below with your preferred AI provider (OpenAI, Anthropic, etc.).
    // For now we generate a smart template-based reply so the demo works out of the box.
    const reply = buildTemplateReply(review.trim(), name, stars);

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}

function buildTemplateReply(
  review: string,
  name: string,
  stars: number
): string {
  const isPositive = stars >= 4;
  const isNeutral = stars === 3;
  const isNegative = stars <= 2;

  const reviewLower = review.toLowerCase();

  // Detect topics mentioned
  const mentionsService = /service|staff|team|employee|helped|help/i.test(review);
  const mentionsQuality = /quality|product|food|drink|meal|item/i.test(review);
  const mentionsWait = /wait|slow|long|time|quick|fast/i.test(review);
  const mentionsPrice = /price|cost|expensive|cheap|value|worth/i.test(review);
  const mentionsCleanliness = /clean|dirty|hygiene|tidy/i.test(review);

  if (isPositive) {
    let reply = `Thank you so much for your wonderful review, ${name}! `;
    reply += `We're absolutely thrilled to hear about your positive experience with us. `;

    if (mentionsService) {
      reply += `It's great to know our team made a lasting impression — we'll be sure to pass on your kind words. `;
    }
    if (mentionsQuality) {
      reply += `We take great pride in our quality and it means the world when our customers notice. `;
    }
    if (mentionsWait) {
      reply += `We're glad we could serve you efficiently! `;
    }

    reply += `Your satisfaction is our top priority and reviews like yours motivate us to keep delivering the best experience possible. `;
    reply += `We look forward to seeing you again soon!`;
    return reply;
  }

  if (isNeutral) {
    let reply = `Thank you for taking the time to share your feedback, ${name}. `;
    reply += `We're glad your experience was satisfactory, but we always strive to do better. `;

    if (mentionsWait) {
      reply += `We apologize if our wait times didn't meet your expectations — we're continuously working on improving our efficiency. `;
    }
    if (mentionsPrice) {
      reply += `We understand price is important and we work hard to provide the best value possible. `;
    }

    reply += `We'd love the opportunity to give you a truly excellent experience on your next visit. `;
    reply += `Please don't hesitate to reach out to us directly so we can address any concerns. We hope to see you again!`;
    return reply;
  }

  if (isNegative) {
    let reply = `Dear ${name}, thank you for bringing this to our attention. `;
    reply += `We sincerely apologize that your experience did not meet your expectations — this is not the standard we hold ourselves to. `;

    if (mentionsService) {
      reply += `We're sorry to hear about the service issues you encountered and we are taking this very seriously with our team. `;
    }
    if (mentionsCleanliness) {
      reply += `Cleanliness is a top priority for us and we're addressing this matter immediately. `;
    }
    if (mentionsWait) {
      reply += `We understand that waiting is frustrating and we're actively working on improving our response times. `;
    }
    if (mentionsQuality) {
      reply += `We're disappointed to hear the quality wasn't up to par and we'll be investigating this right away. `;
    }

    reply += `We would very much like the opportunity to make this right for you. `;
    reply += `Please reach out to us directly so we can resolve this personally. Your feedback helps us improve and we truly value your input.`;
    return reply;
  }

  // Fallback
  void reviewLower;
  return `Thank you for your review, ${name}. We appreciate you taking the time to share your experience with us. Your feedback is invaluable and helps us continue to improve. We hope to have the pleasure of serving you again soon!`;
}
