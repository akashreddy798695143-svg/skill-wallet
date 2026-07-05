"use client";

import { useRef, useState } from "react";
import { AudioLines, Download, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { Spinner } from "@/components/shared/loaders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { AVAILABLE_VOICES } from "@/lib/tts-voices";

export function TtsView() {
  const [text, setText] = useState(
    "Hello! Welcome to Voice Based Connect. I can turn any text into natural sounding speech."
  );
  const [voice, setVoice] = useState<string>("tongtong");
  const [speed, setSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function generate() {
    if (!text.trim()) return toast.error("Please enter some text.");
    if (text.length > 4000) return toast.error("Text too long (max 4000 chars).");
    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed, format: "wav" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Generation failed");
      }
      const blob = await res.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("Speech generated!");
      setTimeout(() => audioRef.current?.play().catch(() => {}), 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `tts-${Date.now()}.wav`;
    a.click();
  }

  const charCount = text.length;

  return (
    <div className="space-y-6 max-w-5xl">
      <ViewHeader
        title="Text to Speech"
        description="Generate natural-sounding speech from text with voice, speed & volume control."
        icon={AudioLines}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Input" subtitle={`${charCount} / 4000 characters`}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Text</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="Type or paste text to convert to speech…"
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Voice</Label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {AVAILABLE_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label className="text-xs">Speed</Label>
                  <span className="text-muted-foreground">{speed.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={(v) => setSpeed(v[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label className="text-xs">Volume</Label>
                  <span className="text-muted-foreground">{volume.toFixed(1)}</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  min={0.5}
                  max={5}
                  step={0.5}
                />
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={loading}
              className="w-full brand-gradient text-white font-semibold h-11"
            >
              {loading ? <Spinner className="mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Speech
            </Button>
          </div>
        </Card>

        <Card title="Output" subtitle="Generated audio playback & download">
          {audioUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card/50 p-6 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full brand-gradient grid place-items-center text-white">
                  <Volume2 className="h-8 w-8" />
                </div>
                <audio ref={audioRef} controls src={audioUrl} className="w-full" />
              </div>
              <Button onClick={download} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" /> Download WAV
              </Button>
              <div className="text-xs text-muted-foreground">
                Voice: <b>{voice}</b> · Speed: <b>{speed.toFixed(1)}x</b> · Volume: <b>{volume.toFixed(1)}</b>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
              <AudioLines className="h-10 w-10 opacity-30" />
              Generated audio will appear here.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
