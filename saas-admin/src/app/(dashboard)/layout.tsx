import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { adminAuth } from "@/lib/auth/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminShell from "@/components/AdminShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Verify admin status — fail closed if database is unavailable
  if (!db) redirect("/login");

  const [adminUser] = await db
    .select({ isAdmin: user.isAdmin, suspended: user.suspended })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!adminUser || !adminUser.isAdmin || adminUser.suspended) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
