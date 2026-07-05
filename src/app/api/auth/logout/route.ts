import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

/** POST /api/auth/logout — clear the session cookie. */
export async function POST(_req: NextRequest) {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  );
  return res;
}
