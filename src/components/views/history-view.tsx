"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Trash2,
  FileText,
  FileSpreadsheet,
  Eye,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { SessionSummary, SessionDetail } from "@/lib/types";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { CardSkeleton } from "@/components/shared/loaders";
import { ScoreBadge, StatBar, ScoreRing } from "@/components/shared/score-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMOTIONS = ["happy", "sad", "angry", "neutral", "fear", "surprise"];
const RATINGS = ["Excellent", "Good", "Average", "Needs Improvement"];

export function HistoryView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("");
  const [emotion, setEmotion] = useState("");
  const [sort, setSort] = useState("newest");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (rating) params.set("rating", rating);
      if (emotion) params.set("emotion", emotion);
      if (sort) params.set("sort", sort);
      const res = await api.get<{ sessions: SessionSummary[] }>(
        `/api/sessions?${params.toString()}`
      );
      setSessions(res.sessions);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [search, rating, emotion, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api.del(`/api/sessions/${deleteId}`);
      toast.success("Session deleted");
      setDeleteId(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  function exportCsv() {
    window.open("/api/export?format=csv", "_blank");
  }

  async function exportPdf(s: SessionSummary) {
    try {
      const res = await api.get<{ session: SessionDetail }>(`/api/sessions/${s.id}`);
      printReport(res.session);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to export PDF.");
    }
  }

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Session History"
        description="Search, filter, review and export every voice session."
        icon={History}
        action={
          <Button onClick={exportCsv} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or transcript…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">All emotions</option>
              {EMOTIONS.map((e) => (
                <option key={e} value={e} className="capitalize">
                  {e}
                </option>
              ))}
            </select>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">All ratings</option>
              {RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="best">Highest score</option>
              <option value="worst">Lowest score</option>
            </select>
          </div>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : sessions.length === 0 ? (
        <Card>
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Filter className="h-8 w-8 opacity-40" />
            No sessions match your filters.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{s.title}</h3>
                      {s.rating && <ScoreBadge rating={s.rating as never} />}
                      {s.emotion && (
                        <span className="text-xs text-muted-foreground capitalize">· {s.emotion}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {s.transcriptPreview || "No transcript"}
                    </p>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(s.createdAt).toLocaleString()} · {s.durationSec.toFixed(1)}s
                      {s.audioFile ? ` · ${s.audioFile.originalName}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.overallSpeaking != null && (
                      <div className="text-center">
                        <div className="text-2xl font-bold gradient-text">{s.overallSpeaking}</div>
                        <div className="text-[10px] text-muted-foreground">score</div>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailId(s.id)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => exportPdf(s)} title="Export PDF">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(s.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto fancy-scroll">
          <DialogHeader>
            <DialogTitle>Session detail</DialogTitle>
            <DialogDescription>Full transcript, scores and AI feedback.</DialogDescription>
          </DialogHeader>
          {detailId && <SessionDetailBody id={detailId} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the session, its transcript and all analyses. The audio file stays in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionDetailBody({ id }: { id: string }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ session: SessionDetail }>(`/api/sessions/${id}`);
        if (active) setDetail(res.session);
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading)
    return (
      <div className="py-10 flex justify-center">
        <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  if (!detail) return <p className="text-sm text-muted-foreground">Session not found.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-lg">{detail.title}</h3>
        <p className="text-xs text-muted-foreground">
          {new Date(detail.createdAt).toLocaleString()} · {detail.durationSec.toFixed(1)}s · {detail.language}
        </p>
      </div>

      {detail.audioFile && (
        <audio controls src={`/api/audio/${detail.audioFile.id}`} className="w-full" />
      )}

      {detail.transcript && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Transcript</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg border bg-card/50 p-3">
            {detail.transcript.text}
          </p>
        </div>
      )}

      {detail.evaluationScore && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-card/50 p-4">
            <ScoreRing value={detail.evaluationScore.overallSpeaking} label="Overall" />
            <ScoreBadge rating={detail.evaluationScore.rating} />
          </div>
          <div className="space-y-2.5">
            <StatBar label="Pronunciation" value={detail.evaluationScore.pronunciation} />
            <StatBar label="Grammar" value={detail.evaluationScore.grammar} />
            <StatBar label="Communication" value={detail.evaluationScore.communication} />
            <StatBar label="Confidence" value={detail.evaluationScore.confidence} />
            <StatBar label="Vocabulary" value={detail.evaluationScore.vocabulary} />
            <StatBar label="Fluency" value={detail.evaluationScore.fluency} />
          </div>
        </div>
      )}

      {detail.emotionResult && (
        <div className="rounded-xl border bg-card/50 p-4">
          <h4 className="text-sm font-semibold mb-1">Emotion</h4>
          <p className="text-sm capitalize">
            {detail.emotionResult.emotion} · {detail.emotionResult.confidence.toFixed(0)}% confidence
          </p>
        </div>
      )}

      {detail.qualityAnalysis && (
        <div className="rounded-xl border bg-card/50 p-4">
          <h4 className="text-sm font-semibold mb-2">Audio Quality</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <KV k="Volume" v={`${detail.qualityAnalysis.volume}`} />
            <KV k="Noise" v={`${detail.qualityAnalysis.backgroundNoise}`} />
            <KV k="Pitch" v={`${detail.qualityAnalysis.pitch}Hz`} />
            <KV k="Speed" v={`${detail.qualityAnalysis.speakingSpeed}wpm`} />
            <KV k="Clarity" v={`${detail.qualityAnalysis.clarity}`} />
            <KV k="Pauses" v={`${detail.qualityAnalysis.pauses}`} />
            <KV k="Fluency" v={`${detail.qualityAnalysis.fluencyScore}`} />
            <KV k="Grammar" v={`${detail.qualityAnalysis.grammarScore}`} />
          </div>
        </div>
      )}

      {detail.report && (
        <div className="rounded-xl border bg-card/50 p-4">
          <h4 className="text-sm font-semibold mb-1">AI Summary</h4>
          <p className="text-sm text-muted-foreground">{detail.report.summary}</p>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <FeedbackList title="Strengths" items={detail.report.feedback.strengths} tone="good" />
            <FeedbackList title="Weaknesses" items={detail.report.feedback.weaknesses} tone="bad" />
            <FeedbackList title="Improvement Tips" items={detail.report.feedback.improvementTips} tone="tip" />
            <FeedbackList title="Grammar Corrections" items={detail.report.feedback.grammarCorrections} tone="bad" />
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border bg-background px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{k}</div>
      <div className="text-sm font-semibold">{v}</div>
    </div>
  );
}

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad" | "tip";
}) {
  const toneClass = {
    good: "border-emerald-500/30 bg-emerald-500/5",
    bad: "border-rose-500/30 bg-rose-500/5",
    tip: "border-primary/30 bg-primary/5",
  };
  return (
    <div className={`rounded-lg border p-3 ${toneClass[tone]}`}>
      <div className="text-xs font-semibold mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-xs text-muted-foreground">
            • {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Build a printable report and open the browser print dialog (print-to-PDF). */
function printReport(s: SessionDetail) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("Please allow pop-ups to export PDF.");
    return;
  }
  const e = s.evaluationScore;
  const r = s.report;
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Voice Session Report — ${escapeHtml(s.title)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;padding:32px;line-height:1.5}
    h1{font-size:22px;margin:0 0 4px}
    .muted{color:#64748b;font-size:13px}
    .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .kv{background:#f8fafc;border-radius:8px;padding:8px 10px}
    .kv b{display:block;font-size:18px}
    .pill{display:inline-block;padding:3px 10px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:600}
    ul{margin:6px 0;padding-left:18px}
    li{font-size:13px;color:#334155;margin:3px 0}
    .bar-wrap{background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden}
    .bar{height:100%;background:linear-gradient(90deg,#10b981,#14b8a6)}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{padding:4px 0}
    .scores td:first-child{color:#475569}
    @media print{body{padding:0}}
  </style></head><body>
  <h1>Voice-Based Connect — Session Report</h1>
  <p class="muted">${escapeHtml(s.title)} · ${new Date(s.createdAt).toLocaleString()} · ${s.durationSec.toFixed(1)}s</p>
  ${e ? `<div class="card"><h3>Overall: ${e.overallSpeaking} <span class="pill">${e.rating}</span></h3>
  <table class="scores">
    <tr><td>Pronunciation</td><td>${e.pronunciation}</td><td>Grammar</td><td>${e.grammar}</td></tr>
    <tr><td>Communication</td><td>${e.communication}</td><td>Confidence</td><td>${e.confidence}</td></tr>
    <tr><td>Vocabulary</td><td>${e.vocabulary}</td><td>Fluency</td><td>${e.fluency}</td></tr>
    <tr><td>Interview</td><td>${e.overallInterview}</td><td>Speaking</td><td>${e.overallSpeaking}</td></tr>
  </table></div>` : ""}
  ${s.emotionResult ? `<div class="card"><b>Emotion:</b> ${s.emotionResult.emotion} (${s.emotionResult.confidence.toFixed(0)}%)</div>` : ""}
  ${s.qualityAnalysis ? `<div class="card"><b>Audio Quality</b><div class="grid">
    <div class="kv">Volume<b>${s.qualityAnalysis.volume}</b></div>
    <div class="kv">Noise<b>${s.qualityAnalysis.backgroundNoise}</b></div>
    <div class="kv">Pitch<b>${s.qualityAnalysis.pitch}Hz</b></div>
    <div class="kv">Speed<b>${s.qualityAnalysis.speakingSpeed}wpm</b></div>
    <div class="kv">Clarity<b>${s.qualityAnalysis.clarity}</b></div>
    <div class="kv">Pauses<b>${s.qualityAnalysis.pauses}</b></div>
  </div></div>` : ""}
  ${s.transcript ? `<div class="card"><b>Transcript</b><p>${escapeHtml(s.transcript.text)}</p></div>` : ""}
  ${r ? `<div class="card"><b>AI Summary</b><p>${escapeHtml(r.summary)}</p>
    ${r.feedback.strengths.length ? `<b>Strengths</b><ul>${r.feedback.strengths.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
    ${r.feedback.weaknesses.length ? `<b>Weaknesses</b><ul>${r.feedback.weaknesses.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
    ${r.feedback.improvementTips.length ? `<b>Improvement Tips</b><ul>${r.feedback.improvementTips.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
    ${r.feedback.grammarCorrections.length ? `<b>Grammar Corrections</b><ul>${r.feedback.grammarCorrections.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
  </div>` : ""}
  <p class="muted">Generated by Voice-Based Connect.</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>
  </body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
