// Paste in a quick bun script: src/scripts/test-ingest-queue.ts
import { ingestQueue } from "@/ingest/queue";
await ingestQueue.add("manual", { source: "remotive" });
console.log("Job enqueued");
process.exit(0);
