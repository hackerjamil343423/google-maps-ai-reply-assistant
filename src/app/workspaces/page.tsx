import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import WorkspacesPageClient from "./workspaces-page-client";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/GetStarted?mode=login&redirect=/workspaces");
  }

  return <WorkspacesPageClient />;
}
