import { NextRequest } from "next/server";
import { db, withDbFallback } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import {
  saveAudioFile,
  isAllowedAudio,
  estimateWavDuration,
} from "@/lib/audio";
import type { AudioFileData } from "@/lib/types";

/** GET /api/audio — list the current user's audio files (newest first). */
export async function GET() {
  const user = await requireUser();
  const files = await withDbFallback(
    async () =>
      db.audioFile.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    []
  );
  const data: AudioFileData[] = files.map((f) => ({
    id: f.id,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    durationSec: f.durationSec,
    createdAt: f.createdAt.toISOString(),
  }));
  return Response.json({ files: data });
}

/** POST /api/audio — upload a new audio file (multipart/form-data, field "file"). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return errorResponse("No audio file provided (field 'file').", 422);

    if (!isAllowedAudio(file.type, file.name))
      return errorResponse(
        "Unsupported audio format. Use WAV, MP3, M4A, OGG or WEBM.",
        422
      );

    // 25 MB cap
    if (file.size > 25 * 1024 * 1024)
      return errorResponse("File too large (max 25 MB).", 422);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const saved = await saveAudioFile(
      new Uint8Array(arrayBuffer),
      file.name,
      file.type
    );

    const durationSec = estimateWavDuration(buffer, file.type);

    const audio = await withDbFallback(
      async () =>
        db.audioFile.create({
          data: {
            userId: user.id,
            filename: saved.filename,
            originalName: file.name,
            mimeType: file.type || "audio/wav",
            size: saved.size,
            durationSec,
            storagePath: saved.storagePath,
          },
        }),
      null
    );

    if (!audio) {
      return Response.json({ file: { id: saved.filename, originalName: file.name, mimeType: file.type || "audio/wav", size: saved.size, durationSec, createdAt: new Date().toISOString() } }, { status: 201 });
    }

    const data: AudioFileData = {
      id: audio.id,
      originalName: audio.originalName,
      mimeType: audio.mimeType,
      size: audio.size,
      durationSec: audio.durationSec,
      createdAt: audio.createdAt.toISOString(),
    };
    return Response.json({ file: data }, { status: 201 });
  } catch (err) {
    console.error("audio upload error", err);
    return errorResponse("Audio upload failed.", 500);
  }
}
