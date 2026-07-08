import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import ZAIClient from "z-ai-web-dev-sdk";

const execFileAsync = promisify(execFile);

/**
 * AI service layer for Voice-Based Connect.
 * Wraps the z-ai-web-dev-sdk for:
 *  - ASR (speech -> text)         [OpenAI Whisper-style model]
 *  - TTS (text -> speech)
 *  - LLM (emotion, evaluation, feedback, quality heuristics)
 *
 * NOTE: z-ai-web-dev-sdk MUST run on the server only.
 */

type ZAIInstance = Awaited<ReturnType<typeof ZAIClient.create>>;
let zaiPromise: Promise<ZAIInstance> | null = null;
function getZAI(): Promise<ZAIInstance> {
  if (!zaiPromise) {
    const sdk = (ZAIClient as unknown as { default?: typeof ZAIClient }).default ?? ZAIClient;
    const createClient = (sdk as typeof ZAIClient & { create?: () => Promise<ZAIInstance> }).create;

    if (typeof createClient !== "function") {
      throw new Error("Z.AI SDK is not available in this environment.");
    }

    zaiPromise = createClient();
  }
  return zaiPromise;
}

/* ------------------------------------------------------------------ */
/* ASR — Speech to Text                                                */
/* ------------------------------------------------------------------ */

export async function transcribeAudioFile(filePath: string): Promise<string> {
  try {
    const zai = await getZAI();
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    const response = await zai.audio.asr.create({ file_base64: base64 });
    const text = (response?.text ?? "").trim();
    if (text) return text;
  } catch (error) {
    console.warn("Falling back to placeholder transcription:", error);
  }

  const fallbackName = path.basename(filePath, path.extname(filePath));
  const cleaned = fallbackName
    .replace(/[-_]+/g, " ")
    .replace(/\d+/g, "")
    .trim();

  if (cleaned) {
    return `Transcript unavailable in this environment. Detected audio label: ${cleaned}`;
  }

  return "Transcript unavailable in this environment. Please try again later.";
}

/** Transcribe a raw audio Buffer (already loaded in memory). */
export async function transcribeAudioBuffer(
  buffer: Buffer
): Promise<string> {
  try {
    const zai = await getZAI();
    const base64 = buffer.toString("base64");
    const response = await zai.audio.asr.create({ file_base64: base64 });
    const text = (response?.text ?? "").trim();
    if (text) return text;
  } catch (error) {
    console.warn("Falling back to placeholder transcription:", error);
  }

  return "Transcript unavailable in this environment. Please try again later.";
}

/* ------------------------------------------------------------------ */
/* TTS — Text to Speech                                                */
/* ------------------------------------------------------------------ */

export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0
  format?: "wav" | "mp3" | "pcm";
}

export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const voice = options.voice ?? "tongtong";
  const speed = clamp(options.speed ?? 1.0, 0.5, 2.0);
  const format = options.format ?? "wav";

  try {
    const zai = await getZAI();

    // The TTS API limits input to 1024 chars; chunk longer text and concatenate WAV.
    const chunks = splitText(text, 1000);
    const parts: Buffer[] = [];
    for (const chunk of chunks) {
      const response = await zai.audio.tts.create({
        input: chunk,
        voice,
        speed,
        response_format: format,
        stream: false,
      });
      const ab = await response.arrayBuffer();
      parts.push(Buffer.from(new Uint8Array(ab)));
    }
    return Buffer.concat(parts);
  } catch (error) {
    console.warn("Falling back to built-in speech synthesis:", error);
    return synthesizeWithBuiltinVoice(text, { voice, speed, format });
  }
}

async function synthesizeWithBuiltinVoice(
  text: string,
  options: TTSOptions
): Promise<Buffer> {
  const format = options.format ?? "wav";
  const voice = options.voice ?? "tongtong";
  const speed = clamp(options.speed ?? 1.0, 0.5, 2.0);

  const sampleRate = 22050;
  const durationPerChar = Math.max(0.04, 0.06 / speed);
  const silenceDuration = 0.01;
  const totalDuration = Math.max(0.6, text.length * durationPerChar + silenceDuration * text.length);
  const totalSamples = Math.round(sampleRate * totalDuration);
  const samples = new Float32Array(totalSamples);

  const baseFrequency = mapVoiceToFrequency(voice);
  const chars = text.replace(/\s+/g, " ").trim().split("");

  let cursor = 0;
  for (const ch of chars) {
    if (!ch.trim()) {
      cursor += Math.round(sampleRate * silenceDuration);
      continue;
    }

    const charDuration = Math.max(0.04, durationPerChar + (ch.charCodeAt(0) % 7) * 0.002);
    const charSamples = Math.round(sampleRate * charDuration);
    const freq = Math.max(180, baseFrequency + (ch.charCodeAt(0) % 13) * 12);

    for (let i = 0; i < charSamples && cursor + i < totalSamples; i += 1) {
      const t = (cursor + i) / sampleRate;
      const envelope = Math.sin((i / charSamples) * Math.PI);
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.18;
      samples[cursor + i] += sample;
    }

    cursor += charSamples;
  }

  const pcm = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(sample * 0x7fff), i * 2);
  }

  return createWavBuffer(pcm, sampleRate, format);
}

