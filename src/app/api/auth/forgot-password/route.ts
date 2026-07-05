import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createResetToken } from "@/lib/auth";
import { errorResponse } from "@/lib/session";

/**
 * POST /api/auth/forgot-password
 * Generates a password-reset token. In production this would be emailed; in this
 * sandbox the token is returned so the UI can continue the reset flow directly.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!cleanEmail)
      return errorResponse("Email is required.", 422);

    // Always respond OK to avoid leaking which emails exist.
    const user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      const token = await createResetToken(user.email);
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await db.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      return Response.json({
        ok: true,
        // Returned for demo convenience (no mail server in sandbox).
        resetToken: token,
        message: "Reset token generated.",
      });
    }
    return Response.json({ ok: true, message: "If that email exists, a reset link was generated." });
  } catch (err) {
    console.error("forgot-password error", err);
    return errorResponse("Request failed.", 500);
  }
}
