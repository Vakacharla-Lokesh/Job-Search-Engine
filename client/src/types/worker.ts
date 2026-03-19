// client/src/types/worker.ts

/** Messages sent FROM the main thread TO the worker */
export type WorkerInboundMessage =
  | {
      type: "LOAD_RESUME";
      resumeText: string;
    }
  | {
      type: "SCORE_JOBS";
      jobs: Array<{ id: string; text: string }>;
    };

/** Messages sent FROM the worker TO the main thread */
export type WorkerOutboundMessage =
  | { type: "READY" }
  | { type: "RESUME_LOADED" }
  | { type: "SCORES"; scores: Array<{ id: string; score: number }> }
  | { type: "ERROR"; message: string };
