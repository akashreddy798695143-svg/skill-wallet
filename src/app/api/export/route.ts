import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

/** GET /api/export?format=csv — export the current user's sessions as CSV. */
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const format = req.nextUrl.searchParams.get("format") || "csv";
  if (format !== "csv") return Response.json({ error: "Unsupported format" }, { status: 400 });

  const sessions = await db.session.findMany({
    where: { userId: user.id },
    include: {
      transcript: true,
      emotionResult: true,
      evaluationScore: true,
      audioFile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "title",
    "createdAt",
    "durationSec",
    "language",
    "emotion",
    "emotionConfidence",
    "pronunciation",
    "grammar",
    "communication",
    "confidence",
    "vocabulary",
    "fluency",
    "overallInterview",
    "overallSpeaking",
    "rating",
    "transcript",
  ];

  const rows = sessions.map((s) =>
    [
      s.id,
      csv(s.title),
      s.createdAt.toISOString(),
      s.durationSec,
      s.language,
      s.emotionResult?.emotion ?? "",
      s.emotionResult?.confidence ?? "",
      s.evaluationScore?.pronunciation ?? "",
      s.evaluationScore?.grammar ?? "",
      s.evaluationScore?.communication ?? "",
      s.evaluationScore?.confidence ?? "",
      s.evaluationScore?.vocabulary ?? "",
      s.evaluationScore?.fluency ?? "",
      s.evaluationScore?.overallInterview ?? "",
      s.evaluationScore?.overallSpeaking ?? "",
      s.evaluationScore?.rating ?? "",
      csv((s.transcript?.text ?? "").replace(/\s+/g, " ")),
    ].join(",")
  );

  const csvText = [header.join(","), ...rows].join("\n");
  return new Response(csvText, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voice-connect-sessions-${Date.now()}.csv"`,
    },
  });
}

function csv(s: string): string {
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
