// src/ingest/sources/themuse.ts
import { stripHtml, urlToId, extractSkills } from "@/ingest/pipeline";
import type { JobDocument } from "@/types/job";

interface TheMuseJob {
  id: number;
  name: string;
  contents: string;
  refs: { landing_page: string };
  company: { name: string };
  locations: Array<{ name: string }>;
  publication_date: string;
  levels: Array<{ name: string }>;
}

interface TheMuseResponse {
  results: TheMuseJob[];
  total: number;
}

export async function fetchTheMuse(): Promise<JobDocument[]> {
  const jobs: JobDocument[] = [];

  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `https://www.themuse.com/api/public/jobs?page=${page}&per_page=100&category=Software%20Engineer&category=Data%20Science&category=Product%20Management`,
    );
    if (!res.ok) break;

    const data = (await res.json()) as TheMuseResponse;
    if (!data.results?.length) break;

    for (const job of data.results) {
      const description = stripHtml(job.contents ?? "");
      const location = job.locations?.[0]?.name ?? "Unknown";
      const remote = /remote/i.test(location);

      jobs.push({
        id: urlToId(job.refs.landing_page),
        title: job.name,
        description,
        company: job.company.name,
        location,
        remote,
        salary_min: null,
        salary_max: null,
        skills: extractSkills(description),
        source_url: job.refs.landing_page,
        posted_at: new Date(job.publication_date).toISOString(),
        source: "themuse",
      });
    }
  }

  console.log(`[themuse] ${jobs.length} raw jobs`);
  return jobs;
}
