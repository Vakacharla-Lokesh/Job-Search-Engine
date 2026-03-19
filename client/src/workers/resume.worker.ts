// client/src/workers/resume.worker.ts
//
// Runs entirely inside a Web Worker. No DOM access. No main-thread globals.
// Responsible for:
//   1. Loading the TF.js Universal Sentence Encoder model (once)
//   2. Embedding the user's resume text (cached between searches)
//   3. Embedding each job's text and computing cosine similarity vs the resume

import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@/types/worker";

// ----- State ----------------------------------------------------------------

let model: use.UniversalSentenceEncoder | null = null;
let resumeEmbedding: tf.Tensor1D | null = null; // cached, don't recompute

// ----- Helpers --------------------------------------------------------------

function send(msg: WorkerOutboundMessage): void {
  self.postMessage(msg);
}

/**
 * Cosine similarity between two 1-D tensors.
 * USE embeddings are L2-normalised, so dot product == cosine similarity.
 * We still normalise defensively to be safe.
 */
function cosineSimilarity(a: tf.Tensor1D, b: tf.Tensor1D): number {
  return tf.tidy(() => {
    const normA = tf.div(a, tf.norm(a));
    const normB = tf.div(b, tf.norm(b));
    // Clamp to [0, 1] — raw cosine can be slightly negative for dissimilar text
    const dot = tf.dot(normA, normB).dataSync()[0] ?? 0;
    return Math.max(0, Math.min(1, dot));
  });
}

/**
 * Embed a single string. Returns a 1D tensor (512 dims).
 * Caller is responsible for disposal.
 */
async function embed(text: string): Promise<tf.Tensor1D> {
  if (!model) throw new Error("Model not loaded");
  // embeddings() returns shape [N, 512]; we embed one string → [1, 512]
  const result = await model.embed([text]);
  const squeezed = result.squeeze([0]) as tf.Tensor1D;
  result.dispose(); // free the [1, 512] tensor
  return squeezed;
}

// ----- Boot -----------------------------------------------------------------

async function init(): Promise<void> {
  try {
    // Use the WASM backend inside workers — WebGL is not available in workers
    await tf.setBackend("wasm");
    await tf.ready();
    model = await use.load();
    send({ type: "READY" });
  } catch (err) {
    send({
      type: "ERROR",
      message: err instanceof Error ? err.message : "Failed to load USE model",
    });
  }
}

// ----- Message Handler ------------------------------------------------------

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "LOAD_RESUME": {
      try {
        // Dispose previous resume embedding to prevent memory leak
        resumeEmbedding?.dispose();
        resumeEmbedding = null;

        resumeEmbedding = await embed(msg.resumeText);
        send({ type: "RESUME_LOADED" });
      } catch (err) {
        send({
          type: "ERROR",
          message:
            err instanceof Error ? err.message : "Failed to embed resume",
        });
      }
      break;
    }

    case "SCORE_JOBS": {
      if (!resumeEmbedding) {
        send({ type: "ERROR", message: "Resume not loaded yet" });
        return;
      }

      try {
        const scores: Array<{ id: string; score: number }> = [];

        for (const job of msg.jobs) {
          const jobEmbedding = await embed(job.text);
          const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
          jobEmbedding.dispose();
          // Convert to 0–100 integer
          scores.push({ id: job.id, score: Math.round(similarity * 100) });
        }

        send({ type: "SCORES", scores });
      } catch (err) {
        send({
          type: "ERROR",
          message: err instanceof Error ? err.message : "Failed to score jobs",
        });
      }
      break;
    }
  }
};

// Start loading the model immediately when the worker is instantiated.
// By the time the user uploads their resume, the model may already be warm.
void init();
