// client/src/lib/api.ts
import type { JobDocument } from "@/types/job";

const BASE = import.meta.env.VITE_API_URL as string;

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