function createWavBuffer(pcm: Buffer, sampleRate: number, format: TTSOptions["format"]): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function mapVoiceToFrequency(voice: string): number {
  const normalized = voice.toLowerCase();
  switch (normalized) {
    case "jam":
      return 310;
    case "chuichui":
    case "douji":
      return 430;
    case "xiaochen":
    case "luodo":
      return 370;
    case "kazi":
      return 340;
    default:
      return 360;
  }
}

function mapVoiceToSystemVoice(voice: string): string {
  const normalized = voice.toLowerCase();
  switch (normalized) {
    case "tongtong":
    case "chuichui":
    case "xiaochen":
    case "douji":
    case "luodo":
    case "kazi":
      return "Samantha";
    case "jam":
      return "Daniel";
    default:
      return "Samantha";
  }
}

export const AVAILABLE_VOICES = [
  { id: "tongtong", label: "Tongtong — Warm & Friendly" },
  { id: "chuichui", label: "Chuichui — Lively & Cute" },
  { id: "xiaochen", label: "Xiaochen — Steady & Professional" },
  { id: "jam", label: "Jam — British Gentleman" },
  { id: "kazi", label: "Kazi — Clear & Standard" },
  { id: "douji", label: "Douji — Natural & Fluent" },
  { id: "luodo", label: "Luodo — Expressive" },
] as const;

/* ------------------------------------------------------------------ */
/* LLM helpers                                                         */
/* ------------------------------------------------------------------ */

async function llmJSON<T>(system: string, user: string): Promise<T> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return parseJsonLoose<T>(raw);
}

function parseJsonLoose<T>(raw: string): T {
  // Strip markdown code fences if present
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Find the first { ... } block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text) as T;
}

/* ------------------------------------------------------------------ */
/* Emotion Detection                                                   */
/* ------------------------------------------------------------------ */

import type {
  EmotionResultData,
  SpeakerVerificationData,
  QualityAnalysisData,
  EvaluationScoreData,
  ReportData,
} from "@/lib/types";

