import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { verifySpeaker, transcribeAudioBuffer } from "@/lib/ai";
import { readAudioFile } from "@/lib/audio";
import type { SpeakerVerificationData } from "@/lib/types";

/**
 * POST /api/speaker-verify
 * Body: { sessionId, referenceAudioId }
 * Transcribes the reference audio and compares it to the session's transcript
 * to estimate speaker match %, verified status and confidence.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId, referenceAudioId } = await req.json();
    if (!sessionId || !referenceAudioId)
      return errorResponse("sessionId and referenceAudioId are required.", 422);

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
      include: { transcript: true, speakerVerification: true },
    });
    if (!session || session.userId !== user.id)
      return errorResponse("Session not found.", 404);
    if (!session.transcript)
      return errorResponse("Transcribe the session first.", 422);

    const ref = await db.audioFile.findUnique({
      where: { id: String(referenceAudioId) },
    });
    if (!ref || ref.userId !== user.id)
      return errorResponse("Reference audio not found.", 404);

    const refBuffer = await readAudioFile(ref.storagePath);
    const refText = await transcribeAudioBuffer(refBuffer);
    const finalRefText = refText && refText.length > 0 ? refText : "(No speech in reference.)";

    const result = await verifySpeaker(finalRefText, session.transcript.text);

    const row = session.speakerVerification
      ? await db.speakerVerification.update({
          where: { sessionId: session.id },
          data: {
            matchPercent: result.matchPercent,
            verified: result.verified,
            confidence: result.confidence,
            notes: result.notes,
          },
        })
      : await db.speakerVerification.create({
          data: {
            sessionId: session.id,
            matchPercent: result.matchPercent,
            verified: result.verified,
            confidence: result.confidence,
            notes: result.notes,
          },
        });

    const data: SpeakerVerificationData = {
      matchPercent: row.matchPercent,
      verified: row.verified,
      confidence: row.confidence,
      notes: row.notes ?? "",
    };
    return Response.json({ verification: data });
  } catch (err) {
    console.error("speaker-verify error", err);
    return errorResponse("Speaker verification failed.", 500);
  }
}
