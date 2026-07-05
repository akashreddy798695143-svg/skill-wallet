import { NextRequest } from "next/server";
import { requireUser, errorResponse } from "@/lib/session";
import { synthesizeSpeech } from "@/lib/ai";

/** POST /api/tts — generate speech audio from text and return it as a WAV. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    void user;
    const body = await req.json();
    const text = String(body.text ?? "").trim();
    const voice = String(body.voice ?? "tongtong");
    const speed = Number(body.speed ?? 1.0);
    const format = (body.format === "mp3" ? "mp3" : "wav") as "wav" | "mp3";

    if (!text) return errorResponse("Text is required.", 422);
    if (text.length > 4000)
      return errorResponse("Text too long (max 4000 chars).", 422);

    const buffer = await synthesizeSpeech(text, { voice, speed, format });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "mp3" ? "audio/mpeg" : "audio/wav",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("tts error", err);
    return errorResponse("Speech generation failed.", 500);
  }
}
