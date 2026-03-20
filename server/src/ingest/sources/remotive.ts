// src/ingest/sources/remotive.ts
import { stripHtml, urlToId, extractSkills } from "@/ingest/pipeline";
import type { JobDocument } from "@/types/job";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  description: string;
  salary: string;
  publication_date: string;
  tags: string[];
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

export async function fetchRemotive(): Promise<JobDocument[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs?limit=500");
  if (!res.ok) throw new Error(`Remotive fetch failed: ${res.status}`);

  const data = (await res.json()) as RemotiveResponse;
  console.log(`[remotive] ${data.jobs.length} raw jobs`);

  return data.jobs.map((job): JobDocument => {
    const description = stripHtml(job.description);
    const salaryMatch = job.salary?.match(
      /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/,
    )?.[0];
    const salaryNums = salaryMatch
      ? salaryMatch.replace(/[$,]/g, "").split(/[-–]/).map(Number)
      : null;

    return {
      id: urlToId(job.url),
      title: job.title,
      description,
      company: job.company_name,
      location: job.candidate_required_location || "Remote",
      remote: true,
      salary_min: salaryNums?.[0] ?? null,
      salary_max: salaryNums?.[1] ?? null,
      skills: extractSkills(description),
      source_url: job.url,
      posted_at: new Date(job.publication_date).toISOString(),
      source: "remotive",
    };
  });
}
