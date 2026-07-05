import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

/** GET /api/admin/stats — system-wide statistics (admin only). */
export async function GET() {
  await requireAdmin();

  const [users, sessions, audioFiles, transcripts, reports, loginHistory] =
    await Promise.all([
      db.user.count(),
      db.session.count(),
      db.audioFile.count(),
      db.transcript.count(),
      db.report.count(),
      db.loginHistory.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    ]);

  const admins = await db.user.count({ where: { role: "ADMIN" } });

  // Recent sessions across the system
  const recentSessions = await db.session.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      evaluationScore: true,
      emotionResult: true,
    },
  });

  // Aggregate rating distribution across all users
  const evals = await db.evaluationScore.findMany({ select: { rating: true, overallSpeaking: true } });
  const ratingMap = new Map<string, number>();
  for (const e of evals)
    ratingMap.set(e.rating, (ratingMap.get(e.rating) ?? 0) + 1);
  const ratingDistribution = [
    "Excellent",
    "Good",
    "Average",
    "Needs Improvement",
  ].map((r) => ({ rating: r, count: ratingMap.get(r) ?? 0 }));

  const avgScore = evals.length
    ? Math.round(evals.reduce((a, b) => a + b.overallSpeaking, 0) / evals.length)
    : 0;

  return Response.json({
    totals: { users, admins, sessions, audioFiles, transcripts, reports },
    averageScore: avgScore,
    ratingDistribution,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
      user: s.user,
      rating: s.evaluationScore?.rating,
      overallSpeaking: s.evaluationScore?.overallSpeaking,
      emotion: s.emotionResult?.emotion,
    })),
    loginHistory: loginHistory.map((l) => ({
      id: l.id,
      email: l.email,
      success: l.success,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
