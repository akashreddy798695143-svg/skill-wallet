"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Upload,
  Trash2,
  Download,
  Play,
  AudioLines,
  MessagesSquare,
  Smile,
  ShieldCheck,
  Gauge,
  Brain,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileAudio,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type {
  AudioFileData,
  TranscriptData,
  EmotionResultData,
  SpeakerVerificationData,
  QualityAnalysisData,
  EvaluationScoreData,
  ReportData,
} from "@/lib/types";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { Spinner } from "@/components/shared/loaders";
import { ScoreBadge, ScoreRing, StatBar } from "@/components/shared/score-display";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const EMOTION_COLORS: Record<string, string> = {
  happy: "var(--chart-1)",
  sad: "var(--chart-4)",
  angry: "var(--destructive)",
  neutral: "var(--muted-foreground)",
  fear: "var(--chart-5)",
  surprise: "var(--chart-3)",
};

export function StudioView() {
  const recorder = useAudioRecorder();
  const [audioFile, setAudioFile] = useState<AudioFileData | null>(null);
  const [library, setLibrary] = useState<AudioFileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [emotion, setEmotion] = useState<EmotionResultData | null>(null);
  const [verification, setVerification] = useState<SpeakerVerificationData | null>(null);
  const [quality, setQuality] = useState<QualityAnalysisData | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationScoreData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    try {
      const res = await api.get<{ files: AudioFileData[] }>("/api/audio");
      setLibrary(res.files);
    } catch {
      /* ignore */
    }
  }, []);

  const uploadBlob = useCallback(async (blob: Blob, mime: string, name: string) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", blob, name);
      const res = await api.postForm<{ file: AudioFileData }>("/api/audio", form);
      setAudioFile(res.file);
      await loadLibrary();
      toast.success("Audio ready");
      resetAnalysis();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [loadLibrary]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLibrary();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLibrary]);

  // When a new recording completes, upload it automatically.
  useEffect(() => {
    if (!recorder.audio) return;

    const timer = window.setTimeout(() => {
      void uploadBlob(recorder.audio.blob, recorder.audio.mimeType, `recording-${Date.now()}.webm`);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [recorder.audio, uploadBlob]);

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.type || "audio/wav", file.name);
    e.target.value = "";
  }

  function selectFromLibrary(f: AudioFileData) {
    setAudioFile(f);
    resetAnalysis();
    toast.success(`Selected: ${f.originalName}`);
  }

  function resetAnalysis() {
    setSessionId(null);
    setTranscript(null);
    setEmotion(null);
    setVerification(null);
    setQuality(null);
    setEvaluation(null);
    setReport(null);
  }

  async function deleteAudio() {
    if (!audioFile) return;
    try {
      await api.del(`/api/audio/${audioFile.id}`);
      toast.success("Audio deleted");
      setAudioFile(null);
      resetAnalysis();
      await loadLibrary();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId;
    if (!audioFile) return null;
    try {
      const res = await api.post<{ session: { id: string } }>("/api/sessions", {
        audioFileId: audioFile.id,
        title: audioFile.originalName,
      });
      setSessionId(res.session.id);
      return res.session.id;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to start session");
      return null;
    }
  }

  async function runTranscribe() {
    const id = await ensureSession();
    if (!id) return;
    setBusy("asr");
    try {
      const res = await api.post<{ transcript: TranscriptData }>("/api/asr", { sessionId: id });
      setTranscript(res.transcript);
      toast.success("Transcription complete");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Transcription failed");
    } finally {
      setBusy(null);
    }
  }

  async function runEmotion() {
    const id = await ensureSession();
    if (!id) return;
    if (!transcript) return toast.error("Transcribe first.");
    setBusy("emotion");
    try {
      const res = await api.post<{ emotion: EmotionResultData }>("/api/emotion", { sessionId: id });
      setEmotion(res.emotion);
      toast.success("Emotion detected");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Emotion detection failed");
    } finally {
      setBusy(null);
    }
  }

  async function runQuality() {
    const id = await ensureSession();
    if (!id) return;
    if (!transcript) return toast.error("Transcribe first.");
    setBusy("quality");
    try {
      const metrics = recorder.metrics
        ? {
            volume: recorder.metrics.volume,
            backgroundNoise: recorder.metrics.backgroundNoise,
            pitch: recorder.metrics.pitch,
            durationSec: recorder.metrics.durationSec,
          }
        : undefined;
      const res = await api.post<{ quality: QualityAnalysisData }>("/api/quality", {
        sessionId: id,
        metrics,
      });
      setQuality(res.quality);
      toast.success("Quality analysis complete");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Quality analysis failed");
    } finally {
      setBusy(null);
    }
  }

  async function runEvaluate() {
    const id = await ensureSession();
    if (!id) return;
    if (!transcript) return toast.error("Transcribe first.");
    if (!quality) return toast.error("Run quality analysis first.");
    setBusy("evaluate");
    try {
      const res = await api.post<{ evaluation: EvaluationScoreData; report: ReportData }>(
        "/api/evaluate",
        { sessionId: id }
      );
      setEvaluation(res.evaluation);
      setReport(res.report);
      toast.success("AI evaluation complete");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Evaluation failed");
    } finally {
      setBusy(null);
    }
  }

  async function runSpeakerVerify(referenceId: string) {
    const id = await ensureSession();
    if (!id) return;
    if (!transcript) return toast.error("Transcribe first.");
    setBusy("speaker");
    try {
      const res = await api.post<{ verification: SpeakerVerificationData }>(
        "/api/speaker-verify",
        { sessionId: id, referenceAudioId: referenceId }
      );
      setVerification(res.verification);
      toast.success("Speaker verification complete");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Speaker verification failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAll() {
    await runTranscribe();
    // chain (uses latest transcript via state — re-read from API to be safe)
    const id = sessionId ?? (await ensureSession());
    if (!id) return;
    // fetch fresh transcript
    let t = transcript;
    if (!t) {
      try {
        const det = await api.get<{ session: { transcript?: TranscriptData } }>(`/api/sessions/${id}`);
        t = det.session.transcript ?? null;
        if (t) setTranscript(t);
      } catch {
        /* ignore */
      }
    }
    if (!t) return;
    setBusy("quality");
    try {
      const metrics = recorder.metrics
        ? {
            volume: recorder.metrics.volume,
            backgroundNoise: recorder.metrics.backgroundNoise,
            pitch: recorder.metrics.pitch,
            durationSec: recorder.metrics.durationSec,
          }
        : undefined;
      const q = await api.post<{ quality: QualityAnalysisData }>("/api/quality", { sessionId: id, metrics });
      setQuality(q.quality);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Quality failed");
    } finally {
      setBusy(null);
    }
    // emotion + evaluate
    setBusy("emotion");
    try {
      const em = await api.post<{ emotion: EmotionResultData }>("/api/emotion", { sessionId: id });
      setEmotion(em.emotion);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
    setBusy("evaluate");
    try {
      const ev = await api.post<{ evaluation: EvaluationScoreData; report: ReportData }>(
        "/api/evaluate",
        { sessionId: id }
      );
      setEvaluation(ev.evaluation);
      setReport(ev.report);
      toast.success("Full analysis complete!");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Evaluation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Voice Studio"
        description="Record or upload audio, transcribe it, and run the full AI analysis suite."
        icon={Mic}
        action={
          audioFile && transcript ? (
            <Button onClick={runAll} disabled={!!busy} className="brand-gradient text-white font-semibold">
              {busy ? <Spinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Run Full Analysis
            </Button>
          ) : undefined
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: capture + library */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Record" subtitle="Use your microphone">
            <RecorderPanel recorder={recorder} />
          </Card>

          <Card title="Upload" subtitle="WAV, MP3, M4A, OGG, WEBM (max 25MB)">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
              <span className="font-medium text-foreground">
                {uploading ? "Uploading…" : "Click to choose a file"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg"
              className="sr-only"
              aria-label="Upload audio file"
              onChange={handleFileInput}
            />
          </Card>

          {library.length > 0 && (
            <Card title="Audio Library" subtitle="Pick a previously uploaded file">
              <div className="space-y-1.5 max-h-56 overflow-y-auto fancy-scroll pr-1">
                {library.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => selectFromLibrary(f)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted transition ${
                      audioFile?.id === f.id ? "bg-primary/10 ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <FileAudio className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate">{f.originalName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {f.durationSec ? `${f.durationSec.toFixed(1)}s` : `${(f.size / 1024).toFixed(0)}KB`}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: player + transcript + analyses */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Current Audio" subtitle={audioFile ? audioFile.originalName : "No audio selected"}>
            {audioFile ? (
              <div className="space-y-4">
                <audio
                  key={audioFile.id}
                  controls
                  src={`/api/audio/${audioFile.id}`}
                  className="w-full"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/audio/${audioFile.id}?download=1`, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-1.5" /> Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={deleteAudio}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {audioFile.durationSec ? `${audioFile.durationSec.toFixed(1)}s · ` : ""}
                    {(audioFile.size / 1024).toFixed(0)} KB · {audioFile.mimeType}
                  </div>
                </div>
                {!transcript && (
                  <Button onClick={runTranscribe} disabled={!!busy} className="w-full brand-gradient text-white font-semibold">
                    {busy === "asr" ? <Spinner className="mr-2" /> : <MessagesSquare className="h-4 w-4 mr-2" />}
                    Transcribe with AI
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Mic className="h-8 w-8 opacity-40" />
                Record or upload audio to begin.
              </div>
            )}
          </Card>

          {transcript && (
            <Card
              title="Transcript"
              subtitle={`${transcript.wordCount} words · ${transcript.language}`}
              action={
                <Button size="sm" variant="ghost" onClick={runTranscribe} disabled={!!busy}>
                  {busy === "asr" ? <Spinner className="mr-1.5" /> : null} Re-run
                </Button>
              }
            >
              <TranscriptReveal key={transcript.text} text={transcript.text} />
            </Card>
          )}

          {transcript && (
            <div className="grid sm:grid-cols-2 gap-4">
              <EmotionPanel emotion={emotion} busy={busy === "emotion"} onRun={runEmotion} />
              <QualityPanel quality={quality} busy={busy === "quality"} onRun={runQuality} />
              <SpeakerVerifyPanel
                verification={verification}
                busy={busy === "speaker"}
                onRun={runSpeakerVerify}
                library={library}
                currentId={audioFile?.id}
              />
              <EvaluationPanel
                evaluation={evaluation}
                busy={busy === "evaluate"}
                onRun={runEvaluate}
                qualityReady={!!quality}
              />
            </div>
          )}

          {report && evaluation && (
            <FeedbackPanel report={report} rating={evaluation.rating} overall={evaluation.overallSpeaking} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Recorder panel ---------------- */
function RecorderPanel({ recorder }: { recorder: ReturnType<typeof useAudioRecorder> }) {
  const { recording, seconds, level, audio, error, start, stop, reset } = recorder;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (error) {
    return (
      <div className="text-sm text-destructive space-y-2">
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={start}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          onClick={recording ? stop : start}
          className={`h-20 w-20 rounded-full grid place-items-center text-white transition shadow-lg ${
            recording ? "bg-destructive animate-pulse-ring" : "brand-gradient hover:scale-105"
          }`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? <Square className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
        </button>
      </div>
      <div className="text-2xl font-mono font-bold tabular-nums">
        {mm}:{ss}
      </div>
      {recording && (
        <div className="flex items-end gap-0.5 h-6 text-primary">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full brand-gradient"
              style={{
                height: `${Math.max(8, Math.min(100, (Math.sin(Date.now() / 120 + i) * 0.5 + 0.5) * level * 100 + 8))}%`,
                transition: "height 80ms",
              }}
            />
          ))}
        </div>
      )}
      {audio && !recording && (
        <div className="w-full space-y-2">
          <audio controls src={audio.url} className="w-full h-9" />
          <Button size="sm" variant="outline" className="w-full" onClick={reset}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Discard & re-record
          </Button>
        </div>
      )}
      {!recording && !audio && (
        <p className="text-xs text-muted-foreground text-center">
          Tap the mic to start. Recording stops & uploads automatically.
        </p>
      )}
    </div>
  );
}

/* ---------------- Transcript reveal ---------------- */
function TranscriptReveal({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const words = text.split(" ");
    let i = 0;
    const interval = setInterval(() => {
      i += 2;
      setShown(words.slice(0, i).join(" "));
      if (i >= words.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {shown}
      <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 align-middle animate-pulse" />
    </p>
  );
}

/* ---------------- Emotion panel ---------------- */
function EmotionPanel({
  emotion,
  busy,
  onRun,
}: {
  emotion: EmotionResultData | null;
  busy: boolean;
  onRun: () => void;
}) {
  return (
    <Card title="Emotion Detection" subtitle="Happy · Sad · Angry · Neutral · Fear · Surprise">
      {emotion ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Smile className="h-5 w-5" style={{ color: EMOTION_COLORS[emotion.emotion] }} />
            <div className="flex-1">
              <div className="font-semibold capitalize">{emotion.emotion}</div>
              <div className="text-xs text-muted-foreground">{emotion.confidence.toFixed(0)}% confidence</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={Object.entries(emotion.scores).map(([k, v]) => ({ name: k, value: v }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={45}
                innerRadius={25}
              >
                {Object.entries(emotion.scores).map(([k]) => (
                  <Cell key={k} fill={EMOTION_COLORS[k]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <Button size="sm" variant="ghost" className="w-full" onClick={onRun} disabled={busy}>
            Re-run
          </Button>
        </div>
      ) : (
        <RunStub icon={Smile} label="Detect emotion" busy={busy} onRun={onRun} />
      )}
    </Card>
  );
}

/* ---------------- Quality panel ---------------- */
function QualityPanel({
  quality,
  busy,
  onRun,
}: {
  quality: QualityAnalysisData | null;
  busy: boolean;
  onRun: () => void;
}) {
  return (
    <Card title="Audio Quality Analysis" subtitle="Noise · pitch · volume · speed · clarity">
      {quality ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Volume" value={`${quality.volume}`} />
            <Metric label="Noise" value={`${quality.backgroundNoise}`} />
            <Metric label="Pitch" value={`${quality.pitch}Hz`} />
            <Metric label="Speed" value={`${quality.speakingSpeed}wpm`} />
            <Metric label="Pauses" value={`${quality.pauses}`} />
            <Metric label="Clarity" value={`${quality.clarity}`} />
          </div>
          <StatBar label="Fluency" value={quality.fluencyScore} />
          <StatBar label="Grammar" value={quality.grammarScore} />
          <StatBar label="Vocabulary" value={quality.vocabularyScore} />
          <Button size="sm" variant="ghost" className="w-full" onClick={onRun} disabled={busy}>
            Re-run
          </Button>
        </div>
      ) : (
        <RunStub icon={Gauge} label="Analyze audio quality" busy={busy} onRun={onRun} />
      )}
    </Card>
  );
}

/* ---------------- Speaker verify panel ---------------- */
function SpeakerVerifyPanel({
  verification,
  busy,
  onRun,
  library,
  currentId,
}: {
  verification: SpeakerVerificationData | null;
  busy: boolean;
  onRun: (referenceId: string) => void;
  library: AudioFileData[];
  currentId?: string;
}) {
  const [refId, setRefId] = useState<string>("");
  const refs = library.filter((f) => f.id !== currentId);

  return (
    <Card title="Speaker Verification" subtitle="Match % · verified · confidence">
      {verification ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full grid place-items-center ${verification.verified ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>
              {verification.verified ? <CheckCircle2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold">{verification.matchPercent}%</div>
              <div className="text-xs text-muted-foreground">
                {verification.verified ? "Verified" : "Not verified"} · {verification.confidence}% confidence
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{verification.notes}</p>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => refId && onRun(refId)} disabled={busy}>
            Re-run
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {refs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Upload or record a second audio file to use as a reference for verification.
            </p>
          ) : (
            <>
              <label className="text-xs text-muted-foreground">Reference audio</label>
              <select
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm"
              >
                <option value="">Select reference…</option>
                {refs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.originalName}
                  </option>
                ))}
              </select>
              <Button size="sm" className="w-full brand-gradient text-white" disabled={busy || !refId} onClick={() => refId && onRun(refId)}>
                {busy ? <Spinner className="mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />} Verify speaker
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Evaluation panel ---------------- */
function EvaluationPanel({
  evaluation,
  busy,
  onRun,
  qualityReady,
}: {
  evaluation: EvaluationScoreData | null;
  busy: boolean;
  onRun: () => void;
  qualityReady: boolean;
}) {
  return (
    <Card title="AI Evaluation" subtitle="Six-dimension scoring + overall rating">
      {evaluation ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <ScoreRing value={evaluation.overallSpeaking} size={96} label="Overall" />
            <div className="space-y-1.5 flex-1">
              <ScoreBadge rating={evaluation.rating} />
              <div className="text-xs text-muted-foreground">
                Interview: <b>{evaluation.overallInterview}</b>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <StatBar label="Pronunciation" value={evaluation.pronunciation} />
            <StatBar label="Grammar" value={evaluation.grammar} />
            <StatBar label="Communication" value={evaluation.communication} />
            <StatBar label="Confidence" value={evaluation.confidence} />
            <StatBar label="Vocabulary" value={evaluation.vocabulary} />
            <StatBar label="Fluency" value={evaluation.fluency} />
          </div>
        </div>
      ) : (
        <RunStub
          icon={Brain}
          label={qualityReady ? "Run AI evaluation" : "Run quality analysis first"}
          busy={busy}
          onRun={onRun}
          disabled={!qualityReady}
        />
      )}
    </Card>
  );
}

/* ---------------- Feedback panel ---------------- */
function FeedbackPanel({
  report,
  rating,
  overall,
}: {
  report: ReportData;
  rating: string;
  overall: number;
}) {
  const sections: { key: keyof ReportData["feedback"]; title: string; icon: typeof Brain; tone: "good" | "bad" | "tip" }[] = [
    { key: "strengths", title: "Strengths", icon: CheckCircle2, tone: "good" },
    { key: "weaknesses", title: "Weaknesses", icon: Gauge, tone: "bad" },
    { key: "improvementTips", title: "Improvement Tips", icon: Sparkles, tone: "tip" },
    { key: "recommendedPractice", title: "Recommended Practice", icon: Play, tone: "tip" },
    { key: "pronunciationSuggestions", title: "Pronunciation Suggestions", icon: AudioLines, tone: "tip" },
    { key: "vocabularySuggestions", title: "Vocabulary Suggestions", icon: MessagesSquare, tone: "tip" },
    { key: "grammarCorrections", title: "Grammar Corrections", icon: Brain, tone: "bad" },
  ];
  const toneClass = {
    good: "border-emerald-500/30 bg-emerald-500/5",
    bad: "border-rose-500/30 bg-rose-500/5",
    tip: "border-primary/30 bg-primary/5",
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white">
          <Brain className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">AI Feedback Report</h3>
          <p className="text-xs text-muted-foreground">Overall speaking score {overall} · {rating}</p>
        </div>
        <ScoreBadge rating={rating as never} />
      </div>
      <div className="rounded-xl border bg-card/50 p-4 mb-4 text-sm">
        <span className="font-semibold">Summary: </span>
        {report.summary}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {sections.map((s) => {
          const items = report.feedback[s.key];
          if (!items || items.length === 0) return null;
          return (
            <div key={s.key} className={`rounded-xl border p-4 ${toneClass[s.tone]}`}>
              <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                <s.icon className="h-4 w-4" />
                {s.title}
              </div>
              <ul className="space-y-1.5">
                {items.map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-primary">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- small helpers ---------------- */
function RunStub({
  icon: Icon,
  label,
  busy,
  onRun,
  disabled,
}: {
  icon: typeof Mic;
  label: string;
  busy: boolean;
  onRun: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Icon className="h-7 w-7 text-muted-foreground/50" />
      <Button size="sm" variant="outline" disabled={busy || disabled} onClick={onRun}>
        {busy ? <Spinner className="mr-2" /> : null}
        {label}
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/50 px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
