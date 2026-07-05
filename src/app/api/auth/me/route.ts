import { getCurrentUser } from "@/lib/session";
import type { SafeUser } from "@/lib/types";

/** GET /api/auth/me — return the currently authenticated user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const safe: SafeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "USER" | "ADMIN",
    createdAt: user.createdAt.toISOString(),
  };
  return Response.json(safe);
}
