import { useCallback, useEffect, useRef, useState } from "react";
import type { JobDocument } from "@/types/job.interfaces";
import type { WorkerOutboundMessage } from "@/types/worker.interfaces";
import ResumeWorker from "@/workers/resume.worker?worker";

export type WorkerStatus =
  | "initializing"
  | "ready"
  | "embedding"
  | "scoring"
  | "idle"
  | "error";

export interface ResumeScoringState {
  status: WorkerStatus;
  scores: Map<string, number>;
  errorMessage: string | null;
  loadResume: (text: string) => void;
  scoreJobs: (
    jobs: Array<Pick<JobDocument, "id" | "title" | "description" | "skills">>,
  ) => void;
  isModelReady: boolean;
  hasResume: boolean;
  /** Call this when the user clears their resume */
  clearResume: () => void;
}

export function useResumeScoring(): ResumeScoringState {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("initializing");
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);

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
          setHasResume(true);
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
      if (!workerRef.current) return;
      setStatus("scoring");

      const jobPayload = jobs.map((j) => ({
        id: j.id,
        text: [j.title, j.skills.join(" "), j.description.slice(0, 500)].join(
          " ",
        ),
      }));

      workerRef.current.postMessage({ type: "SCORE_JOBS", jobs: jobPayload });
    },
    [],
  );

  const clearResume = useCallback(() => {
    setHasResume(false);
    setScores(new Map());
    setStatus("ready");
  }, []);

  return {
    status,
    scores,
    errorMessage,
    loadResume,
    scoreJobs,
    clearResume,
    isModelReady: status !== "initializing",
    hasResume,
  };
}
