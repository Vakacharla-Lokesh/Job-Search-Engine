// src/routes/webhooks.ts
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import {
  createSubscription,
  listSubscriptions,
  deleteSubscription,
  toggleSubscription,
  listDeliveries,
  fireTestDelivery,
} from "@/services/webhookService";

const router = Router();

router.use(requireAuth);

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createSubscriptionSchema = z.object({
  savedSearchId: z.string().min(1),
  url: z.string().url(),
});

const toggleSchema = z.object({
  active: z.boolean(),
});

// ─── Routes ────────────────────────────────────────────────────────────────────

// POST /api/v1/webhooks
router.post(
  "/",
  validate(createSubscriptionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = req.body as z.infer<typeof createSubscriptionSchema>;

    try {
      const subscription = await createSubscription(userId, input);
      // 201 — secret is in the response body here and never again
      res.status(201).json(subscription);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
);

// GET /api/v1/webhooks
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const subscriptions = await listSubscriptions(userId);
  res.status(200).json(subscriptions);
});

// DELETE /api/v1/webhooks/:id
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.user!.id;
  const deleted = await deleteSubscription(userId, req.params.id);

  if (!deleted) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  res.status(204).send();
});

// PATCH /api/v1/webhooks/:id — toggle active/inactive
router.patch(
  "/:id",
  validate(toggleSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const userId = req.user!.id;
    const { active } = req.body as z.infer<typeof toggleSchema>;

    const updated = await toggleSubscription(userId, req.params.id, active);

    if (!updated) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    res.status(200).json(updated);
  },
);

// GET /api/v1/webhooks/:id/deliveries — delivery history for a subscription
router.get(
  "/:id/deliveries",
  async (req: Request<{ id: string }>, res: Response) => {
    const userId = req.user!.id;
    const deliveries = await listDeliveries(userId, req.params.id);
    res.status(200).json(deliveries);
  },
);

// POST /api/v1/webhooks/:id/test — fire a test delivery immediately (sync, not queued)
router.post(
  "/:id/test",
  async (req: Request<{ id: string }>, res: Response) => {
    const userId = req.user!.id;

    try {
      const delivery = await fireTestDelivery(userId, req.params.id);
      res.status(200).json(delivery);
    } catch (err) {
      const message = (err as Error).message;
      if (message === "Subscription not found") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: "Test delivery failed" });
    }
  },
);

export default router;
