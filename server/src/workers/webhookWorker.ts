// src/workers/webhookWorker.ts
import { Worker, type Job } from "bullmq";
import { createHmac } from "crypto";
import { Types } from "mongoose";
import { redisConnection } from "@/lib/redis";
import { WebhookSubscriptionModel } from "@/models/WebhookSubscription";
import { WebhookDeliveryModel } from "@/models/WebhookDelivery";
import type { WebhookJobData } from "@/ingest/alertMatcher";

const DELIVERY_TIMEOUT_MS = 10_000;

// ─── HMAC Signature ────────────────────────────────────────────────────────────

function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const { subscriptionId, job: jobPayload } = job.data;

  // Fetch subscription to get the URL and secret
  // Re-fetch on every attempt — subscription may have been deactivated
  // between the job being queued and this attempt running
  const subscription = await WebhookSubscriptionModel.findById(
    new Types.ObjectId(subscriptionId),
  )
    .select("url secret active")
    .lean();

  if (!subscription) {
    // Subscription deleted — discard job silently, don't retry
    console.log(
      `[webhook:worker] Subscription ${subscriptionId} not found — discarding job ${job.id}`,
    );
    return;
  }

  if (!subscription.active) {
    // Subscription paused — discard without retrying
    console.log(
      `[webhook:worker] Subscription ${subscriptionId} inactive — discarding job ${job.id}`,
    );
    return;
  }

  const payload = JSON.stringify({
    event: "job.match",
    job: jobPayload,
    deliveredAt: new Date().toISOString(),
  });

  const signature = signPayload(subscription.secret, payload);

  let responseStatus: number | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(subscription.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "User-Agent": "JobSearchEngine-Webhook/1.0",
        },
        body: payload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    responseStatus = response.status;

    // Treat any 2xx as success. Anything else is a delivery failure
    // and BullMQ will retry based on the job's attempts/backoff config.
    if (response.ok) {
      success = true;
    } else {
      errorMessage = `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }
  } catch (err) {
    const isAbort = (err as Error).name === "AbortError";
    errorMessage = isAbort
      ? `Timeout after ${DELIVERY_TIMEOUT_MS}ms`
      : ((err as Error).message ?? "Unknown error");

    if (!success) {
      // Record the failed attempt before rethrowing so BullMQ can retry
      await WebhookDeliveryModel.create({
        subscriptionId: new Types.ObjectId(subscriptionId),
        jobId: jobPayload.id,
        payload: JSON.parse(payload),
        responseStatus,
        error: errorMessage,
        sentAt: new Date(),
        success: false,
      });

      // Rethrow — BullMQ sees this as a failure and schedules a retry
      throw err;
    }
  }

  // Record successful delivery
  await WebhookDeliveryModel.create({
    subscriptionId: new Types.ObjectId(subscriptionId),
    jobId: jobPayload.id,
    payload: JSON.parse(payload),
    responseStatus,
    error: null,
    sentAt: new Date(),
    success: true,
  });

  console.log(
    `[webhook:worker] Job ${job.id} delivered to ${subscription.url} — ${responseStatus}`,
  );
}

// ─── Worker Factory ────────────────────────────────────────────────────────────

export function createWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>("webhooks", processWebhookJob, {
    connection: redisConnection,
    // Allow parallel webhook deliveries — each is an independent HTTP call
    // Cap at 5 to avoid overwhelming the Redis connection pool
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`[webhook:worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[webhook:worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message,
    );
  });

  return worker;
}
