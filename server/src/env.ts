import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dirname, "../.env") });

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val)
    throw new Error(`[env] Missing required environment variable: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const _env = {
  // Elasticsearch
  ES_URL: requireEnv("ES_URL"),
  ES_INDEX: optionalEnv("ES_INDEX", "jobs"),
  ES_PERCOLATOR_INDEX: optionalEnv("ES_PERCOLATOR_INDEX", "jobs-percolator"),

  // Embeddings — Jina AI only (1024-dim, jina-embeddings-v3)
  JINA_API_KEY: requireEnv("JINA_API_KEY"),
  EMBEDDING_DIMS: parseInt(optionalEnv("EMBEDDING_DIMS", "1024"), 10),

  // MongoDB Atlas M0
  MONGODB_URI: requireEnv("MONGODB_URI"),

  // Redis — Upstash (rediss:// URL, used by BullMQ)
  REDIS_URL: requireEnv("REDIS_URL"),

  // JWT (validated now so server fails loudly at startup if missing)
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "7d"),

  // Admin
  ADMIN_SECRET: requireEnv("ADMIN_SECRET"),

  // Server
  PORT: parseInt(optionalEnv("PORT", "3000"), 10),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),

  // Adzuna
  ADZUNA_APP_ID: optionalEnv("ADZUNA_APP_ID", ""),
  ADZUNA_APP_KEY: optionalEnv("ADZUNA_APP_KEY", ""),
} as const;

export const env = {
  // Elasticsearch
  get esUrl() {
    return _env.ES_URL;
  },
  get esIndex() {
    return _env.ES_INDEX;
  },
  get esPercolatorIndex() {
    return _env.ES_PERCOLATOR_INDEX;
  },

  // Embeddings
  get jinaApiKey() {
    return _env.JINA_API_KEY;
  },
  get embeddingDims() {
    return _env.EMBEDDING_DIMS;
  },

  // MongoDB
  get mongoUri() {
    return _env.MONGODB_URI;
  },

  // Redis
  get redisUrl() {
    return _env.REDIS_URL;
  },

  // JWT
  get jwtSecret() {
    return _env.JWT_SECRET;
  },
  get jwtExpiresIn() {
    return _env.JWT_EXPIRES_IN;
  },

  // Admin
  get adminSecret() {
    return _env.ADMIN_SECRET;
  },

  // Server
  get port() {
    return _env.PORT;
  },
  get isDev() {
    return _env.NODE_ENV === "development";
  },
  get isProd() {
    return _env.NODE_ENV === "production";
  },

  // Adzuna
  get adzunaAppId() {
    return _env.ADZUNA_APP_ID;
  },
  get adzunaAppKey() {
    return _env.ADZUNA_APP_KEY;
  },
} as const;
