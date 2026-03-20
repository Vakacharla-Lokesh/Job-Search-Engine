// src/ingest/worker.ts
import { Worker, type Job } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { runPipeline } from "@/ingest/pipeline";
import { matchAlerts } from "@/ingest/alertMatcher";
import { fetchRemotive } from "@/ingest/sources/remotive";
import { fetchHNWhosHiring } from "@/ingest/sources/hn";
import { fetchArbeitnow } from "@/ingest/sources/arbeitnow";
import { fetchTheMuse } from "@/ingest/sources/themuse";
import { fetchAdzuna } from "@/ingest/sources/adzuna";
import type { IngestJobData, IngestSource } from "@/ingest/queue";
import type { JobDocument } from "@/types/job";

const SOURCE_FETCHERS: Record<
  Exclude<IngestSource, "all">,
  () => Promise<JobDocument[]>
> = {
  remotive: fetchRemotive,
  hn: fetchHNWhosHiring,
  arbeitnow: fetchArbeitnow,
  themuse: fetchTheMuse,
  adzuna: fetchAdzuna,
};

async function processIngestJob(job: Job<IngestJobData>): Promise<void> {
  const { source } = job.data;
  console.log(`[ingest:worker] Starting job ${job.id} — source: ${source}`);

  const sources: Array<Exclude<IngestSource, "all">> =
    source === "all"
      ? ["remotive", "hn", "arbeitnow", "themuse", "adzuna"]
      : [source];

  let totalFetched = 0;
  let totalIndexed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const src of sources) {
    const fetcher = SOURCE_FETCHERS[src];

    try {
      console.log(`[ingest:worker] Fetching ${src}...`);
      const rawJobs = await fetcher();
      const result = await runPipeline(rawJobs);

      totalFetched += result.fetched;
      totalIndexed += result.indexed;
      totalSkipped += result.skipped;
      totalErrors += result.errors;

      console.log(
        `[ingest:worker] ${src}: fetched=${result.fetched} indexed=${result.indexed} skipped=${result.skipped} errors=${result.errors}`,
      );

      // Match alerts for newly indexed jobs from this source
      if (result.newJobs.length > 0) {
        await matchAlerts(result.newJobs);
      }
    } catch (err) {
      console.error(`[ingest:worker] ${src} failed:`, (err as Error).message);
      totalErrors++;
    }
  }

  console.log(
    `[ingest:worker] Job ${job.id} complete — fetched=${totalFetched} indexed=${totalIndexed} skipped=${totalSkipped} errors=${totalErrors}`,
  );
}

export function createIngestWorker(): Worker<IngestJobData> {
  const worker = new Worker<IngestJobData>("ingest", processIngestJob, {
    connection: redisConnection,
    concurrency: 1,
  });

  worker.on("completed", (job) => {
    console.log(`[ingest:worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[ingest:worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
