import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/**
 * Authentication utilities for Voice-Based Connect.
 * - Password hashing with bcryptjs
 * - JWT session management with httpOnly cookies (jose)
 * - Input validation helpers
 */

const SESSION_COOKIE = "vbc_session";
const SESSION_TTL_DAYS = 7;
const SECRET_ENV = process.env.JWT_SECRET;

// Derive a 32-byte secret key. Falls back to a dev secret (must be set in prod).
function getSecret(): Uint8Array {
  const secret = SECRET_ENV || "vbc-dev-secret-change-me-in-production-please";
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: "USER" | "ADMIN";
  name: string;
}

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/** Verify a plaintext password against a stored hash. */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign a JWT session token for the given user. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .setSubject(payload.sub)
    .sign(getSecret());
}

/** Verify and decode a session token. Returns null if invalid/expired. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as "USER" | "ADMIN",
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

/** Build the cookie options used for the session cookie. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Generate an opaque reset token (also JWT-signed, short-lived). */
export async function createResetToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

export async function verifyResetToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "reset") return null;
    return { email: payload.email as string };
  } catch {
    return null;
  }
}
