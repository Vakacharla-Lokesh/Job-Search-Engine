import { Client } from "@elastic/elasticsearch";

if (!process.env.ES_URL) {
  throw new Error("ES_URL environment variable is not set");
}

export const esClient = new Client({
  node: process.env.ES_URL,
});

export async function connectElasticsearch(): Promise<void> {
  const health = await esClient.cluster.health({});
  console.log(`Elasticsearch connected — cluster status: ${health.status}`);
}
