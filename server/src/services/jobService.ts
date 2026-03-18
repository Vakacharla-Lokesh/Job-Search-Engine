import { esClient } from "@/lib/elasticsearch";
import { embed } from "@/lib/embedder";
import { env } from "@/env";
import type { JobDocument } from "@/types/job";

export interface JobSearchParams {
  q: string;
  location?: string;
  remote?: boolean;
  salary_min?: number;
  sort?: "relevance" | "date" | "salary";
  page?: number;
}

export interface JobSearchResult {
  hits: Omit<JobDocument, "embedding">[];
  total: number;
  page: number;
}

const PAGE_SIZE = 50;
const RRF_K = 60; // standard RRF constant — higher = less aggressive rank fusion

/**
 * Manual RRF: merges two ranked lists by score = 1/(k + rank).
 * Produces identical results to ES native RRF on a free license.
 */
function rrfMerge(
  bm25Hits: Array<{ id: string; score: number; source: JobDocument }>,
  knnHits: Array<{ id: string; score: number; source: JobDocument }>,
): Array<{ id: string; source: JobDocument }> {
  const scores = new Map<string, number>();
  const sources = new Map<string, JobDocument>();

  bm25Hits.forEach(({ id, source }, rank) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1));
    sources.set(id, source);
  });

  knnHits.forEach(({ id, source }, rank) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1));
    sources.set(id, source);
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => ({ id, source: sources.get(id)! }));
}

export async function searchJobs(
  params: JobSearchParams,
): Promise<JobSearchResult> {
  const {
    q,
    location,
    remote,
    salary_min,
    sort = "relevance",
    page = 1,
  } = params;
  const from = (page - 1) * PAGE_SIZE;

  // Build filter clauses (shared by both BM25 and kNN paths)
  const filters: object[] = [];
  if (location) filters.push({ term: { location } });
  if (remote !== undefined) filters.push({ term: { remote } });
  if (salary_min !== undefined)
    filters.push({ range: { salary_min: { gte: salary_min } } });
  const hasFilters = filters.length > 0;

  // ── Non-relevance sort: plain BM25 + filter, no kNN needed ────────────────
  if (sort !== "relevance") {
    const sortClause =
      sort === "date"
        ? [{ posted_at: { order: "desc" as const } }]
        : [{ salary_min: { order: "desc" as const } }];

    const result = await esClient.search<JobDocument>({
      index: env.esIndex,
      from,
      size: PAGE_SIZE,
      query: {
        bool: {
          must: q
            ? {
                multi_match: {
                  query: q,
                  fields: ["title^3", "description", "company", "skills"],
                },
              }
            : { match_all: {} },
          filter: hasFilters ? filters : undefined,
        },
      },
      sort: sortClause,
      _source: { excludes: ["embedding"] },
    });

    const hits = result.hits.hits
      .map((h) => h._source)
      .filter((s): s is JobDocument => s !== undefined);

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    return { hits, total, page };
  }

  // ── Relevance sort: manual hybrid BM25 + kNN with RRF merge ───────────────
  // If no query string, skip kNN entirely — a zero vector breaks cosine similarity.
  // Fall back to BM25-only with filters, which is the correct behaviour for "browse all".
  if (!q) {
    const result = await esClient.search<JobDocument>({
      index: env.esIndex,
      from,
      size: PAGE_SIZE,
      query: {
        bool: {
          must: { match_all: {} },
          filter: hasFilters ? filters : undefined,
        },
      },
      _source: { excludes: ["embedding"] },
    });

    const hits = result.hits.hits
      .map((h) => h._source)
      .filter((s): s is JobDocument => s !== undefined);

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    return { hits, total, page };
  }

  // q is non-empty — safe to embed and run kNN
  const [queryEmbedding] = await embed([q]);

  const [bm25Result, knnResult] = await Promise.all([
    esClient.search<JobDocument>({
      index: env.esIndex,
      size: PAGE_SIZE,
      query: {
        bool: {
          must: {
            multi_match: {
              query: q,
              fields: ["title^3", "description", "company", "skills"],
            },
          },
          filter: hasFilters ? filters : undefined,
        },
      },
      _source: { excludes: ["embedding"] },
    }),
    esClient.search<JobDocument>({
      index: env.esIndex,
      size: PAGE_SIZE,
      knn: {
        field: "embedding",
        query_vector: queryEmbedding,
        num_candidates: 100,
        k: PAGE_SIZE,
        filter: hasFilters ? filters : undefined,
      },
      _source: { excludes: ["embedding"] },
    }),
  ]);

  const bm25Hits = bm25Result.hits.hits
    .filter((h) => h._source)
    .map((h) => ({ id: h._id!, score: h._score ?? 0, source: h._source! }));

  const knnHits = knnResult.hits.hits
    .filter((h) => h._source)
    .map((h) => ({ id: h._id!, score: h._score ?? 0, source: h._source! }));

  const merged = rrfMerge(bm25Hits, knnHits);
  const total = merged.length;
  const pageSlice = merged.slice(from, from + PAGE_SIZE).map((r) => r.source);

  return { hits: pageSlice, total, page };
}

export async function getJobById(
  id: string,
): Promise<Omit<JobDocument, "embedding"> | null> {
  try {
    const result = await esClient.get<JobDocument>({
      index: env.esIndex,
      id,
      _source_excludes: ["embedding"],
    });
    return result._source ?? null;
  } catch {
    return null;
  }
}
