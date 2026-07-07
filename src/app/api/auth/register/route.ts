import { NextRequest } from "next/server";
import { db, withDbFallback } from "@/lib/db";
import {
  createFallbackLoginEntry,
  createFallbackUser,
  countFallbackUsers,
  findFallbackUserByEmail,
} from "@/lib/fallback-store";
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { errorResponse, getClientIp } from "@/lib/session";
import type { SafeUser } from "@/lib/types";

/** POST /api/auth/register — create a new user account. */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    const cleanName = String(name ?? "").trim();

    // Input validation
    if (!cleanName || cleanName.length < 2)
      return errorResponse("Name must be at least 2 characters.", 422);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail))
      return errorResponse("A valid email is required.", 422);
    if (!password || password.length < 6)
      return errorResponse("Password must be at least 6 characters.", 422);

    const existing = await withDbFallback(
      async () => db.user.findUnique({ where: { email: cleanEmail } }),
      await findFallbackUserByEmail(cleanEmail)
    );
    if (existing)
      return errorResponse("An account with this email already exists.", 409);

    const userCount = await withDbFallback(async () => db.user.count(), await countFallbackUsers());
    const role = userCount === 0 ? "ADMIN" : "USER";

    const user = await withDbFallback(
      async () =>
        db.user.create({
          data: {
            name: cleanName,
            email: cleanEmail,
            passwordHash: await hashPassword(password),
            role,
          },
        }),
      await createFallbackUser({
        id: `fallback-user-${Date.now()}`,
        email: cleanEmail,
        name: cleanName,
        passwordHash: await hashPassword(password),
        role,
      })
    );

    await withDbFallback(
      async () =>
        db.loginHistory.create({
          data: {
            userId: user.id,
            email: user.email,
            ipAddress: getClientIp(req) ?? undefined,
            userAgent: req.headers.get("user-agent") ?? undefined,
            success: true,
          },
        }),
      await createFallbackLoginEntry({
        userId: user.id,
        email: user.email,
        ipAddress: getClientIp(req) ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        success: true,
      })
    );

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role as "USER" | "ADMIN",
      name: user.name,
    });

    const safe: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "USER" | "ADMIN",
      createdAt: user.createdAt.toISOString(),
    };

    const res = Response.json({ user: safe });
    res.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=${token}; ${serializeCookieOptions(sessionCookieOptions())}`
    );
    return res;
  } catch (err) {
    console.error("register error", err);
    return errorResponse("Registration failed.", 500);
  }
}

function serializeCookieOptions(opts: Record<string, unknown>): string {
  return Object.entries(opts)
    .map(([k, v]) => {
      if (typeof v === "number") return `${k}=${v}`;
      if (typeof v === "boolean") return v ? k : "";
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join("; ");
}
