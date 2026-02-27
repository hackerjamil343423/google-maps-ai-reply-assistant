import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/GetStarted?mode=login");
  }

  return children;
}
