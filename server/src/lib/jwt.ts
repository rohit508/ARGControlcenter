import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../env";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export interface AccessTokenPayload {
  userId: number;
  email: string;
  roles: string[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // jti (JWT ID) is a random nonce, not derived from the claims — without it, two tokens issued
  // for the same user within the same second (iat has 1-second resolution) are byte-identical,
  // which an integration test caught directly. Also a real, independent security benefit: a
  // unique jti is what a future token-revocation/audit-tracking feature would key off of.
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, ACCESS_SECRET, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyRefreshToken(token: string): { userId: number } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: number };
}
