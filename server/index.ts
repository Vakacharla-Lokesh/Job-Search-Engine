import { app } from "@/server";
import { connectMongoDB } from "@/lib/mongodb";
import { connectElasticsearch } from "@/lib/elasticsearch";
import { env } from "@/env";

async function start(): Promise<void> {
  await connectMongoDB();
  await connectElasticsearch();
  app.listen(env.port, () => console.log(`Server running on :${env.port}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
