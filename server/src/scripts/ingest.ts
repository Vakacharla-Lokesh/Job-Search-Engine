/**
 * Manual ingest trigger — Phase 1 / Phase 5 CLI
 * Delegates to the shared ingest pipeline. Does NOT duplicate source logic.
 *
 * Usage:
 *   bun run src/scripts/ingest.ts
 *   bun run src/scripts/ingest.ts --source remotive
 *   bun run src/scripts/ingest.ts --source hn
 */

import { fetchRemotive } from "@/ingest/sources/remotive";
import { fetchHNWhosHiring } from "@/ingest/sources/hn";
import { fetchArbeitnow } from "@/ingest/sources/arbeitnow";
import { fetchTheMuse } from "@/ingest/sources/themuse";
import { fetchAdzuna } from "@/ingest/sources/adzuna";
import { runPipeline } from "@/ingest/pipeline";
import { esClient } from "@/lib/elasticsearch";
import { env } from "@/env";
import type { JobDocument } from "@/types/job";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sourceArg =
    args.find((a) => a.startsWith("--source="))?.split("=")[1] ??
    args[args.indexOf("--source") + 1];

  console.log("🚀 Starting manual ingestion\n");

  const rawJobs: JobDocument[] = [];

  if (!sourceArg || sourceArg === "remotive")
    rawJobs.push(...(await fetchRemotive()));
  if (!sourceArg || sourceArg === "hn")
    rawJobs.push(...(await fetchHNWhosHiring()));
  if (!sourceArg || sourceArg === "arbeitnow")
    rawJobs.push(...(await fetchArbeitnow()));
  if (!sourceArg || sourceArg === "themuse")
    rawJobs.push(...(await fetchTheMuse()));
  if (!sourceArg || sourceArg === "adzuna")
    rawJobs.push(...(await fetchAdzuna()));

  console.log(`\n📊 Total raw: ${rawJobs.length}`);

  const result = await runPipeline(rawJobs);
  console.log(
    `\n✅ fetched=${result.fetched} indexed=${result.indexed} skipped=${result.skipped} errors=${result.errors}`,
  );

  const countResult = await esClient.count({ index: env.esIndex });
  console.log(`📈 Total in index: ${countResult.count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
