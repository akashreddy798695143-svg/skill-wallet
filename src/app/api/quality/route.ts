import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { analyzeQuality, type ClientAudioMetrics } from "@/lib/ai";
import type { QualityAnalysisData } from "@/lib/types";

/** POST /api/quality — analyze audio quality using transcript + client metrics. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId, metrics } = await req.json();
    if (!sessionId) return errorResponse("sessionId is required.", 422);

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
      include: { transcript: true, qualityAnalysis: true, audioFile: true },
    });
    if (!session || session.userId !== user.id)
      return errorResponse("Session not found.", 404);
    if (!session.transcript)
      return errorResponse("Transcribe the session first.", 422);

    const clientMetrics: ClientAudioMetrics = {
      volume: Number(metrics?.volume ?? 60),
      backgroundNoise: Number(metrics?.backgroundNoise ?? 25),
      pitch: Number(metrics?.pitch ?? 180),
      durationSec: Number(metrics?.durationSec ?? session.audioFile?.durationSec ?? 5),
    };

    const result = await analyzeQuality(session.transcript.text, clientMetrics);

    const data = {
      backgroundNoise: result.backgroundNoise,
      pitch: result.pitch,
      volume: result.volume,
      speakingSpeed: result.speakingSpeed,
      clarity: result.clarity,
      pronunciationScore: result.pronunciationScore,
      pauses: result.pauses,
      pauseDurationSec: result.pauseDurationSec,
      fluencyScore: result.fluencyScore,
      confidenceScore: result.confidenceScore,
      grammarScore: result.grammarScore,
      vocabularyScore: result.vocabularyScore,
      details: result.details ? JSON.stringify(result.details) : null,
    };

    const row = session.qualityAnalysis
      ? await db.qualityAnalysis.update({
          where: { sessionId: session.id },
          data,
        })
      : await db.qualityAnalysis.create({
          data: { sessionId: session.id, ...data },
        });

    const out: QualityAnalysisData = {
      backgroundNoise: row.backgroundNoise,
      pitch: row.pitch,
      volume: row.volume,
      speakingSpeed: row.speakingSpeed,
      clarity: row.clarity,
      pronunciationScore: row.pronunciationScore,
      pauses: row.pauses,
      pauseDurationSec: row.pauseDurationSec,
      fluencyScore: row.fluencyScore,
      confidenceScore: row.confidenceScore,
      grammarScore: row.grammarScore,
      vocabularyScore: row.vocabularyScore,
      details: row.details ? safeParse(row.details) : undefined,
    };
    return Response.json({ quality: out });
  } catch (err) {
    console.error("quality error", err);
    return errorResponse("Quality analysis failed.", 500);
  }
}

function safeParse(raw: string): Record<string, number> | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
