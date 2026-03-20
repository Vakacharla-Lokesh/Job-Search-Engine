import "@/env";
import { env } from "@/env";
import { esClient } from "@/lib/elasticsearch";

async function createJobsIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: env.esIndex });
  if (exists) {
    console.log(`Index "${env.esIndex}" already exists — skipping`);
    return;
  }

  await esClient.indices.create({
    index: env.esIndex,
    mappings: {
      properties: {
        id: { type: "keyword" },
        title: {
          type: "text",
          analyzer: "english",
          fields: { keyword: { type: "keyword" } },
        },
        description: { type: "text", analyzer: "english" },
        company: { type: "keyword" },
        location: { type: "keyword" },
        remote: { type: "boolean" },
        salary_min: { type: "integer" },
        salary_max: { type: "integer" },
        skills: {
          type: "text",
          analyzer: "english",
          fields: { keyword: { type: "keyword" } },
        },
        source_url: { type: "keyword" },
        posted_at: { type: "date" },
        source: { type: "keyword" },
        job_type: { type: "keyword" },
        experience_level: { type: "keyword" },
        embedding: {
          type: "dense_vector",
          dims: env.embeddingDims,
          index: true,
          similarity: "cosine",
        },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  });

  console.log(`✅ Created index "${env.esIndex}" (dims: ${env.embeddingDims})`);
}

async function createPercolatorIndex(): Promise<void> {
  const exists = await esClient.indices.exists({
    index: env.esPercolatorIndex,
  });
  if (exists) {
    console.log(`Index "${env.esPercolatorIndex}" already exists — skipping`);
    return;
  }

  await esClient.indices.create({
    index: env.esPercolatorIndex,
    mappings: {
      properties: {
        query: { type: "percolator" },
        title: { type: "text", analyzer: "english" },
        description: { type: "text", analyzer: "english" },
        skills: { type: "text", analyzer: "english" },
        location: { type: "keyword" },
        remote: { type: "boolean" },
        salary_min: { type: "integer" },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  });

  console.log(`✅ Created index "${env.esPercolatorIndex}"`);
}

async function main(): Promise<void> {
  console.log("🔧 Setting up Elasticsearch indices...\n");
  await createJobsIndex();
  await createPercolatorIndex();
  console.log("\n✅ Index setup complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Index setup failed:", err);
  process.exit(1);
});
