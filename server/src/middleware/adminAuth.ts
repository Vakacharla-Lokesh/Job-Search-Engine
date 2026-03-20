// src/middleware/adminAuth.ts
// Protects admin endpoints with a static secret passed as a Bearer token.
// Intentionally separate from requireAuth (user JWT) — admin routes have
// no concept of a "current user" and should never be reachable by regular
// auth tokens even if someone guesses the route.
import type { Request, Response, NextFunction } from "express";
import { env } from "@/env";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing admin authorization header" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // Constant-time comparison to prevent timing attacks on the secret
  const expected = env.adminSecret;
  if (token.length !== expected.length || token !== expected) {
    res.status(403).json({ error: "Invalid admin secret" });
    return;
  }

  next();
}
