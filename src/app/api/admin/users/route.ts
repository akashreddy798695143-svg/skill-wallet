import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

/** GET /api/admin/users — list all users (admin only) with session counts. */
export async function GET() {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });
  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    sessionCount: u._count.sessions,
  }));
  return Response.json({ users: data });
}

/** POST /api/admin/users — promote/demote a user (admin only). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { userId, role } = await req.json();
    if (!userId || !["USER", "ADMIN"].includes(role))
      return errorResponse("Invalid request.", 422);
    if (userId === admin.id)
      return errorResponse("You cannot change your own role.", 422);

    const updated = await db.user.update({
      where: { id: String(userId) },
      data: { role: String(role) },
      select: { id: true, role: true },
    });
    return Response.json({ user: updated });
  } catch (err) {
    console.error("admin user update error", err);
    return errorResponse("Failed to update user.", 500);
  }
}
