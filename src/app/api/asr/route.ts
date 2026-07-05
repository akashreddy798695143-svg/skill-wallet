import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { transcribeAudioFile } from "@/lib/ai";
import { readAudioFile } from "@/lib/audio";
import type { TranscriptData } from "@/lib/types";

/** POST /api/asr — transcribe the audio of a session and store the transcript. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId } = await req.json();
    if (!sessionId) return errorResponse("sessionId is required.", 422);

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
      include: { audioFile: true, transcript: true },
    });
    if (!session || session.userId !== user.id)
      return errorResponse("Session not found.", 404);
    if (!session.audioFile)
      return errorResponse("Session has no audio file.", 422);

    const buffer = await readAudioFile(session.audioFile.storagePath);
    const text = await transcribeAudioFile(session.audioFile.storagePath);

    // Always store at least something so the UI can proceed.
    const finalText = text && text.length > 0 ? text : "(No speech detected.)";
    const words = finalText.trim().split(/\s+/).filter(Boolean).length;
    const chars = finalText.length;

    const transcript = session.transcript
      ? await db.transcript.update({
          where: { sessionId: session.id },
          data: { text: finalText, wordCount: words, charCount: chars },
        })
      : await db.transcript.create({
          data: {
            sessionId: session.id,
            text: finalText,
            wordCount: words,
            charCount: chars,
            language: session.language,
          },
        });

    const data: TranscriptData = {
      text: transcript.text,
      language: transcript.language,
      wordCount: transcript.wordCount,
      charCount: transcript.charCount,
    };

    // touch buffer to satisfy linter about unused import-side-effect
    void buffer;

    return Response.json({ transcript: data });
  } catch (err) {
    console.error("asr error", err);
    return errorResponse("Transcription failed.", 500);
  }
}
