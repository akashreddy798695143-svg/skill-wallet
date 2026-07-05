import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/admin/users/[id] — delete a user and cascade their data. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.id)
      return errorResponse("You cannot delete your own account.", 422);

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return errorResponse("User not found.", 404);
    if (target.role === "ADMIN")
      return errorResponse("Cannot delete an admin account.", 422);

    await db.user.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("admin user delete error", err);
    return errorResponse("Failed to delete user.", 500);
  }
}
