import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@/types/worker.interfaces";

let model: use.UniversalSentenceEncoder | null = null;
let resumeEmbedding: tf.Tensor1D | null = null; // cached, don't recompute

function send(msg: WorkerOutboundMessage): void {
  self.postMessage(msg);
}

function cosineSimilarity(a: tf.Tensor1D, b: tf.Tensor1D): number {
  return tf.tidy(() => {
    const normA = tf.div(a, tf.norm(a));
    const normB = tf.div(b, tf.norm(b));
    const dot = tf.dot(normA, normB).dataSync()[0] ?? 0;
    return Math.max(0, Math.min(1, dot));
  });
}

async function embed(text: string): Promise<tf.Tensor1D> {
  if (!model) throw new Error("Model not loaded");
  const result = await model.embed([text]);
  const squeezed = result.squeeze([0]) as tf.Tensor1D;
  result.dispose();
  return squeezed;
}

async function init(): Promise<void> {
  try {
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

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "LOAD_RESUME": {
      try {
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

void init();