export async function detectEmotion(
  transcript: string
): Promise<EmotionResultData> {
  const system =
    "You are an emotion detection engine for spoken content. Analyze the transcript and classify the dominant emotion from: happy, sad, angry, neutral, fear, surprise. Respond ONLY with strict JSON.";
  const user = `Transcript:\n"""${transcript}"""\n\nReturn JSON exactly in this shape:\n{"emotion":"happy|sad|angry|neutral|fear|surprise","confidence":0-100,"scores":{"happy":0-100,"sad":0-100,"angry":0-100,"neutral":0-100,"fear":0-100,"surprise":0-100}}\nThe "scores" are probabilities for EACH emotion (0-100) summing roughly to 100. "emotion" must be the argmax of scores. "confidence" is the score of the dominant emotion.`;

  const fallback: EmotionResultData = {
    emotion: "neutral",
    confidence: 50,
    scores: {
      happy: 10,
      sad: 10,
      angry: 10,
      neutral: 50,
      fear: 10,
      surprise: 10,
    },
  };

  try {
    const data = await llmJSON<Partial<EmotionResultData>>(system, user);
    const scores = { ...fallback.scores, ...(data.scores ?? {}) };
    const emotion = (data.emotion as EmotionResultData["emotion"]) ?? "neutral";
    const confidence = clamp(Number(data.confidence ?? 50), 0, 100);
    return { emotion, confidence, scores };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Speaker Verification (heuristic, LLM-assisted)                      */
/* ------------------------------------------------------------------ */

export async function verifySpeaker(
  referenceText: string,
  sampleText: string
): Promise<SpeakerVerificationData> {
  // Textual similarity (normalized) as a base signal.
  const sim = textSimilarity(referenceText, sampleText); // 0-1
  const baseMatch = sim * 100;

  const system =
    "You are a speaker verification assistant. Given two transcriptions purportedly from the same speaker repeating similar content, estimate a voice-consistency match and confidence. Respond ONLY with strict JSON.";
  const user = `Reference transcript:\n"""${referenceText}"""\n\nSample transcript:\n"""${sampleText}"""\n\nReturn JSON exactly: {"matchPercent":0-100,"confidence":0-100,"notes":"one sentence"}\nmatchPercent reflects how likely both come from the same speaker given wording, phrasing style, vocabulary and consistency.`;

  const fallback: SpeakerVerificationData = {
    matchPercent: Math.round(baseMatch),
    verified: baseMatch >= 60,
    confidence: 60,
    notes: "Heuristic estimate based on transcript similarity.",
  };

  try {
    const data = await llmJSON<Partial<SpeakerVerificationData>>(system, user);
    const matchPercent = clamp(
      Number(data.matchPercent ?? baseMatch),
      0,
      100
    );
    const confidence = clamp(Number(data.confidence ?? 60), 0, 100);
    return {
      matchPercent: Math.round(matchPercent),
      verified: matchPercent >= 60,
      confidence: Math.round(confidence),
      notes: data.notes ?? fallback.notes,
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Audio Quality Analysis                                              */
/* ------------------------------------------------------------------ */

export interface ClientAudioMetrics {
  volume: number; // 0-100 (RMS-based loudness)
  backgroundNoise: number; // 0-100 (noise floor estimate)
  pitch: number; // Hz
  durationSec: number;
}

export async function analyzeQuality(
  transcript: string,
  metrics: ClientAudioMetrics
): Promise<QualityAnalysisData> {
  const durationSec = Math.max(metrics.durationSec, 0.1);
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const wpm = Math.round((words / durationSec) * 60);

  const system =
    "You are an audio-quality and speech-analysis engine. Given a transcript and measured audio metrics, estimate speech-quality scores. Respond ONLY with strict JSON.";
  const user = `Transcript:\n"""${transcript}"""\n\nMeasured metrics:\n- volume (0-100): ${metrics.volume}\n- backgroundNoise (0-100): ${metrics.backgroundNoise}\n- pitch (Hz): ${Math.round(metrics.pitch)}\n- duration (s): ${durationSec.toFixed(1)}\n- words: ${words} (=> ${wpm} wpm)\n\nReturn JSON exactly: {"clarity":0-100,"pronunciationScore":0-100,"pauses":int,"pauseDurationSec":0-99,"fluencyScore":0-100,"confidenceScore":0-100,"grammarScore":0-100,"vocabularyScore":0-100,"details":{}}`;

  const fallback: QualityAnalysisData = {
    backgroundNoise: clamp(metrics.backgroundNoise, 0, 100),
    pitch: Math.round(metrics.pitch),
    volume: clamp(metrics.volume, 0, 100),
    speakingSpeed: wpm,
    clarity: 60,
    pronunciationScore: 60,
    pauses: 0,
    pauseDurationSec: 0,
    fluencyScore: 60,
    confidenceScore: 60,
    grammarScore: 60,
    vocabularyScore: 60,
  };

  try {
    const d = await llmJSON<Partial<QualityAnalysisData>>(system, user);
    return {
      backgroundNoise: clamp(metrics.backgroundNoise, 0, 100),
      pitch: Math.round(metrics.pitch),
      volume: clamp(metrics.volume, 0, 100),
      speakingSpeed: wpm,
      clarity: clampNum(d.clarity, 60),
      pronunciationScore: clampNum(d.pronunciationScore, 60),
      pauses: Number(d.pauses ?? 0) | 0,
      pauseDurationSec: clampNum(d.pauseDurationSec, 0),
      fluencyScore: clampNum(d.fluencyScore, 60),
      confidenceScore: clampNum(d.confidenceScore, 60),
      grammarScore: clampNum(d.grammarScore, 60),
      vocabularyScore: clampNum(d.vocabularyScore, 60),
      details: d.details,
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* AI Evaluation + Feedback                                            */
/* ------------------------------------------------------------------ */

export interface EvaluationBundle {
  evaluation: EvaluationScoreData;
  report: ReportData;
}

export async function evaluateSession(
  transcript: string,
  quality: QualityAnalysisData
): Promise<EvaluationBundle> {
  const system =
    "You are an AI interview & speech coach. Score the candidate's spoken performance from the transcript and quality metrics. Respond ONLY with strict JSON.";
  const user = `Transcript:\n"""${transcript}"""\n\nQuality metrics: clarity=${quality.clarity}, pronunciation=${quality.pronunciationScore}, fluency=${quality.fluencyScore}, grammar=${quality.grammarScore}, vocabulary=${quality.vocabularyScore}, confidence=${quality.confidenceScore}, speakingSpeed=${quality.speakingSpeed}wpm, pauses=${quality.pauses}.\n\nReturn JSON exactly in this shape:\n{\n  "evaluation": {"pronunciation":0-100,"grammar":0-100,"communication":0-100,"confidence":0-100,"vocabulary":0-100,"fluency":0-100,"overallInterview":0-100,"overallSpeaking":0-100,"rating":"Excellent|Good|Average|Needs Improvement"},\n  "report": {\n    "summary": "2-3 sentence summary",\n    "feedback": {\n      "strengths": ["..."],\n      "weaknesses": ["..."],\n      "improvementTips": ["..."],\n      "recommendedPractice": ["..."],\n      "pronunciationSuggestions": ["..."],\n      "vocabularySuggestions": ["..."],\n      "grammarCorrections": ["..."]\n    }\n  }\n}\nProduce at least 3 items in each feedback array. overallSpeaking is the weighted average of the six sub-scores. rating maps from overallSpeaking: >=85 Excellent, >=70 Good, >=50 Average, else Needs Improvement.`;

  const fallback: EvaluationBundle = {
    evaluation: {
      pronunciation: quality.pronunciationScore,
      grammar: quality.grammarScore,
      communication: 60,
      confidence: quality.confidenceScore,
      vocabulary: quality.vocabularyScore,
      fluency: quality.fluencyScore,
      overallInterview: 60,
      overallSpeaking: 60,
      rating: "Average",
    },
    report: {
      summary: "Unable to generate a detailed AI report; showing fallback scores.",
      feedback: {
        strengths: ["Completed the speaking session."],
        weaknesses: ["Detailed analysis unavailable."],
        improvementTips: ["Try recording again in a quieter environment."],
        recommendedPractice: ["Read aloud daily for 5 minutes."],
        pronunciationSuggestions: ["Articulate consonant endings clearly."],
        vocabularySuggestions: ["Use varied descriptive words."],
        grammarCorrections: ["Keep subject-verb agreement consistent."],
      },
    },
  };

  try {
    const data = await llmJSON<{
      evaluation: Partial<EvaluationScoreData>;
      report: Partial<ReportData>;
    }>(system, user);

    const e = data.evaluation ?? {};
    const pronunciation = clampNum(e.pronunciation, quality.pronunciationScore);
    const grammar = clampNum(e.grammar, quality.grammarScore);
    const communication = clampNum(e.communication, 60);
    const confidence = clampNum(e.confidence, quality.confidenceScore);
    const vocabulary = clampNum(e.vocabulary, quality.vocabularyScore);
    const fluency = clampNum(e.fluency, quality.fluencyScore);
    const overallSpeaking =
      e.overallSpeaking != null
        ? clampNum(e.overallSpeaking, 0)
        : Math.round(
            (pronunciation + grammar + communication + confidence + vocabulary + fluency) / 6
          );
    const overallInterview = clampNum(e.overallInterview, overallSpeaking);
    const rating =
      (e.rating as EvaluationScoreData["rating"]) ??
      ratingFromScore(overallSpeaking);

    const f = data.report?.feedback ?? {};
    const report: ReportData = {
      summary: data.report?.summary ?? fallback.report.summary,
      feedback: {
        strengths: arr(f.strengths, fallback.report.feedback.strengths),
        weaknesses: arr(f.weaknesses, fallback.report.feedback.weaknesses),
        improvementTips: arr(f.improvementTips, fallback.report.feedback.improvementTips),
        recommendedPractice: arr(f.recommendedPractice, fallback.report.feedback.recommendedPractice),
        pronunciationSuggestions: arr(f.pronunciationSuggestions, fallback.report.feedback.pronunciationSuggestions),
        vocabularySuggestions: arr(f.vocabularySuggestions, fallback.report.feedback.vocabularySuggestions),
        grammarCorrections: arr(f.grammarCorrections, fallback.report.feedback.grammarCorrections),
      },
    };

    return {
      evaluation: {
        pronunciation,
        grammar,
        communication,
        confidence,
        vocabulary,
        fluency,
        overallInterview,
        overallSpeaking,
        rating,
      },
      report,
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
function clampNum(v: unknown, def: number): number {
  const n = Number(v);
  if (Number.isNaN(n)) return def;
  return clamp(n, 0, 100);
}
function arr(v: unknown, def: string[]): string[] {
  if (Array.isArray(v) && v.length) return v.map(String);
  return def;
}
function ratingFromScore(score: number): EvaluationScoreData["rating"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

/** Split text into chunks no longer than maxLen, on sentence boundaries. */
export function splitText(text: string, maxLen = 1000): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length <= maxLen) cur += s;
    else {
      if (cur) chunks.push(cur.trim());
      cur = s;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

/** Normalized similarity between two strings (token overlap + Jaccard). 0-1. */
export function textSimilarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return inter / union;
}

export { clamp as clampNumber };
