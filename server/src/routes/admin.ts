// src/routes/admin.ts
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAdmin } from "@/middleware/adminAuth";
import { validate } from "@/middleware/validate";
import { ingestQueue } from "@/ingest/queue";
import type { IngestSource } from "@/ingest/queue";

const router = Router();

router.use(requireAdmin);

// ─── Schema ────────────────────────────────────────────────────────────────────

const ingestSchema = z.object({
  source: z
    .enum(["remotive", "hn", "arbeitnow", "themuse", "adzuna", "all"])
    .default("all"),
});

// ─── POST /api/v1/admin/ingest ─────────────────────────────────────────────────
// Enqueues a one-off ingest job. Returns 202 immediately — the job runs async.
// Body: { source?: IngestSource }  (defaults to "all")
//
// curl -X POST http://localhost:3001/api/v1/admin/ingest \
//   -H "Authorization: Bearer <ADMIN_SECRET>" \
//   -H "Content-Type: application/json" \
//   -d '{"source": "remotive"}'

router.post(
  "/ingest",
  validate(ingestSchema),
  async (req: Request, res: Response) => {
    const { source } = req.body as z.infer<typeof ingestSchema>;

    try {
      const job = await ingestQueue.add(
        `ingest:manual:${source}`,
        { source: source as IngestSource },
        {
          // Manual jobs: single attempt, no retry. If it fails the operator
          // can re-trigger. Retries here would mask the actual error.
          attempts: 1,
          // No repeat — this is a one-off, not a scheduled job
        },
      );

      res.status(202).json({
        message: "Ingest job enqueued",
        jobId: job.id,
        source,
      });
    } catch (err) {
      console.error(
        "[admin] Failed to enqueue ingest job:",
        (err as Error).message,
      );
      res.status(500).json({ error: "Failed to enqueue ingest job" });
    }
  },
);

export default router;
