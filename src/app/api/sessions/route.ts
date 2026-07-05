import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import type { SessionSummary } from "@/lib/types";

/** GET /api/sessions — list sessions for the current user (search + filter). */
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search")?.trim() || "";
  const rating = sp.get("rating") || "";
  const emotion = sp.get("emotion") || "";
  const sort = sp.get("sort") || "newest";

  const where: Record<string, unknown> = { userId: user.id };
  if (rating) where["evaluationScore"] = { is: { rating } };
  if (emotion) where["emotionResult"] = { is: { emotion } };
  if (search) {
    where["OR"] = [
      { title: { contains: search } },
      { transcript: { text: { contains: search } } },
    ];
  }

  const orderBy: Record<string, "asc" | "desc"> =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "best"
        ? { evaluationScore: { overallSpeaking: "desc" } }
        : sort === "worst"
          ? { evaluationScore: { overallSpeaking: "asc" } }
          : { createdAt: "desc" };

  const sessions = await db.session.findMany({
    where,
    orderBy: orderBy as never,
    include: {
      transcript: true,
      emotionResult: true,
      evaluationScore: true,
      audioFile: true,
    },
    take: 200,
  });

  const data: SessionSummary[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    durationSec: s.durationSec,
    language: s.language,
    createdAt: s.createdAt.toISOString(),
    emotion: s.emotionResult?.emotion,
    rating: s.evaluationScore?.rating,
    overallSpeaking: s.evaluationScore?.overallSpeaking,
    transcriptPreview: s.transcript?.text?.slice(0, 160),
    audioFile: s.audioFile
      ? {
          id: s.audioFile.id,
          originalName: s.audioFile.originalName,
          mimeType: s.audioFile.mimeType,
          size: s.audioFile.size,
          durationSec: s.audioFile.durationSec,
          createdAt: s.audioFile.createdAt.toISOString(),
        }
      : null,
  }));

  return Response.json({ sessions: data });
}

/** POST /api/sessions — create a new session linked to an audio file. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { audioFileId, title } = await req.json();
    if (!audioFileId)
      return errorResponse("audioFileId is required.", 422);

    const audio = await db.audioFile.findUnique({ where: { id: String(audioFileId) } });
    if (!audio || audio.userId !== user.id)
      return errorResponse("Audio file not found.", 404);

    const session = await db.session.create({
      data: {
        userId: user.id,
        audioFileId: audio.id,
        title: title ? String(title) : audio.originalName,
        durationSec: audio.durationSec,
      },
    });

    return Response.json(
      { session: { id: session.id, title: session.title, createdAt: session.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (err) {
    console.error("session create error", err);
    return errorResponse("Failed to create session.", 500);
  }
}
