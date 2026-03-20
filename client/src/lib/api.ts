// client/src/lib/api.ts
import type { JobDocument } from "@/types/job.interfaces";

import { apiClient } from "@/lib/apiClient";
import type {
  CreateSavedSearchInput,
  CreateWebhookInput,
  JobSearchParams,
  JobSearchResult,
  SavedSearch,
  WebhookDelivery,
  WebhookSubscription,
} from "@/types/api.interfaces";

// Re-export all interfaces so existing imports from "api.ts" continue to work
export type {
  CreateSavedSearchInput,
  CreateWebhookInput,
  JobSearchParams,
  JobSearchResult,
  SavedSearch,
  SavedSearchFilters,
  WebhookDelivery,
  WebhookSubscription,
} from "@/types/api.interfaces";

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

  return apiClient.get<JobSearchResult>(`/jobs/search?${qs}`);
}

export function getJob(id: string): Promise<Omit<JobDocument, "embedding">> {
  return apiClient.get<Omit<JobDocument, "embedding">>(`/jobs/${id}`);
}

// ─── Saved Searches ────────────────────────────────────────────────────────────

export function listSavedSearches(): Promise<SavedSearch[]> {
  return apiClient.get<SavedSearch[]>("/saved-searches");
}

export function createSavedSearch(
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  return apiClient.post<SavedSearch>("/saved-searches", input);
}

export function deleteSavedSearch(id: string): Promise<void> {
  return apiClient.delete<void>(`/saved-searches/${id}`);
}

// ─── Webhooks ──────────────────────────────────────────────────────────────────

export function listWebhooks(): Promise<WebhookSubscription[]> {
  return apiClient.get<WebhookSubscription[]>("/webhooks");
}

export function createWebhook(
  input: CreateWebhookInput,
): Promise<WebhookSubscription> {
  return apiClient.post<WebhookSubscription>("/webhooks", input);
}

export function deleteWebhook(id: string): Promise<void> {
  return apiClient.delete<void>(`/webhooks/${id}`);
}

export function toggleWebhook(
  id: string,
  active: boolean,
): Promise<WebhookSubscription> {
  return apiClient.patch<WebhookSubscription>(`/webhooks/${id}`, { active });
}

export function listWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  return apiClient.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries`);
}

export function testWebhook(id: string): Promise<WebhookDelivery> {
  return apiClient.post<WebhookDelivery>(`/webhooks/${id}/test`);
}
