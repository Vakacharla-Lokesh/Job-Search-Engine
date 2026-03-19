/**
 * Ingestion script — Phase 1
 * Sources: Remotive API + HN Who's Hiring (via Algolia)
 *
 * Usage:
 *   bun run scripts/ingest.ts
 *   bun run scripts/ingest.ts --source remotive
 *   bun run scripts/ingest.ts --source hn
 *
 * What it does:
 *  1. Fetch raw jobs from each source
 *  2. Normalize to JobDocument (strip HTML, extract fields)
 *  3. Deduplicate against existing ES documents by source_url
 *  4. Embed descriptions in batches via Jina AI
 *  5. Bulk index into Elasticsearch
 */

import crypto from "crypto";
import { esClient } from "@/lib/elasticsearch";
import { embed } from "@/lib/embedder";
import type { JobDocument } from "@/types/job";
import { env } from "@/env";
import { SKILL_PATTERNS } from "@/types/skills";

const ES_INDEX = env.esIndex;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic ID from a URL — avoids re-indexing the same job. */
function urlToId(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Naively extract skill tokens from description text.
 * Good enough for Phase 1 — replace with an NLP extractor later.
 */

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_PATTERNS.filter((skill) => lower.includes(skill));
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Given a list of source URLs, returns the subset that are NOT already in ES.
 * Uses a terms query — much faster than checking one-by-one.
 */
async function filterExistingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const result = await esClient.search({
    index: env.esIndex,
    size: ids.length,
    query: { ids: { values: ids } },
    _source: false, // don't fetch document body — just need the _id
  });

  const existingIds = result.hits.hits
    .map((h) => h._id)
    .filter((id): id is string => id !== undefined);
  return new Set(existingIds);
}

// ─── Source: Remotive ─────────────────────────────────────────────────────────

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

async function fetchRemotive(): Promise<JobDocument[]> {
  console.log("🌐 Fetching Remotive...");

  const res = await fetch("https://remotive.com/api/remote-jobs?limit=500");
  if (!res.ok) throw new Error(`Remotive fetch failed: ${res.status}`);

  const data = (await res.json()) as RemotiveResponse;
  console.log(`   → ${data.jobs.length} raw jobs from Remotive`);

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
      remote: true, // Remotive is remote-only
      salary_min: salaryNums?.[0] ?? null,
      salary_max: salaryNums?.[1] ?? null,
      skills: extractSkills(description),
      source_url: job.url,
      posted_at: new Date(job.publication_date).toISOString(),
      source: "remotive",
    };
  });
}

// ─── Source: HN Who's Hiring ──────────────────────────────────────────────────

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

/**
 * Fetches the current month's "Who is Hiring?" thread from HN via Algolia.
 * Each top-level comment is one job posting.
 */
