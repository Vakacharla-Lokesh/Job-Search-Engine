import "@/env";
import { esClient } from "@/lib/elasticsearch";

const ES_INDEX = process.env.ES_INDEX ?? "jobs";
const ES_PERCOLATOR_INDEX =
  process.env.ES_PERCOLATOR_INDEX ?? "jobs-percolator";

const EMBEDDING_DIMS = parseInt(process.env.EMBEDDING_DIMS ?? "1024", 10);

async function createJobsIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: ES_INDEX });
  if (exists) {
    console.log(`ℹ️  Index "${ES_INDEX}" already exists — skipping`);
    return;
  }

  await esClient.indices.create({
    index: ES_INDEX,
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
        skills: { type: "text", analyzer: "english" },
        source_url: { type: "keyword" },
        posted_at: { type: "date" },
        source: { type: "keyword" }, // 'remotive' | 'hn'
        embedding: {
          type: "dense_vector",
          dims: EMBEDDING_DIMS,
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

  console.log(`✅ Created index "${ES_INDEX}" (dims: ${EMBEDDING_DIMS})`);
}

async function createPercolatorIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: ES_PERCOLATOR_INDEX });
  if (exists) {
    console.log(`ℹ️  Index "${ES_PERCOLATOR_INDEX}" already exists — skipping`);
    return;
  }

  await esClient.indices.create({
    index: ES_PERCOLATOR_INDEX,
    mappings: {
      properties: {
        // Required by ES percolator
        query: { type: "percolator" },
        // Mirror the fields that percolate queries will match against
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

  console.log(`✅ Created index "${ES_PERCOLATOR_INDEX}"`);
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
