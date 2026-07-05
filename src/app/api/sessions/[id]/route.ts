import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import type { SessionDetail } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** GET /api/sessions/[id] — full session detail with all analyses. */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;

  const s = await db.session.findUnique({
    where: { id },
    include: {
      transcript: true,
      emotionResult: true,
      speakerVerification: true,
      qualityAnalysis: true,
      evaluationScore: true,
      report: true,
      audioFile: true,
    },
  });
  if (!s || s.userId !== user.id)
    return errorResponse("Session not found.", 404);

  const detail: SessionDetail = {
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
    transcript: s.transcript
      ? {
          text: s.transcript.text,
          language: s.transcript.language,
          wordCount: s.transcript.wordCount,
          charCount: s.transcript.charCount,
        }
      : undefined,
    emotionResult: s.emotionResult
      ? {
          emotion: s.emotionResult.emotion as never,
          confidence: s.emotionResult.confidence,
          scores: safeParse(s.emotionResult.scores, {
            happy: 0, sad: 0, angry: 0, neutral: 100, fear: 0, surprise: 0,
          }),
        }
      : undefined,
    speakerVerification: s.speakerVerification
      ? {
          matchPercent: s.speakerVerification.matchPercent,
          verified: s.speakerVerification.verified,
          confidence: s.speakerVerification.confidence,
          notes: s.speakerVerification.notes ?? "",
        }
      : undefined,
    qualityAnalysis: s.qualityAnalysis
      ? {
          backgroundNoise: s.qualityAnalysis.backgroundNoise,
          pitch: s.qualityAnalysis.pitch,
          volume: s.qualityAnalysis.volume,
          speakingSpeed: s.qualityAnalysis.speakingSpeed,
          clarity: s.qualityAnalysis.clarity,
          pronunciationScore: s.qualityAnalysis.pronunciationScore,
          pauses: s.qualityAnalysis.pauses,
          pauseDurationSec: s.qualityAnalysis.pauseDurationSec,
          fluencyScore: s.qualityAnalysis.fluencyScore,
          confidenceScore: s.qualityAnalysis.confidenceScore,
          grammarScore: s.qualityAnalysis.grammarScore,
          vocabularyScore: s.qualityAnalysis.vocabularyScore,
          details: s.qualityAnalysis.details ? safeParse(s.qualityAnalysis.details, undefined) : undefined,
        }
      : undefined,
    evaluationScore: s.evaluationScore
      ? {
          pronunciation: s.evaluationScore.pronunciation,
          grammar: s.evaluationScore.grammar,
          communication: s.evaluationScore.communication,
          confidence: s.evaluationScore.confidence,
          vocabulary: s.evaluationScore.vocabulary,
          fluency: s.evaluationScore.fluency,
          overallInterview: s.evaluationScore.overallInterview,
          overallSpeaking: s.evaluationScore.overallSpeaking,
          rating: s.evaluationScore.rating as never,
        }
      : undefined,
    report: s.report
      ? {
          summary: s.report.summary,
          feedback: safeParse(s.report.feedback, {
            strengths: [], weaknesses: [], improvementTips: [],
            recommendedPractice: [], pronunciationSuggestions: [],
            vocabularySuggestions: [], grammarCorrections: [],
          }),
        }
      : undefined,
  };

  return Response.json({ session: detail });
}

/** DELETE /api/sessions/[id] — remove a session and its analyses. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.session.findUnique({ where: { id }, include: { audioFile: true } });
  if (!s || s.userId !== user.id)
    return errorResponse("Session not found.", 404);

  await db.session.delete({ where: { id } });
  return Response.json({ ok: true });
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
