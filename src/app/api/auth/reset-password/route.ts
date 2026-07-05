import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyResetToken, hashPassword } from "@/lib/auth";
import { errorResponse } from "@/lib/session";

/** POST /api/auth/reset-password — reset password using a valid reset token. */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 6)
      return errorResponse("A valid token and a 6+ character password are required.", 422);

    const payload = await verifyResetToken(String(token));
    if (!payload) return errorResponse("Invalid or expired reset token.", 400);

    const user = await db.user.findUnique({ where: { email: payload.email } });
    if (!user) return errorResponse("Account not found.", 404);
    if (user.resetToken !== String(token))
      return errorResponse("Reset token mismatch.", 400);
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date())
      return errorResponse("Reset token has expired.", 400);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(String(password)),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return Response.json({ ok: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("reset-password error", err);
    return errorResponse("Reset failed.", 500);
  }
}
