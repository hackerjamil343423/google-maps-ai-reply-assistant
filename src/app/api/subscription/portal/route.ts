import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Payment provider not configured." }, { status: 503 });
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "Unable to initialize workspace." }, { status: 500 });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspaceId),
  });

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Please subscribe first." },
      { status: 404 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings?section=billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
