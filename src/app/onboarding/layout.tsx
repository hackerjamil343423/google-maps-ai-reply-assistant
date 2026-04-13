import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/GetStarted?mode=login");
  }

  if (db) {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { onboardingCompleted: true },
    });

    if (profile?.onboardingCompleted === true) {
      redirect("/dashboard/analytics");
    }
  }

  return <>{children}</>;
}
