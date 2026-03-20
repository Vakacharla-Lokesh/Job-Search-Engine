export type WorkerInboundMessage =
  | {
      type: "LOAD_RESUME";
      resumeText: string;
    }
  | {
      type: "SCORE_JOBS";
      jobs: Array<{ id: string; text: string }>;
    };

export type WorkerOutboundMessage =
  | { type: "READY" }
  | { type: "RESUME_LOADED" }
  | { type: "SCORES"; scores: Array<{ id: string; score: number }> }
  | { type: "ERROR"; message: string };
