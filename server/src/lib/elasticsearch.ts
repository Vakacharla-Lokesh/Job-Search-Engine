import { Client } from "@elastic/elasticsearch";
import { env } from "@/env";

export const esClient = new Client({ node: env.esUrl });

export async function connectElasticsearch(): Promise<void> {
  const health = await esClient.cluster.health({});
  console.log(`Elasticsearch connected — cluster status: ${health.status}`);
}
