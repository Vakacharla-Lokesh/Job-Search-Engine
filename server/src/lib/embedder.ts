const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v3";
const JINA_BATCH_SIZE = 32;

interface JinaEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (!process.env.JINA_API_KEY) {
    throw new Error("JINA_API_KEY is not set");
  }

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += JINA_BATCH_SIZE) {
    const batch = texts.slice(i, i + JINA_BATCH_SIZE);

    const res = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({ model: JINA_MODEL, input: batch }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Jina AI embedding failed (${res.status}): ${error}`);
    }

    const json = (await res.json()) as JinaEmbeddingResponse;
    results.push(...json.data.map((d) => d.embedding));

    if (i + JINA_BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  return results;
}
