import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/env";

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  tls: env.redisUrl.startsWith("rediss://") ? {} : undefined,
});

export const webhookQueue = new Queue("webhooks", { connection: redisConnection });