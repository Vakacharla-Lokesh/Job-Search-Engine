// src/ingest/queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "@/lib/redis";

export type IngestSource =
  | "remotive"
  | "hn"
  | "arbeitnow"
  | "themuse"
  | "adzuna"
  | "all";

export interface IngestJobData {
  source: IngestSource;
}

export const ingestQueue = new Queue<IngestJobData>("ingest", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 60_000, // 1 min base — ingest jobs are slow, give breathing room
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});
