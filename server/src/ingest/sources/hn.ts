// src/ingest/sources/hn.ts
import { stripHtml, urlToId, extractSkills } from "@/ingest/pipeline";
import type { JobDocument } from "@/types/job";

interface AlgoliaHit {
  objectID: string;
  author: string;
  comment_text: string | null;
  created_at: string;
  story_id: number;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbPages: number;
}

function extractLocationFromHN(text: string): string {
  const match = text.match(
    /\b(remote|new york|san francisco|london|berlin|amsterdam|toronto|seattle|austin|chicago|boston|los angeles|bangalore|singapore)\b/i,
  );
  return match ? match[0] : "Unknown";
}

function extractSalaryMin(text: string): number | null {
  const match = text.match(/\$\s?([\d]+(?:,[\d]+)?)\s*[kK]?\b/);
  if (!match?.[1]) return null;
  const raw = parseInt(match[1].replace(",", ""), 10);
  return raw < 1000 ? raw * 1000 : raw;
}

export async function fetchHNWhosHiring(): Promise<JobDocument[]> {
  const threadSearch = await fetch(
    "https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=5",
  );
  if (!threadSearch.ok)
    throw new Error(`HN thread search failed: ${threadSearch.status}`);

  const threadData = (await threadSearch.json()) as AlgoliaResponse;
  const thread = threadData.hits[0];
  if (!thread) throw new Error("Could not find HN Who is Hiring thread");

  const storyId = thread.story_id ?? parseInt(thread.objectID, 10);
  console.log(`[hn] Using thread: ${storyId}`);

  const allJobs: JobDocument[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=200&page=${page}`,
    );
    if (!res.ok) throw new Error(`HN comments fetch failed: ${res.status}`);

    const data = (await res.json()) as AlgoliaResponse;
    totalPages = Math.min(data.nbPages, 5);

    for (const hit of data.hits) {
      if (!hit.comment_text || hit.comment_text.length < 100) continue;

      const text = stripHtml(hit.comment_text);
      const firstLine = text.split("\n")[0]?.trim() ?? "";
      const title =
        firstLine.length > 5 && firstLine.length < 120
          ? firstLine
          : "Software Engineer";

      const url = `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const remote =
        /\bremote\b/i.test(text) || /\bonsite\b/i.test(text) === false;

      allJobs.push({
        id: urlToId(url),
        title,
        description: text.slice(0, 4000),
        company: hit.author,
        location: extractLocationFromHN(text),
        remote,
        salary_min: extractSalaryMin(text),
        salary_max: null,
        skills: extractSkills(text),
        source_url: url,
        posted_at: new Date(hit.created_at).toISOString(),
        source: "hn",
      });
    }

    page++;
  }

  console.log(`[hn] ${allJobs.length} raw jobs`);
  return allJobs;
}
