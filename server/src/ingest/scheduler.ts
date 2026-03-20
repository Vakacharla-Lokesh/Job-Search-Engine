// src/ingest/scheduler.ts
// Registers repeating BullMQ cron jobs for each ingest source.
// Called once at server startup — idempotent: BullMQ deduplicates by job name + pattern.

import { ingestQueue } from "@/ingest/queue";
import type { IngestSource } from "@/ingest/queue";

interface ScheduleEntry {
  source: Exclude<IngestSource, "all">;
  // Standard 5-field cron expression
  pattern: string;
  // Human-readable label for startup log
  label: string;
}

// Stagger start times within the hour to avoid simultaneous API bursts.
// All times are UTC.
const SCHEDULE: ScheduleEntry[] = [
  {
    source: "remotive",
    pattern: "0 */6 * * *", // Every 6h at :00
    label: "every 6h",
  },
  {
    source: "arbeitnow",
    pattern: "10 */6 * * *", // Every 6h at :10 — staggered 10min
    label: "every 6h (offset 10m)",
  },
  {
    source: "themuse",
    pattern: "20 */12 * * *", // Every 12h at :20 — staggered 20min
    label: "every 12h (offset 20m)",
  },
  {
    source: "adzuna",
    pattern: "30 */12 * * *", // Every 12h at :30 — staggered 30min
    label: "every 12h (offset 30m)",
  },
  {
    source: "hn",
    pattern: "0 9 1 * *", // 1st of every month at 09:00 UTC
    label: "monthly (1st at 09:00 UTC)",
  },
];

export async function registerIngestSchedules(): Promise<void> {
  console.log("[scheduler] Registering ingest schedules...");

  for (const entry of SCHEDULE) {
    await ingestQueue.add(
      // Stable job name — BullMQ uses name + pattern as the dedup key for repeats
      `ingest:${entry.source}`,
      { source: entry.source },
      {
        repeat: { pattern: entry.pattern },
        // Do not inherit queue-level attempts for scheduled jobs —
        // a transient failure shouldn't block the next scheduled run
        attempts: 2,
        backoff: { type: "exponential", delay: 120_000 },
      },
    );

    console.log(`[scheduler]  ✓ ${entry.source} — ${entry.label}`);
  }

  console.log("[scheduler] All ingest schedules registered");
}
