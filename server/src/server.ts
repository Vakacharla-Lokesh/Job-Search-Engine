import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { randomBytes } from "crypto";
import { env } from "@/env";
import jobRoutes from "@/routes/jobs";
import authRoutes from "@/routes/auth";
import savedSearchRoutes from "@/routes/savedSearches";
import webhookRoutes from "@/routes/webhooks";

export const app = express();

// ── Request ID ────────────────────────────────────────────────────────────────
// Attach a unique 8-char hex ID to every request. Morgan embeds it in every
// log line so the full request lifecycle is traceable by grepping the ID.
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id: string }).id = randomBytes(4).toString("hex");
  next();
});

// ── Morgan HTTP logger ────────────────────────────────────────────────────────
morgan.token("id", (req) => (req as Request & { id: string }).id);

if (env.isDev) {
  // Colored, human-readable: 2025-07-18T10:23:01 [a3f8c21d] POST /api/v1/auth/login 201 4ms
  app.use(
    morgan(
      "\x1b[2m:date[iso]\x1b[0m \x1b[35m[:id]\x1b[0m :method \x1b[36m:url\x1b[0m :status \x1b[2m:response-time ms\x1b[0m",
    ),
  );
} else {
  // Production: one JSON object per line — ingest into any log aggregator
  app.use(
    morgan((tokens, req, res) =>
      JSON.stringify({
        id: tokens["id"]?.(req, res),
        method: tokens["method"]?.(req, res),
        url: tokens["url"]?.(req, res),
        status: Number(tokens["status"]?.(req, res)),
        ms: Number(tokens["response-time"]?.(req, res)),
        ts: tokens["date"]?.(req, res, "iso"),
      }),
    ),
  );
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.isDev ? "http://localhost:5173" : "https://your-app.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/saved-searches", savedSearchRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

// ── Error handler (must be last, after all routes) ────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});
