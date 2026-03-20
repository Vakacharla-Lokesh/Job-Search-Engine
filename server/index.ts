import { app } from "@/server";
import { connectMongoDB } from "@/lib/mongodb";
import { connectElasticsearch } from "@/lib/elasticsearch";
import { createIngestWorker } from "@/ingest/worker";
import { registerIngestSchedules } from "@/ingest/scheduler";
import { createWebhookWorker } from "@/workers/webhookWorker";
import { env } from "@/env";

async function start(): Promise<void> {
  await connectMongoDB();
  await connectElasticsearch();

  createIngestWorker();
  console.log("Ingest worker started");

  createWebhookWorker();
  console.log("Webhook worker started");

  await registerIngestSchedules();

  app.listen(env.port, () => console.log(`Server running on :${env.port}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
