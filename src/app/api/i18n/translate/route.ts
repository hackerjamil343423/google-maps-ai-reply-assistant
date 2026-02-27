import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  target: z.enum(["ar", "en"]).default("ar"),
  texts: z.array(z.string().trim().min(1).max(2000)).min(1).max(120),
});

function parseGoogleTranslateResponse(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null;

  const rows = payload[0] as unknown[];
  const parts: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const value = row[0];
    if (typeof value === "string") parts.push(value);
  }

  if (parts.length === 0) return null;
  return parts.join("");
}

async function translateText(text: string, target: "ar" | "en") {
  const endpoint =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(endpoint, {
    cache: "no-store",
  });

  if (!res.ok) {
    return text;
  }

  const payload = (await res.json().catch(() => null)) as unknown;
  return parseGoogleTranslateResponse(payload) ?? text;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const uniqueTexts = [...new Set(parsed.data.texts)];
  const translations: Record<string, string> = {};

  await Promise.all(
    uniqueTexts.map(async (text) => {
      const translated = await translateText(text, parsed.data.target);
      translations[text] = translated;
    })
  );

  return NextResponse.json({ translations });
}
