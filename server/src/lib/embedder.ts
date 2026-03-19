import { env } from "@/env";

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v3";
const JINA_BATCH_SIZE = 32;
// Minimum delay between batches — keeps us under 100k tokens/min on free tier
const JINA_BATCH_DELAY_MS = 1500;
// Retry config for 429 responses
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 10_000; // 10s base — Jina's window resets per minute

interface JinaEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatchWithRetry(
  batch: string[],
  attempt = 0,
): Promise<number[][]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.jinaApiKey}`,
    },
    body: JSON.stringify({ model: JINA_MODEL, input: batch }),
  });

  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) {
      const error = await res.text();
      throw new Error(
        `Jina rate limit exceeded after ${MAX_RETRIES} retries: ${error}`,
      );
    }
    // Exponential backoff: 10s, 20s, 40s, 80s, 160s
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
    console.warn(
      `   ⏳ Jina rate limit hit — waiting ${delay / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`,
    );
    await sleep(delay);
    return embedBatchWithRetry(batch, attempt + 1);
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Jina AI embedding failed (${res.status}): ${error}`);
  }

  const json = (await res.json()) as JinaEmbeddingResponse;
  return json.data.map((d) => d.embedding);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += JINA_BATCH_SIZE) {
    const batch = texts.slice(i, i + JINA_BATCH_SIZE);
    const batchNum = Math.floor(i / JINA_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(texts.length / JINA_BATCH_SIZE);

    console.log(
      `   📡 Embedding batch ${batchNum}/${totalBatches} (${batch.length} texts)...`,
    );

    const embeddings = await embedBatchWithRetry(batch);
    results.push(...embeddings);

    // Delay between batches to stay under the token/min limit
    if (i + JINA_BATCH_SIZE < texts.length) {
      await sleep(JINA_BATCH_DELAY_MS);
    }
  }

  return results;
}
