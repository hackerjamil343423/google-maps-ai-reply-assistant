import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const google = Array.isArray(params.google) ? params.google[0] : params.google;
  const target = google
    ? `/dashboard/settings?section=google&google=${encodeURIComponent(google)}`
    : "/dashboard/settings?section=google";

  redirect(target);
}
