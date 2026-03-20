// server/src/routes/jobs.ts
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { searchJobs, getJobById } from "@/services/jobService";
import { isElasticsearchAvailable } from "@/lib/elasticsearch";

const router = Router();

const searchSchema = z.object({
  q: z.string().default(""),
  location: z.string().optional(),
  remote: z.coerce.boolean().optional(),
  salary_min: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["relevance", "date", "salary"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  job_type: z
    .enum(["full_time", "part_time", "contract", "internship"])
    .optional(),
  experience_level: z.enum(["entry", "mid", "senior", "lead"]).optional(),
  skills: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  source: z
    .enum(["remotive", "hn", "arbeitnow", "themuse", "adzuna"])
    .optional(),
});

router.get("/search", async (req: Request, res: Response) => {
  if (!isElasticsearchAvailable) {
    res
      .status(503)
      .json({ error: "Search unavailable — Elasticsearch is offline" });
    return;
  }

  const result = searchSchema.safeParse(req.query);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Invalid query params", details: result.error.issues });
    return;
  }
  const jobs = await searchJobs(result.data);
  res.json(jobs);
});

router.get("/:id", async (req: Request, res: Response) => {
  if (!isElasticsearchAvailable) {
    res
      .status(503)
      .json({ error: "Search unavailable — Elasticsearch is offline" });
    return;
  }
  const id = req.params["id"];
  if (typeof id !== "string" || !id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  const job = await getJobById(id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

export default router;
