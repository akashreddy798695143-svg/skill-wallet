import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { evaluateSession } from "@/lib/ai";
import type { EvaluationScoreData, ReportData } from "@/lib/types";

/** POST /api/evaluate — run AI evaluation + feedback and store scores + report. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId } = await req.json();
    if (!sessionId) return errorResponse("sessionId is required.", 422);

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
      include: {
        transcript: true,
        qualityAnalysis: true,
        evaluationScore: true,
        report: true,
      },
    });
    if (!session || session.userId !== user.id)
      return errorResponse("Session not found.", 404);
    if (!session.transcript)
      return errorResponse("Transcribe the session first.", 422);
    if (!session.qualityAnalysis)
      return errorResponse("Run audio quality analysis first.", 422);

    const q = session.qualityAnalysis;
    const quality = {
      backgroundNoise: q.backgroundNoise,
      pitch: q.pitch,
      volume: q.volume,
      speakingSpeed: q.speakingSpeed,
      clarity: q.clarity,
      pronunciationScore: q.pronunciationScore,
      pauses: q.pauses,
      pauseDurationSec: q.pauseDurationSec,
      fluencyScore: q.fluencyScore,
      confidenceScore: q.confidenceScore,
      grammarScore: q.grammarScore,
      vocabularyScore: q.vocabularyScore,
    };

    const bundle = await evaluateSession(session.transcript.text, quality);

    // Upsert evaluation score
    const evalRow = session.evaluationScore
      ? await db.evaluationScore.update({
          where: { sessionId: session.id },
          data: {
            pronunciation: bundle.evaluation.pronunciation,
            grammar: bundle.evaluation.grammar,
            communication: bundle.evaluation.communication,
            confidence: bundle.evaluation.confidence,
            vocabulary: bundle.evaluation.vocabulary,
            fluency: bundle.evaluation.fluency,
            overallInterview: bundle.evaluation.overallInterview,
            overallSpeaking: bundle.evaluation.overallSpeaking,
            rating: bundle.evaluation.rating,
          },
        })
      : await db.evaluationScore.create({
          data: {
            sessionId: session.id,
            pronunciation: bundle.evaluation.pronunciation,
            grammar: bundle.evaluation.grammar,
            communication: bundle.evaluation.communication,
            confidence: bundle.evaluation.confidence,
            vocabulary: bundle.evaluation.vocabulary,
            fluency: bundle.evaluation.fluency,
            overallInterview: bundle.evaluation.overallInterview,
            overallSpeaking: bundle.evaluation.overallSpeaking,
            rating: bundle.evaluation.rating,
          },
        });

    const reportData = JSON.stringify(bundle.report.feedback);
    const reportRow = session.report
      ? await db.report.update({
          where: { sessionId: session.id },
          data: { summary: bundle.report.summary, feedback: reportData },
        })
      : await db.report.create({
          data: {
            sessionId: session.id,
            summary: bundle.report.summary,
            feedback: reportData,
          },
        });

    const evaluation: EvaluationScoreData = {
      pronunciation: evalRow.pronunciation,
      grammar: evalRow.grammar,
      communication: evalRow.communication,
      confidence: evalRow.confidence,
      vocabulary: evalRow.vocabulary,
      fluency: evalRow.fluency,
      overallInterview: evalRow.overallInterview,
      overallSpeaking: evalRow.overallSpeaking,
      rating: evalRow.rating as EvaluationScoreData["rating"],
    };

    const report: ReportData = {
      summary: reportRow.summary,
      feedback: JSON.parse(reportRow.feedback),
    };

    return Response.json({ evaluation, report });
  } catch (err) {
    console.error("evaluate error", err);
    return errorResponse("AI evaluation failed.", 500);
  }
}
