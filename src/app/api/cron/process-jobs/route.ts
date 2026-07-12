import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { requeueStalledJobs } from "@/lib/jobs/queue";
import { runNextJob } from "@/lib/jobs/worker";

// Maximum jobs to process per invocation to stay within function timeout
const MAX_JOBS_PER_INVOCATION = 10;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Recover any jobs orphaned by crashed workers before processing new ones
  await requeueStalledJobs();

  const results: { jobId?: string; error?: string }[] = [];

  for (let i = 0; i < MAX_JOBS_PER_INVOCATION; i++) {
    const result = await runNextJob();
    if (!result.ran) break;
    results.push({ jobId: result.jobId, error: result.error });
  }

  return NextResponse.json({ processed: results.length, results });
}
