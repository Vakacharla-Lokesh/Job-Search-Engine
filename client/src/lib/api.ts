// client/src/lib/api.ts
import type { JobDocument } from "@/types/job";

const BASE = import.meta.env.VITE_API_URL as string;

// ─── Job Search ────────────────────────────────────────────────────────────────

export interface JobSearchParams {
  q?: string;
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

// ─── Saved Searches ────────────────────────────────────────────────────────────

export interface SavedSearchFilters {
  location: string[];
  salary_min: number | null;
  remote: boolean | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SavedSearchFilters;
  percolatorId: string;
  createdAt: string;
  lastAlertAt: string | null;
}

export interface CreateSavedSearchInput {
  name: string;
  query: string;
  filters: {
    location?: string[];
    salary_min?: number | null;
    remote?: boolean | null;
  };
}

// ─── Core Fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include", // send httpOnly auth cookie
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Jobs ──────────────────────────────────────────────────────────────────────

export function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.location) qs.set("location", params.location);
  if (params.remote !== undefined) qs.set("remote", String(params.remote));
  if (params.salary_min !== undefined)
    qs.set("salary_min", String(params.salary_min));
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  return apiFetch<JobSearchResult>(`/jobs/search?${qs}`);
}

export function getJob(id: string): Promise<Omit<JobDocument, "embedding">> {
  return apiFetch(`/jobs/${id}`);
}

// ─── Saved Searches ────────────────────────────────────────────────────────────

export function listSavedSearches(): Promise<SavedSearch[]> {
  return apiFetch<SavedSearch[]>("/saved-searches");
}

export function createSavedSearch(
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  return apiFetch<SavedSearch>("/saved-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteSavedSearch(id: string): Promise<void> {
  return apiFetch<void>(`/saved-searches/${id}`, { method: "DELETE" });
}

// ─── Webhooks ──────────────────────────────────────────────────────────────────

export interface WebhookSubscription {
  id: string;
  savedSearchId: string;
  url: string;
  active: boolean;
  createdAt: string;
  // Only present immediately after creation — never returned again
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  jobId: string;
  success: boolean;
  responseStatus: number | null;
  error: string | null;
  sentAt: string;
}

export function listWebhooks(): Promise<WebhookSubscription[]> {
  return apiFetch<WebhookSubscription[]>("/webhooks");
}

export function createWebhook(input: {
  savedSearchId: string;
  url: string;
}): Promise<WebhookSubscription> {
  return apiFetch<WebhookSubscription>("/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteWebhook(id: string): Promise<void> {
  return apiFetch<void>(`/webhooks/${id}`, { method: "DELETE" });
}

export function toggleWebhook(
  id: string,
  active: boolean,
): Promise<WebhookSubscription> {
  return apiFetch<WebhookSubscription>(`/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
}

export function listWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  return apiFetch<WebhookDelivery[]>(`/webhooks/${id}/deliveries`);
}

export function testWebhook(id: string): Promise<WebhookDelivery> {
  return apiFetch<WebhookDelivery>(`/webhooks/${id}/test`, { method: "POST" });
}
