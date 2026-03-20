// src/ingest/pipeline.ts
// Shared utilities used by all source fetchers and the ingest worker.

import crypto from "crypto";
import { esClient } from "@/lib/elasticsearch";
import { embed } from "@/lib/embedder";
import { env } from "@/env";
import { SKILL_PATTERNS } from "@/types/skills";
import type { JobDocument } from "@/types/job";

// ─── Text Utilities ────────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function urlToId(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_PATTERNS.filter((skill) => lower.includes(skill));
}

// ─── Deduplication ─────────────────────────────────────────────────────────────

export async function filterExistingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const result = await esClient.search({
    index: env.esIndex,
    size: ids.length,
    query: { ids: { values: ids } },
    _source: false,
  });

  const existingIds = result.hits.hits
    .map((h) => h._id)
    .filter((id): id is string => id !== undefined);

  return new Set(existingIds);
}

// ─── Bulk Index ─────────────────────────────────────────────────────────────────

export interface IngestResult {
  fetched: number;
  skipped: number;
  indexed: number;
  errors: number;
  newJobs: Omit<JobDocument, "embedding">[];
}

export async function bulkIndex(jobs: JobDocument[]): Promise<IngestResult> {
  if (jobs.length === 0) {
    return { fetched: 0, skipped: 0, indexed: 0, errors: 0, newJobs: [] };
  }

  const texts = jobs.map((j) => `${j.title} ${j.description}`.slice(0, 2048));
  const embeddings = await embed(texts);

  const operations = jobs.flatMap((job, idx) => [
    { index: { _index: env.esIndex, _id: job.id } },
    { ...job, embedding: embeddings[idx] },
  ]);

  const result = await esClient.bulk({ operations, refresh: false });

  const failedItems = result.errors
    ? result.items.filter((item) => item.index?.error)
    : [];

  if (failedItems.length > 0) {
    console.error(`[ingest] ${failedItems.length} bulk index errors`);
    for (const item of failedItems.slice(0, 3)) {
      console.error("  ", item.index?.error);
    }
  }

  await esClient.indices.refresh({ index: env.esIndex });

  return {
    fetched: jobs.length,
    skipped: 0, // caller sets this
    indexed: jobs.length - failedItems.length,
    errors: failedItems.length,
    newJobs: [],
  };
}

// Update runPipeline to return them
export async function runPipeline(
  rawJobs: JobDocument[],
): Promise<IngestResult> {
  const existingIds = await filterExistingIds(rawJobs.map((j) => j.id));
  const newJobs = rawJobs.filter((j) => !existingIds.has(j.id));

  const result = await bulkIndex(newJobs);

  // Strip embeddings — alertMatcher doesn't need them and they're large
  const indexedJobs: Omit<JobDocument, "embedding">[] = newJobs.map(
    ({ embedding: _embedding, ...rest }) => rest,
  );

  return {
    ...result,
    fetched: rawJobs.length,
    skipped: existingIds.size,
    newJobs: result.errors === 0 ? indexedJobs : [],
    // If there were bulk errors we don't know exactly which jobs succeeded,
    // so conservatively skip alerting for this batch rather than
    // alerting on jobs that may not actually be in the index.
  };
}
