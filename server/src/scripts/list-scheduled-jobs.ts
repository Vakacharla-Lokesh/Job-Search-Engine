import { ingestQueue } from "@/ingest/queue";

const repeatable = await ingestQueue.getRepeatableJobs();
console.log("Scheduled jobs:", JSON.stringify(repeatable, null, 2));
process.exit(0);
