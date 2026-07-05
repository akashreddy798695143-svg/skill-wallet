"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  AudioLines,
  MessagesSquare,
  ShieldCheck,
  Smile,
  Gauge,
  Brain,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  History,
  Lock,
  Globe,
} from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Mic,
    title: "Audio Recording Studio",
    desc: "Record, upload, play, download and delete audio in WAV, MP3 & M4A — all in one place.",
  },
  {
    icon: MessagesSquare,
    title: "Speech-to-Text (Whisper)",
    desc: "Fast, high-accuracy transcription with multi-language support, stored & shown in real time.",
  },
  {
    icon: AudioLines,
    title: "Text-to-Speech",
    desc: "Generate natural speech from text with voice selection, speed & pitch control, and download.",
  },
  {
    icon: ShieldCheck,
    title: "Speaker Verification",
    desc: "Match %, verified status & confidence score powered by SpeechBrain-style analysis.",
  },
  {
    icon: Smile,
    title: "Emotion Detection",
    desc: "Detect happy, sad, angry, neutral, fear & surprise with confidence charts.",
  },
  {
    icon: Gauge,
    title: "Audio Quality Analysis",
    desc: "Background noise, pitch, volume, speaking speed, clarity, pauses, fluency & grammar scoring.",
  },
  {
    icon: Brain,
    title: "AI Evaluation",
    desc: "Pronunciation, grammar, communication, confidence, vocabulary, fluency & overall scores.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Pie, bar, line & progress charts of weekly and monthly performance trends.",
  },
  {
    icon: History,
    title: "Session History",
    desc: "Every session saved with transcript, scores, emotion & audio — searchable & exportable.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Record or upload",
    desc: "Capture audio directly in the browser or upload an existing file.",
  },
  {
    n: "02",
    title: "Transcribe & analyze",
    desc: "Whisper turns speech into text; AI runs emotion, quality & speaker checks.",
  },
  {
    n: "03",
    title: "Get evaluated",
    desc: "Receive detailed scores across six dimensions plus actionable feedback.",
  },
  {
    n: "04",
    title: "Track progress",
    desc: "Watch your analytics improve over time and export your history anytime.",
  },
];

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const open = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 glass border-b">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Wordmark />
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#preview" className="hover:text-foreground transition">Dashboard</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => open("login")}
              className="hidden sm:inline-flex"
            >
              Log in
            </Button>
            <Button
              onClick={() => open("signup")}
              className="brand-gradient text-white font-semibold"
            >
              Get started
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden mesh-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground mb-5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-powered speech intelligence platform
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Speak. Analyze. <span className="gradient-text">Improve.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                Voice-Based Connect records your voice, transcribes it with
                Whisper-class accuracy, detects emotion and audio quality, verifies
                your speaker identity, and gives you instant AI evaluation with
                actionable feedback.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => open("signup")}
                  className="brand-gradient text-white font-semibold h-12 px-7"
                >
                  Start free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => open("login")}
                  className="h-12 px-7"
                >
                  Log in
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {["No credit card", "JWT-secured", "Dark mode", "Exportable reports"].map(
                  (t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      {t}
                    </span>
                  )
                )}
              </div>
            </motion.div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <div className="glass-strong rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">live analysis</span>
                </div>
                <div className="rounded-2xl bg-card/70 border p-5">
                  <div className="flex items-center justify-center gap-1.5 h-20 text-primary mb-4">
                    {[8, 16, 28, 40, 28, 16, 32, 48, 24, 14, 22, 10, 6].map((h, i) => (
                      <motion.span
                        key={i}
                        className="w-2 rounded-full brand-gradient"
                        animate={{ height: [h * 0.4, h, h * 0.5] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.08,
                          ease: "easeInOut",
                        }}
                        style={{ height: h }}
                      />
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Overall speaking", v: 86, c: "bg-primary" },
                      { label: "Pronunciation", v: 92, c: "bg-chart-2" },
                      { label: "Fluency", v: 78, c: "bg-chart-3" },
                    ].map((r) => (
                      <div key={r.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-semibold">{r.v}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full ${r.c}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${r.v}%` }}
                            transition={{ duration: 1, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 font-medium">
                      <Smile className="h-3.5 w-3.5" /> Emotion: Happy · 82%
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified · 94%
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 glass rounded-2xl p-3 shadow-lg animate-float">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Brain className="h-4 w-4 text-primary" /> AI Feedback ready
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y bg-card/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "6", l: "AI evaluation dimensions" },
              { v: "6", l: "Emotion classes" },
              { v: "3+", l: "Audio formats" },
              { v: "100%", l: "Browser-based recording" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl font-extrabold gradient-text">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to master spoken communication
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete toolkit for recording, transcribing, analyzing and
              improving your voice — powered by modern AI models.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="group glass rounded-2xl p-6 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white group-hover:scale-110 transition">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-card/40 border-y">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                From recording to actionable insight in four simple steps.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative glass rounded-2xl p-6"
                >
                  <div className="text-4xl font-extrabold text-primary/20 mb-2">
                    {s.n}
                  </div>
                  <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section id="preview" className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
                <BarChart3 className="h-3.5 w-3.5 text-primary" /> Analytics dashboard
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Track your progress with rich, real-time analytics
              </h2>
              <p className="mt-4 text-muted-foreground">
                Total sessions, average & highest scores, emotion history and
                weekly/monthly performance — visualized with pie, bar, line and
                progress charts so you always know how you&apos;re improving.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Search, filter & export your full session history (CSV / PDF)",
                  "Admin panel to manage users, sessions & system statistics",
                  "Secure JWT auth, password hashing & input validation",
                  "Dark / light mode with glassmorphism UI",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => open("signup")}
                className="mt-8 brand-gradient text-white font-semibold h-12 px-7"
              >
                Create your account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="glass-strong rounded-3xl p-5 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "Total sessions", v: "24", i: History },
                  { l: "Average score", v: "78", i: Gauge },
                  { l: "Highest score", v: "94", i: Brain },
                  { l: "Top emotion", v: "Happy", i: Smile },
                ].map((c) => (
                  <div key={c.l} className="rounded-2xl border bg-card/60 p-5">
                    <c.i className="h-5 w-5 text-primary mb-2" />
                    <div className="text-2xl font-bold">{c.v}</div>
                    <div className="text-xs text-muted-foreground">{c.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border bg-card/60 p-5">
                <div className="text-xs text-muted-foreground mb-3">
                  Weekly performance
                </div>
                <div className="flex items-end justify-between h-28 gap-2">
                  {[40, 55, 48, 70, 65, 82, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full rounded-t-md brand-gradient" style={{ height: `${h}%` }} />
                      <span className="text-[10px] text-muted-foreground">
                        {["M", "T", "W", "T", "F", "S", "S"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="border-t bg-card/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid sm:grid-cols-3 gap-6 text-center">
            {[
              { i: Lock, t: "Secure by default", d: "Password hashing, JWT sessions & input validation." },
              { i: Globe, t: "Multi-language", d: "Transcription & feedback across languages." },
              { i: ShieldCheck, t: "Privacy first", d: "Your audio stays in your account, deletable anytime." },
            ].map((s) => (
              <div key={s.t} className="px-4">
                <s.i className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Wordmark />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Voice-Based Connect. Built with AI.
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} defaultMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
