import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/GetStarted?mode=login");
  }

  // Guard: send users who haven't finished onboarding back to it.
  // Only blocks when a profile row explicitly has onboardingCompleted=false
  // (existing users with no row at all are let through).
  if (db) {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { onboardingCompleted: true },
    });

    if (profile && profile.onboardingCompleted === false) {
      redirect("/onboarding");
    }
  }

  return children;
}
