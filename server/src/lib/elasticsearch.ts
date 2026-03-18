import { Client } from "@elastic/elasticsearch";
import { HttpConnection } from "@elastic/transport";
import { env } from "@/env";

/**
 * Force HttpConnection (Node http module) instead of the default UndiciConnection.
 * @elastic/elasticsearch v9 uses undici by default, which conflicts with Bun's
 * fetch interception on Windows — response.headers comes back undefined.
 */
export const esClient = new Client({
  node: env.esUrl,
  Connection: HttpConnection,
});

export let isElasticsearchAvailable = false;

export async function connectElasticsearch(): Promise<void> {
  try {
    const health = await esClient.cluster.health({});
    isElasticsearchAvailable = true;
    console.log(`Elasticsearch connected — cluster status: ${health.status}`);
  } catch (err) {
    isElasticsearchAvailable = false;
    console.warn(
      "[elasticsearch] Connection failed — search endpoints will be unavailable.",
      (err as Error).message,
    );
  }
}
