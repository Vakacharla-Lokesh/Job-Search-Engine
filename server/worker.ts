import { connectMongoDB } from "@/lib/mongodb";
import { connectElasticsearch } from "@/lib/elasticsearch";
import { createIngestWorker } from "@/ingest/worker";
import { createWebhookWorker } from "@/workers/webhookWorker";
import { registerIngestSchedules } from "@/ingest/scheduler";

async function startWorkers(): Promise<void> {
  await connectMongoDB();
  await connectElasticsearch();
  createIngestWorker();
  createWebhookWorker();
  await registerIngestSchedules();
  console.log("[workers] All workers started");
}

startWorkers().catch((err) => {
  console.error("Failed to start workers:", err);
  process.exit(1);
});
