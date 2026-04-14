import {
  getGoogleAccessTokenForWorkspace,
  syncWorkspaceReviewsFromAccessToken,
} from "@/lib/google/business-profile";

export async function handleSyncReviews(
  workspaceId: string
): Promise<{ synced: number }> {
  const accessToken = await getGoogleAccessTokenForWorkspace(workspaceId);
  if (!accessToken) {
    throw new Error("Google access token unavailable for workspace.");
  }

  const result = await syncWorkspaceReviewsFromAccessToken(
    workspaceId,
    accessToken
  );

  return { synced: result.synced };
}
