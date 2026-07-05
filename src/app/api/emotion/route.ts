import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { detectEmotion } from "@/lib/ai";
import type { EmotionResultData } from "@/lib/types";

/** POST /api/emotion — detect emotion from a session's transcript and store it. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId } = await req.json();
    if (!sessionId) return errorResponse("sessionId is required.", 422);

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
      include: { transcript: true, emotionResult: true },
    });
    if (!session || session.userId !== user.id)
      return errorResponse("Session not found.", 404);
    if (!session.transcript)
      return errorResponse("Transcribe the session first.", 422);

    const result = await detectEmotion(session.transcript.text);

    const row = session.emotionResult
      ? await db.emotionResult.update({
          where: { sessionId: session.id },
          data: {
            emotion: result.emotion,
            confidence: result.confidence,
            scores: JSON.stringify(result.scores),
          },
        })
      : await db.emotionResult.create({
          data: {
            sessionId: session.id,
            emotion: result.emotion,
            confidence: result.confidence,
            scores: JSON.stringify(result.scores),
          },
        });

    const data: EmotionResultData = {
      emotion: row.emotion as EmotionResultData["emotion"],
      confidence: row.confidence,
      scores: JSON.parse(row.scores),
    };
    return Response.json({ emotion: data });
  } catch (err) {
    console.error("emotion error", err);
    return errorResponse("Emotion detection failed.", 500);
  }
}
