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
import adminRoutes from "@/routes/admin";

export const app = express();

app.set("trust proxy", 1);

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id: string }).id = randomBytes(4).toString("hex");
  next();
});

morgan.token("id", (req) => (req as Request & { id: string }).id);

if (env.isDev) {
  app.use(
    morgan(
      "\x1b[2m:date[iso]\x1b[0m \x1b[35m[:id]\x1b[0m :method \x1b[36m:url\x1b[0m :status \x1b[2m:response-time ms\x1b[0m",
    ),
  );
} else {
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

app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/saved-searches", savedSearchRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});
