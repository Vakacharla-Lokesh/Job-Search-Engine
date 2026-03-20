// src/services/savedSearchService.ts
import { Types } from "mongoose";
import { SavedSearchModel } from "@/models/SavedSearch";
import { esClient } from "@/lib/elasticsearch";
import { env } from "@/env";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreateSavedSearchInput {
  name: string;
  query: string;
  filters: {
    location?: string[];
    salary_min?: number | null;
    remote?: boolean | null;
  };
}

export interface SavedSearchResponse {
  id: string;
  name: string;
  query: string;
  filters: {
    location: string[];
    salary_min: number | null;
    remote: boolean | null;
  };
  percolatorId: string;
  createdAt: Date;
  lastAlertAt: Date | null;
}

// ─── Percolator Helpers ────────────────────────────────────────────────────────

function buildPercolatorQuery(
  query: string,
  filters: CreateSavedSearchInput["filters"],
): object {
  const filterClauses: object[] = [];

  if (filters.location?.length) {
    filterClauses.push({ terms: { location: filters.location } });
  }
  if (filters.remote !== undefined && filters.remote !== null) {
    filterClauses.push({ term: { remote: filters.remote } });
  }
  if (filters.salary_min !== undefined && filters.salary_min !== null) {
    filterClauses.push({ range: { salary_min: { gte: filters.salary_min } } });
  }

  return {
    bool: {
      ...(query
        ? {
            must: {
              multi_match: {
                query,
                fields: ["title^3", "description", "skills"],
              },
            },
          }
        : { must: { match_all: {} } }),
      ...(filterClauses.length ? { filter: filterClauses } : {}),
    },
  };
}

async function registerPercolatorQuery(
  userId: string,
  query: string,
  filters: CreateSavedSearchInput["filters"],
): Promise<string> {
  const percolatorId = `${userId}_${Date.now()}`;

  await esClient.index({
    index: env.esPercolatorIndex,
    id: percolatorId,
    document: { query: buildPercolatorQuery(query, filters) },
    refresh: true,
  });

  return percolatorId;
}

async function deregisterPercolatorQuery(percolatorId: string): Promise<void> {
  try {
    await esClient.delete({
      index: env.esPercolatorIndex,
      id: percolatorId,
      refresh: true,
    });
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode !== 404) {
      throw err;
    }
  }
}

// ─── Formatting ────────────────────────────────────────────────────────────────

// Normalized shape we work with internally — avoids fighting Mongoose's
// optional/nullable inferred types throughout the rest of the service.
interface RawSavedSearchDoc {
  _id: Types.ObjectId;
  name: string;
  query: string;
  filters?: {
    location?: string[];
    salary_min?: number | null;
    remote?: boolean | null;
  } | null;
  percolatorId: string;
  createdAt: Date;
  lastAlertAt?: Date | null;
}

function formatSavedSearch(doc: RawSavedSearchDoc): SavedSearchResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    query: doc.query,
    filters: {
      location: doc.filters?.location ?? [],
      salary_min: doc.filters?.salary_min ?? null,
      remote: doc.filters?.remote ?? null,
    },
    percolatorId: doc.percolatorId,
    createdAt: doc.createdAt,
    lastAlertAt: doc.lastAlertAt ?? null,
  };
}

// ─── Service Functions ─────────────────────────────────────────────────────────

export async function createSavedSearch(
  userId: string,
  input: CreateSavedSearchInput,
): Promise<SavedSearchResponse> {
  const percolatorId = await registerPercolatorQuery(
    userId,
    input.query,
    input.filters,
  );

  const doc = await SavedSearchModel.create({
    userId: new Types.ObjectId(userId),
    name: input.name,
    query: input.query,
    filters: {
      location: input.filters.location ?? [],
      salary_min: input.filters.salary_min ?? null,
      remote: input.filters.remote ?? null,
    },
    percolatorId,
  });

  // .create() returns a Mongoose Document — cast to our internal interface
  // which intentionally matches Mongoose's actual optional shape
  return formatSavedSearch(doc as unknown as RawSavedSearchDoc);
}

export async function listSavedSearches(
  userId: string,
): Promise<SavedSearchResponse[]> {
  const docs = await SavedSearchModel.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map((doc) =>
    formatSavedSearch(doc as unknown as RawSavedSearchDoc),
  );
}

export async function getSavedSearch(
  userId: string,
  searchId: string,
): Promise<SavedSearchResponse | null> {
  if (!Types.ObjectId.isValid(searchId)) return null;

  const doc = await SavedSearchModel.findOne({
    _id: new Types.ObjectId(searchId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!doc) return null;
  return formatSavedSearch(doc as unknown as RawSavedSearchDoc);
}

export async function deleteSavedSearch(
  userId: string,
  searchId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(searchId)) return false;

  const doc = await SavedSearchModel.findOneAndDelete({
    _id: new Types.ObjectId(searchId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!doc) return false;

  await deregisterPercolatorQuery(doc.percolatorId);
  return true;
}
