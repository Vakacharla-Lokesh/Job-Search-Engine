import { stripHtml, urlToId, extractSkills } from "@/ingest/pipeline";
import type { JobDocument, JobType } from "@/types/job";

interface ArbeitnowJob {
  slug: string;
  url: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  description: string;
  tags: string[];
  job_types: string[];
  publication_date: string;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
}

function normalizeJobType(types: string[]): JobType | undefined {
  const raw = types[0]?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const map: Record<string, JobType> = {
    full_time: "full_time",
    part_time: "part_time",
    contract: "contract",
    internship: "internship",
  };
  return map[raw];
}

export async function fetchArbeitnow(): Promise<JobDocument[]> {
  const jobs: JobDocument[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
    );
    if (!res.ok) break;

    const data = (await res.json()) as ArbeitnowResponse;
    if (!data.data?.length) break;

    for (const job of data.data) {
      const description = stripHtml(job.description);
      const parsedDate = new Date(job.publication_date);
      const job_type = normalizeJobType(job.job_types);

      const doc: JobDocument = {
        id: urlToId(job.url),
        title: job.title,
        description,
        company: job.company_name,
        location: job.location || "Europe",
        remote: job.remote,
        salary_min: null,
        salary_max: null,
        skills: extractSkills(description),
        source_url: job.url,
        posted_at: isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString(),
        source: "arbeitnow",
      };

      if (job_type) doc.job_type = job_type;

      jobs.push(doc);
    }
  }

  console.log(`[arbeitnow] ${jobs.length} raw jobs`);
  return jobs;
}
