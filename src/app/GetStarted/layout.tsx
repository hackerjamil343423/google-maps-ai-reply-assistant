import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) return <>{children}</>;

  // Authenticated users: send to onboarding if not completed, dashboard otherwise
  if (db) {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { onboardingCompleted: true },
    });

    if (!profile || profile.onboardingCompleted === false) {
      redirect("/onboarding");
    }
  }

  redirect("/dashboard/overview");
}
