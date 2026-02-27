import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Runtime auto translation is disabled. The app now uses fixed, manual translations only.",
    },
    { status: 410 }
  );
}
