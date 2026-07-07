import { NextRequest } from "next/server";
import { db, withDbFallback } from "@/lib/db";
import {
  createFallbackLoginEntry,
  findFallbackUserByEmail,
} from "@/lib/fallback-store";
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { errorResponse, getClientIp } from "@/lib/session";
import type { SafeUser } from "@/lib/types";

/** POST /api/auth/login — authenticate and create a session cookie. */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();

    if (!cleanEmail || !password)
      return errorResponse("Email and password are required.", 422);

    const user = await withDbFallback(
      async () => db.user.findUnique({ where: { email: cleanEmail } }),
      await findFallbackUserByEmail(cleanEmail)
    );

    const recordLogin = async (success: boolean) => {
      await withDbFallback(
        async () =>
          db.loginHistory.create({
            data: {
              userId: user?.id,
              email: cleanEmail,
              ipAddress: getClientIp(req) ?? undefined,
              userAgent: req.headers.get("user-agent") ?? undefined,
              success,
            },
          }),
        await createFallbackLoginEntry({
          userId: user?.id ?? null,
          email: cleanEmail,
          ipAddress: getClientIp(req) ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
          success,
        })
      );
    };

    if (!user) {
      await recordLogin(false);
      return errorResponse("Invalid email or password.", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await recordLogin(false);
      return errorResponse("Invalid email or password.", 401);
    }

    await recordLogin(true);

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
    console.error("login error", err);
    return errorResponse("Login failed.", 500);
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
