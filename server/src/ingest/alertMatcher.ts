// src/ingest/alertMatcher.ts
// Called after each ingest pipeline run.
// Percolates newly indexed jobs against saved search queries,
// then enqueues webhook delivery jobs for each match.

import { esClient } from "@/lib/elasticsearch";
import { env } from "@/env";
import { webhookQueue } from "@/lib/redis";
import { SavedSearchModel } from "@/models/SavedSearch";
import { WebhookSubscriptionModel } from "@/models/WebhookSubscription";
import type { JobDocument } from "@/types/job";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WebhookJobData {
  subscriptionId: string;
  savedSearchId: string;
  userId: string;
  job: Omit<JobDocument, "embedding">;
}

// ─── Percolation ───────────────────────────────────────────────────────────────

/**
 * Percolates a single job document against the percolator index.
 * Returns the list of percolatorIds (stored query IDs) that match.
 */
async function getMatchingPercolatorIds(
  job: Omit<JobDocument, "embedding">,
): Promise<string[]> {
  const result = await esClient.search({
    index: env.esPercolatorIndex,
    query: {
      percolate: {
        field: "query",
        document: {
          title: job.title,
          description: job.description,
          skills: job.skills,
          location: job.location,
          remote: job.remote,
          salary_min: job.salary_min,
        },
      },
    },
    // Only need IDs — no need to fetch the stored query bodies
    _source: false,
  });

  return result.hits.hits
    .map((h) => h._id)
    .filter((id): id is string => id !== undefined);
}

// ─── Alert Matching ────────────────────────────────────────────────────────────

/**
 * For each newly indexed job:
 *  1. Percolate it against stored saved search queries
 *  2. For each match, find the SavedSearch + active WebhookSubscription
 *  3. Enqueue a webhook delivery job
 *
 * Designed to be called from the ingest worker after bulkIndex completes.
 * Errors are caught per-job so one bad percolation doesn't abort the rest.
 */
export async function matchAlerts(
  newJobs: Omit<JobDocument, "embedding">[],
): Promise<void> {
  if (newJobs.length === 0) return;

  console.log(`[alertMatcher] Percolating ${newJobs.length} new jobs...`);

  let totalMatches = 0;
  let totalQueued = 0;

  for (const job of newJobs) {
    try {
      const percolatorIds = await getMatchingPercolatorIds(job);
      if (percolatorIds.length === 0) continue;

      totalMatches += percolatorIds.length;

      // Batch-lookup all SavedSearches that own these percolatorIds
      const savedSearches = await SavedSearchModel.find({
        percolatorId: { $in: percolatorIds },
      })
        .select("_id userId percolatorId")
        .lean();

      if (savedSearches.length === 0) continue;

      const savedSearchIds = savedSearches.map((s) => s._id);

      // Batch-lookup active webhook subscriptions for these saved searches
      const subscriptions = await WebhookSubscriptionModel.find({
        savedSearchId: { $in: savedSearchIds },
        active: true,
      })
        .select("_id userId savedSearchId")
        .lean();

      if (subscriptions.length === 0) continue;

      // Build a map: savedSearchId → SavedSearch for quick lookup
      const savedSearchMap = new Map(
        savedSearches.map((s) => [s._id.toString(), s]),
      );

      // Enqueue one webhook job per matching subscription
      for (const sub of subscriptions) {
        const savedSearch = savedSearchMap.get(sub.savedSearchId.toString());
        if (!savedSearch) continue;

        const jobData: WebhookJobData = {
          subscriptionId: sub._id.toString(),
          savedSearchId: savedSearch._id.toString(),
          userId: savedSearch.userId.toString(),
          job,
        };

        await webhookQueue.add(`webhook:${sub._id.toString()}`, jobData, {
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 500 },
        });

        totalQueued++;
      }
    } catch (err) {
      // Per-job error isolation — log and continue to next job
      console.error(
        `[alertMatcher] Failed to percolate job ${job.id}:`,
        (err as Error).message,
      );
    }
  }

  console.log(
    `[alertMatcher] Done — ${totalMatches} percolator matches, ${totalQueued} webhook jobs queued`,
  );
}
