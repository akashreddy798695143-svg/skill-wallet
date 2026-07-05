/**
 * Shared TypeScript types for Voice-Based Connect.
 * These mirror the API response shapes used across the frontend.
 */

export type Role = "USER" | "ADMIN";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export type Emotion =
  | "happy"
  | "sad"
  | "angry"
  | "neutral"
  | "fear"
  | "surprise";

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  neutral: number;
  fear: number;
  surprise: number;
}

export interface EmotionResultData {
  emotion: Emotion;
  confidence: number;
  scores: EmotionScores;
}

export interface SpeakerVerificationData {
  matchPercent: number;
  verified: boolean;
  confidence: number;
  notes: string;
}

export interface QualityAnalysisData {
  backgroundNoise: number;
  pitch: number;
  volume: number;
  speakingSpeed: number; // words per minute
  clarity: number;
  pronunciationScore: number;
  pauses: number;
  pauseDurationSec: number;
  fluencyScore: number;
  confidenceScore: number;
  grammarScore: number;
  vocabularyScore: number;
  details?: Record<string, number>;
}

export type Rating =
  | "Excellent"
  | "Good"
  | "Average"
  | "Needs Improvement";

export interface EvaluationScoreData {
  pronunciation: number;
  grammar: number;
  communication: number;
  confidence: number;
  vocabulary: number;
  fluency: number;
  overallInterview: number;
  overallSpeaking: number;
  rating: Rating;
}

export interface FeedbackData {
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  recommendedPractice: string[];
  pronunciationSuggestions: string[];
  vocabularySuggestions: string[];
  grammarCorrections: string[];
}

export interface ReportData {
  summary: string;
  feedback: FeedbackData;
}

export interface TranscriptData {
  text: string;
  language: string;
  wordCount: number;
  charCount: number;
}

export interface AudioFileData {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  durationSec: number;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  durationSec: number;
  language: string;
  createdAt: string;
  emotion?: string;
  rating?: string;
  overallSpeaking?: number;
  transcriptPreview?: string;
  audioFile?: AudioFileData | null;
}

export interface SessionDetail extends SessionSummary {
  transcript?: TranscriptData;
  emotionResult?: EmotionResultData;
  speakerVerification?: SpeakerVerificationData;
  qualityAnalysis?: QualityAnalysisData;
  evaluationScore?: EvaluationScoreData;
  report?: ReportData;
}

export interface DashboardData {
  totalSessions: number;
  averageScore: number;
  highestScore: number;
  emotionHistory: { emotion: string; count: number }[];
  speechHistory: { date: string; score: number; rating: string }[];
  weeklyPerformance: { week: string; score: number; sessions: number }[];
  monthlyPerformance: { month: string; score: number; sessions: number }[];
  ratingDistribution: { rating: string; count: number }[];
  scoreTrend: { date: string; score: number }[];
}

export type ViewKey =
  | "landing"
  | "dashboard"
  | "studio"
  | "tts"
  | "history"
  | "admin"
  | "settings";
