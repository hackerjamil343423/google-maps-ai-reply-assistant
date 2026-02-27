import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getRequestSession } from "@/lib/api/session";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { GOOGLE_BUSINESS_SCOPES, hasLinkedGoogleAccount } from "@/lib/google/business-profile";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  if (!db) {
    return NextResponse.json({
      configured,
      linkedAccount: false,
      connected: false,
      business: null,
      requiredScopes: GOOGLE_BUSINESS_SCOPES,
    });
  }

  const workspaceId = await ensureWorkspaceForUser(
    session.user.id,
    session.user.name
  );

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unable to initialize workspace." },
      { status: 500 }
    );
  }

  const linkedAccount = await hasLinkedGoogleAccount(session.user.id);

  const business = await db.query.businesses.findFirst({
    where: and(
      eq(businesses.workspaceId, workspaceId),
      eq(businesses.status, "active")
    ),
    orderBy: [desc(businesses.updatedAt)],
    columns: {
      id: true,
      name: true,
      googleLocationId: true,
      connectedAt: true,
      status: true,
    },
  });

  return NextResponse.json({
    configured,
    linkedAccount,
    connected: Boolean(business?.googleLocationId),
    business: business
      ? {
          id: business.id,
          name: business.name,
          googleLocationId: business.googleLocationId,
          connectedAt: business.connectedAt,
          status: business.status,
        }
      : null,
    requiredScopes: GOOGLE_BUSINESS_SCOPES,
  });
}
