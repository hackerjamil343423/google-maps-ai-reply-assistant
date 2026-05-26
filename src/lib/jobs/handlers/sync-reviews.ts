import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import {
  getGoogleAccessTokenForWorkspace,
  syncWorkspaceReviewsFromAccessToken,
} from "@/lib/google/business-profile";
import { enqueueJob } from "../queue";

export async function handleSyncReviews(
  workspaceId: string
): Promise<{ synced: number; generated: number }> {
  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google access token unavailable for workspace.");
  }

  const result = await syncWorkspaceReviewsFromAccessToken(
    workspaceId,
    accessToken
  );

  let generated = 0;

  if (result.newReviewIds.length > 0 && db) {
    const settings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.workspaceId, workspaceId),
      columns: { approvalMode: true },
    });

    if (settings?.approvalMode === "auto") {
      for (const reviewId of result.newReviewIds) {
        await enqueueJob({
          workspaceId,
          type: "generate_reply",
          payload: { reviewId },
        });
        generated++;
      }
    }
  }

  return { synced: result.synced, generated };
}
