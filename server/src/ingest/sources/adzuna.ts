// src/ingest/sources/adzuna.ts
import { stripHtml, urlToId, extractSkills } from "@/ingest/pipeline";
import { env } from "@/env";
import type { JobDocument } from "@/types/job";

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

const ADZUNA_QUERIES = [
  { country: "in", what: "software engineer", where: "" },
  { country: "gb", what: "software engineer", where: "remote" },
  { country: "us", what: "software engineer", where: "" },
] as const;

export async function fetchAdzuna(): Promise<JobDocument[]> {
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    console.log("[adzuna] Skipping — ADZUNA_APP_ID/KEY not set");
    return [];
  }

  const jobs: JobDocument[] = [];

  for (const q of ADZUNA_QUERIES) {
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${q.country}/search/1`,
    );
    url.searchParams.set("app_id", env.adzunaAppId);
    url.searchParams.set("app_key", env.adzunaAppKey);
    url.searchParams.set("results_per_page", "100");
    url.searchParams.set("what", q.what);
    if (q.where) url.searchParams.set("where", q.where);
    url.searchParams.set("content-type", "application/json");

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(`[adzuna] ${q.country} fetch failed: ${res.status}`);
      continue;
    }

    const data = (await res.json()) as AdzunaResponse;
    for (const job of data.results ?? []) {
      const description = stripHtml(job.description);
      const location = job.location.display_name;
      const remote = /remote/i.test(location) || /remote/i.test(job.title);

      jobs.push({
        id: urlToId(job.redirect_url),
        title: job.title,
        description,
        company: job.company.display_name,
        location,
        remote,
        salary_min: job.salary_min ? Math.round(job.salary_min) : null,
        salary_max: job.salary_max ? Math.round(job.salary_max) : null,
        skills: extractSkills(description),
        source_url: job.redirect_url,
        posted_at: new Date(job.created).toISOString(),
        source: "adzuna",
      });
    }
  }

  console.log(`[adzuna] ${jobs.length} raw jobs`);
  return jobs;
}
