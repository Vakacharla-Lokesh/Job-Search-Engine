import type { JobDocument } from "@/types/job.interfaces";

export interface JobSearchResult {
  hits: Omit<JobDocument, "embedding">[];
  total: number;
  page: number;
}

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

export interface WebhookSubscription {
  id: string;
  savedSearchId: string;
  url: string;
  active: boolean;
  createdAt: string;
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

export interface CreateWebhookInput {
  savedSearchId: string;
  url: string;
}
