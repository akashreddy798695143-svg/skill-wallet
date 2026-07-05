import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";

/**
 * Server-side helpers to read the authenticated user from the request cookie.
 */

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError();
  }
  return user;
}

export class UnauthenticatedError extends Error {
  status = 401;
  constructor() {
    super("Authentication required");
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor() {
    super("Forbidden: admin access required");
  }
}

/** Standard JSON error response helper. */
export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Extract a client IP-ish string from request headers (best effort). */
export function getClientIp(req: Request): string | null {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}
