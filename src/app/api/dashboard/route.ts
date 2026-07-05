import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { DashboardData } from "@/lib/types";

/** GET /api/dashboard — aggregated analytics for the current user. */
export async function GET() {
  const user = await requireUser();

  const sessions = await db.session.findMany({
    where: { userId: user.id },
    include: { emotionResult: true, evaluationScore: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const scored = sessions.filter((s) => s.evaluationScore);
  const scores = scored.map((s) => s.evaluationScore!.overallSpeaking);
  const averageScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const highestScore = scores.length ? Math.max(...scores) : 0;

  // Emotion history counts
  const emotionMap = new Map<string, number>();
  for (const s of sessions) {
    if (s.emotionResult) {
      emotionMap.set(
        s.emotionResult.emotion,
        (emotionMap.get(s.emotionResult.emotion) ?? 0) + 1
      );
    }
  }
  const emotionHistory = Array.from(emotionMap.entries()).map(([emotion, count]) => ({
    emotion,
    count,
  }));

  // Rating distribution
  const ratingMap = new Map<string, number>();
  for (const s of scored) {
    const r = s.evaluationScore!.rating;
    ratingMap.set(r, (ratingMap.get(r) ?? 0) + 1);
  }
  const ratingDistribution = [
    "Excellent",
    "Good",
    "Average",
    "Needs Improvement",
  ].map((rating) => ({ rating, count: ratingMap.get(rating) ?? 0 }));

  // Speech history + score trend (chronological)
  const speechHistory = scored.map((s) => ({
    date: s.createdAt.toISOString(),
    score: s.evaluationScore!.overallSpeaking,
    rating: s.evaluationScore!.rating,
  }));
  const scoreTrend = speechHistory.slice(-20);

  // Weekly performance (last 8 weeks)
  const weekly = bucketByWeek(scored, 8);
  // Monthly performance (last 6 months)
  const monthly = bucketByMonth(scored, 6);

  const data: DashboardData = {
    totalSessions: sessions.length,
    averageScore,
    highestScore,
    emotionHistory,
    speechHistory,
    weeklyPerformance: weekly,
    monthlyPerformance: monthly,
    ratingDistribution,
    scoreTrend,
  };
  return Response.json(data);
}

function bucketByWeek(
  sessions: { createdAt: Date; evaluationScore: { overallSpeaking: number } | null }[],
  weeks: number
) {
  const out: { week: string; score: number; sessions: number }[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const inRange = sessions.filter(
      (s) => s.createdAt >= start && s.createdAt <= end && s.evaluationScore
    );
    const sc = inRange.map((s) => s.evaluationScore!.overallSpeaking);
    out.push({
      week: `W${weeks - i}`,
      score: sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0,
      sessions: inRange.length,
    });
  }
  return out;
}

function bucketByMonth(
  sessions: { createdAt: Date; evaluationScore: { overallSpeaking: number } | null }[],
  months: number
) {
  const out: { month: string; score: number; sessions: number }[] = [];
  const now = new Date();
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inRange = sessions.filter(
      (s) =>
        s.createdAt.getFullYear() === d.getFullYear() &&
        s.createdAt.getMonth() === d.getMonth() &&
        s.evaluationScore
    );
    const sc = inRange.map((s) => s.evaluationScore!.overallSpeaking);
    out.push({
      month: names[d.getMonth()],
      score: sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0,
      sessions: inRange.length,
    });
  }
  return out;
}
