import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validate } from "@/middleware/validate";
import { register, login, AuthError } from "@/services/authService";
import { env } from "@/env";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
  });
}

router.post(
  "/register",
  validate(authSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as z.infer<typeof authSchema>;
      const token = await register(email, password);
      setAuthCookie(res, token);
      res.status(201).json({ message: "Account created" });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/login",
  validate(authSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as z.infer<typeof authSchema>;
      const token = await login(email, password);
      setAuthCookie(res, token);
      res.status(200).json({ message: "Logged in" });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out" });
});

export default router;
