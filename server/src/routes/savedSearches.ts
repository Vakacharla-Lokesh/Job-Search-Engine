// src/routes/savedSearches.ts
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import {
  createSavedSearch,
  listSavedSearches,
  getSavedSearch,
  deleteSavedSearch,
} from "@/services/savedSearchService";

const router = Router();

router.use(requireAuth);

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query: z.string().max(500).default(""),
  filters: z
    .object({
      location: z.array(z.string()).optional(),
      salary_min: z.number().int().min(0).nullable().optional(),
      remote: z.boolean().nullable().optional(),
    })
    .default({}),
});

// ─── Routes ────────────────────────────────────────────────────────────────────

router.post(
  "/",
  validate(createSavedSearchSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = req.body as z.infer<typeof createSavedSearchSchema>;
    const savedSearch = await createSavedSearch(userId, input);
    res.status(201).json(savedSearch);
  },
);

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const results = await listSavedSearches(userId);
  res.status(200).json(results);
});

// Type the route params explicitly — eliminates the string | string[] | undefined ambiguity
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.user!.id;
  const result = await getSavedSearch(userId, req.params.id);

  if (!result) {
    res.status(404).json({ error: "Saved search not found" });
    return;
  }

  res.status(200).json(result);
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.user!.id;
  const deleted = await deleteSavedSearch(userId, req.params.id);

  if (!deleted) {
    res.status(404).json({ error: "Saved search not found" });
    return;
  }

  res.status(204).send();
});

export default router;
