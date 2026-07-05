import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { readAudioFile, deleteAudioFile } from "@/lib/audio";

type Params = { params: Promise<{ id: string }> };

/** GET /api/audio/[id] — stream an audio file for playback/download. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const audio = await db.audioFile.findUnique({ where: { id } });
    if (!audio || audio.userId !== user.id)
      return errorResponse("Audio not found.", 404);

    const buf = await readAudioFile(audio.storagePath);
    const download = req.nextUrl.searchParams.get("download") === "1";
    const disposition = download
      ? `attachment; filename="${encodeURIComponent(audio.originalName)}"`
      : "inline";

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": audio.mimeType || "audio/wav",
        "Content-Length": String(buf.length),
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    console.error("audio get error", err);
    return errorResponse("Failed to read audio.", 500);
  }
}

/** DELETE /api/audio/[id] — delete an audio file + its disk artifact. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const audio = await db.audioFile.findUnique({ where: { id } });
    if (!audio || audio.userId !== user.id)
      return errorResponse("Audio not found.", 404);

    await deleteAudioFile(audio.storagePath);
    await db.audioFile.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("audio delete error", err);
    return errorResponse("Failed to delete audio.", 500);
  }
}
