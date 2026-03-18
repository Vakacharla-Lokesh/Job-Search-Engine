import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UserModel } from "@/models/User";
import { env } from "@/env";

function jwtOptions(): SignOptions {
  return { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function register(
  email: string,
  password: string,
): Promise<string> {
  const existing = await UserModel.findOne({ email });
  if (existing) throw new AuthError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({ email, passwordHash });

  return jwt.sign({ id: user._id.toString() }, env.jwtSecret, jwtOptions());
}

export async function login(email: string, password: string): Promise<string> {
  const user = await UserModel.findOne({ email });
  if (!user) throw new AuthError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid credentials", 401);

  return jwt.sign({ id: user._id.toString() }, env.jwtSecret, jwtOptions());
}