async function fetchHNWhosHiring(): Promise<JobDocument[]> {
  console.log("🌐 Fetching HN Who's Hiring...");

  // Find the most recent "Ask HN: Who is hiring?" thread
  const threadSearch = await fetch(
    "https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=5",
  );
  if (!threadSearch.ok)
    throw new Error(`HN thread search failed: ${threadSearch.status}`);

  const threadData = (await threadSearch.json()) as AlgoliaResponse;
  const thread = threadData.hits[0];
  if (!thread) throw new Error("Could not find HN Who is Hiring thread");

  const storyId = thread.story_id ?? parseInt(thread.objectID, 10);
  console.log(`   → Using HN thread: ${storyId}`);

  // Fetch all top-level comments (each is a job posting), paginating
  const allJobs: JobDocument[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=200&page=${page}`,
    );
    if (!res.ok) throw new Error(`HN comments fetch failed: ${res.status}`);

    const data = (await res.json()) as AlgoliaResponse;
    totalPages = Math.min(data.nbPages, 5); // Cap at 5 pages (~1000 comments) to be safe

    for (const hit of data.hits) {
      if (!hit.comment_text || hit.comment_text.length < 100) continue;

      const text = stripHtml(hit.comment_text);

      // Best-effort title extraction: first line is usually "Company | Role | Location"
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
        description: text.slice(0, 4000), // Cap length — some posts are very long
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

  console.log(`   → ${allJobs.length} raw jobs from HN`);
  return allJobs;
}

function extractLocationFromHN(text: string): string {
  const match = text.match(
    /\b(remote|new york|san francisco|london|berlin|amsterdam|toronto|seattle|austin|chicago|boston|los angeles|bangalore|singapore)\b/i,
  );
  return match ? match[0] : "Unknown";
}

function extractSalaryMin(text: string): number | null {
  // Match patterns like $120k, $120,000, 120k
  const match = text.match(/\$\s?([\d]+(?:,[\d]+)?)\s*[kK]?\b/);
  if (!match?.[1]) return null;
  const raw = parseInt(match[1].replace(",", ""), 10);
  // If it looks like thousands (e.g. 120k), multiply up
  return raw < 1000 ? raw * 1000 : raw;
}

// ─── Source: Arbeitnow ────────────────────────────────────────────────────────

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

async function fetchArbeitnow(): Promise<JobDocument[]> {
  console.log("🌐 Fetching Arbeitnow...");
  const jobs: JobDocument[] = [];

  // Arbeitnow paginates — fetch first 3 pages (300 jobs max)
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
      jobs.push({
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
      });
    }
  }

  console.log(`   → ${jobs.length} raw jobs from Arbeitnow`);
  return jobs;
}

// ─── Source: The Muse ─────────────────────────────────────────────────────────

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

async function fetchTheMuse(): Promise<JobDocument[]> {
  console.log("🌐 Fetching The Muse...");
  const jobs: JobDocument[] = [];

  // The Muse free tier allows up to 500 results — fetch 2 pages of 100
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

  console.log(`   → ${jobs.length} raw jobs from The Muse`);
  return jobs;
}

// ─── Source: Adzuna ───────────────────────────────────────────────────────────

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

async function fetchAdzuna(): Promise<JobDocument[]> {
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    console.log("⏭️  Skipping Adzuna — ADZUNA_APP_ID/KEY not set");
    return [];
  }

  console.log("🌐 Fetching Adzuna...");
  const jobs: JobDocument[] = [];

  // Fetch from India + global remote — two separate queries
  const queries = [
    { country: "in", what: "software engineer", where: "" },
    { country: "gb", what: "software engineer", where: "remote" },
    { country: "us", what: "software engineer", where: "" },
  ];

  for (const q of queries) {
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
      console.warn(`   ⚠️  Adzuna ${q.country} fetch failed: ${res.status}`);
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

  console.log(`   → ${jobs.length} raw jobs from Adzuna`);
  return jobs;
}

// ─── Bulk Index ───────────────────────────────────────────────────────────────

// In bulkIndex, replace the batched loop with a single embed call:
async function bulkIndex(jobs: JobDocument[]): Promise<void> {
  if (jobs.length === 0) {
    console.log("   → Nothing to index");
    return;
  }

  console.log(`\n📦 Embedding and indexing ${jobs.length} jobs...`);

  const texts = jobs.map((j) => `${j.title} ${j.description}`.slice(0, 2048));
  const embeddings = await embed(texts); // embedder.ts handles batching internally

  const operations = jobs.flatMap((job, idx) => [
    { index: { _index: env.esIndex, _id: job.id } },
    { ...job, embedding: embeddings[idx] },
  ]);

  const result = await esClient.bulk({ operations, refresh: false });

  if (result.errors) {
    const failed = result.items.filter((item) => item.index?.error);
    console.error(`   ⚠️  ${failed.length} bulk errors`);
    for (const item of failed.slice(0, 3)) {
      console.error("     ", item.index?.error);
    }
  }

  await esClient.indices.refresh({ index: env.esIndex });
  console.log(`\n🎉 Indexed ${jobs.length} jobs into "${env.esIndex}"`);
}
// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sourceArg =
    args.find((a) => a.startsWith("--source="))?.split("=")[1] ??
    args[args.indexOf("--source") + 1];

  console.log("🚀 Starting ingestion pipeline\n");

  let rawJobs: JobDocument[] = [];

  if (!sourceArg || sourceArg === "remotive")
    rawJobs.push(...(await fetchRemotive()));
  if (!sourceArg || sourceArg === "hn")
    rawJobs.push(...(await fetchHNWhosHiring()));
  if (!sourceArg || sourceArg === "arbeitnow")
    rawJobs.push(...(await fetchArbeitnow()));
  if (!sourceArg || sourceArg === "themuse")
    rawJobs.push(...(await fetchTheMuse()));
  if (!sourceArg || sourceArg === "adzuna")
    rawJobs.push(...(await fetchAdzuna()));

  console.log(`\n📊 Total raw jobs fetched: ${rawJobs.length}`);

  const existingIds = await filterExistingIds(rawJobs.map((j) => j.id));
  const newJobs = rawJobs.filter((j) => !existingIds.has(j.id));

  console.log(
    `   → ${existingIds.size} duplicates skipped, ${newJobs.length} new`,
  );

  await bulkIndex(newJobs);

  const countResult = await esClient.count({ index: ES_INDEX });
  console.log(`\n📈 Total jobs in index: ${countResult.count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
