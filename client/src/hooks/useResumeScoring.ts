// client/src/hooks/useResumeScoring.ts
//
// Manages the Web Worker lifecycle and exposes a clean API to the UI layer.
// This hook is the single owner of the worker — it creates it, receives all
// messages from it, and tears it down on unmount.

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobDocument } from "@/types/job";
import type { WorkerOutboundMessage } from "@/types/worker";

// Vite's ?worker import — produces a Worker constructor, not an instance
import ResumeWorker from "@/workers/resume.worker?worker";

export type WorkerStatus =
  | "initializing" // worker spawned, model loading
  | "ready" // model loaded, waiting for resume
  | "embedding" // resume being embedded
  | "scoring" // jobs being scored
  | "idle" // resume loaded, scores computed, at rest
  | "error";

export interface ResumeScoringState {
  status: WorkerStatus;
  /** Map of jobId → score (0–100). Empty until first SCORE_JOBS completes. */
  scores: Map<string, number>;
  errorMessage: string | null;
  /** Call with raw resume text (already extracted from PDF or paste) */
  loadResume: (text: string) => void;
  /** Call whenever visible jobs change to trigger re-scoring */
  scoreJobs: (
    jobs: Array<Pick<JobDocument, "id" | "title" | "description" | "skills">>,
  ) => void;
  /** True once the model is loaded and ready to accept a resume */
  isModelReady: boolean;
  /** True if a resume has been loaded and scores are available */
  hasResume: boolean;
}

export function useResumeScoring(): ResumeScoringState {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("initializing");
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasResumeRef = useRef(false);

  // Spawn the worker once on mount
  useEffect(() => {
    const worker = new ResumeWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case "READY":
          setStatus("ready");
          break;

        case "RESUME_LOADED":
          hasResumeRef.current = true;
          setStatus("idle");
          break;

        case "SCORES":
          setScores(new Map(msg.scores.map((s) => [s.id, s.score])));
          setStatus("idle");
          break;

        case "ERROR":
          setErrorMessage(msg.message);
          setStatus("error");
          break;
      }
    };

    worker.onerror = (e) => {
      setErrorMessage(e.message ?? "Worker crashed");
      setStatus("error");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const loadResume = useCallback((text: string) => {
    if (!workerRef.current) return;
    setStatus("embedding");
    setErrorMessage(null);
    workerRef.current.postMessage({ type: "LOAD_RESUME", resumeText: text });
  }, []);

  const scoreJobs = useCallback(
    (
      jobs: Array<Pick<JobDocument, "id" | "title" | "description" | "skills">>,
    ) => {
      if (!workerRef.current || !hasResumeRef.current) return;
      setStatus("scoring");

      const jobPayload = jobs.map((j) => ({
        id: j.id,
        // Concatenate searchable fields — same strategy as server-side ingestion
        text: [j.title, j.skills.join(" "), j.description.slice(0, 500)].join(
          " ",
        ),
      }));

      workerRef.current.postMessage({ type: "SCORE_JOBS", jobs: jobPayload });
    },
    [],
  );

  return {
    status,
    scores,
    errorMessage,
    loadResume,
    scoreJobs,
    isModelReady: status !== "initializing",
    hasResume: hasResumeRef.current,
  };
}
