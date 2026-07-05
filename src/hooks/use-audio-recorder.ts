"use client";

import { useCallback, useRef, useState } from "react";

export interface RecordedAudio {
  blob: Blob;
  url: string;
  durationSec: number;
  mimeType: string;
}

export interface AudioMetrics {
  volume: number; // 0-100
  backgroundNoise: number; // 0-100
  pitch: number; // Hz
  durationSec: number;
}

export interface RecorderState {
  recording: boolean;
  paused: boolean;
  seconds: number;
  level: number; // 0-1 live input level
  audio: RecordedAudio | null;
  metrics: AudioMetrics | null;
  error: string | null;
}

/**
 * Browser audio recorder with live level metering and post-recording
 * metric extraction (volume, background noise, pitch) using the Web Audio API.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    recording: false,
    paused: false,
    seconds: 0,
    level: 0,
    audio: null,
    metrics: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const dataRef = useRef<Float32Array | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    rafRef.current = null;
    timerRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setState((s) => ({ ...s, level: Math.min(1, rms * 3) }));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || mime || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        // Decode for analysis
        let metrics: AudioMetrics | null = null;
        try {
          const arrayBuf = await blob.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(arrayBuf);
          dataRef.current = decoded.getChannelData(0).slice(0);
          metrics = computeMetrics(decoded);
        } catch (e) {
          console.warn("decode failed", e);
        }
        const durationSec = metrics?.durationSec ?? (Date.now() - startTimeRef.current) / 1000;
        setState((s) => ({
          ...s,
          recording: false,
          paused: false,
          seconds: 0,
          level: 0,
          audio: { blob, url, durationSec, mimeType: blob.type },
          metrics,
        }));
        cleanup();
      };

      startTimeRef.current = Date.now();
      mr.start(100);
      setState((s) => ({
        ...s,
        recording: true,
        paused: false,
        audio: null,
        metrics: null,
        seconds: 0,
      }));

      rafRef.current = requestAnimationFrame(tick);
      timerRef.current = window.setInterval(() => {
        setState((s) => ({ ...s, seconds: Math.floor((Date.now() - startTimeRef.current) / 1000) }));
      }, 250);
    } catch (err) {
      console.error(err);
      setState((s) => ({
        ...s,
        error:
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone permission denied."
              : err.message
            : "Failed to access microphone.",
      }));
      cleanup();
    }
  }, [cleanup, tick]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const reset = useCallback(() => {
    setState((s) => {
      if (s.audio) URL.revokeObjectURL(s.audio.url);
      return {
        recording: false,
        paused: false,
        seconds: 0,
        level: 0,
        audio: null,
        metrics: null,
        error: null,
      };
    });
  }, []);

  return { ...state, start, stop, reset, cleanup };
}

function pickMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

/** Compute volume (0-100), background noise (0-100), pitch (Hz) from a decoded buffer. */
function computeMetrics(decoded: AudioBuffer): AudioMetrics {
  const ch = decoded.getChannelData(0);
  const sampleRate = decoded.sampleRate;
  const durationSec = decoded.duration;

  // Volume: overall RMS normalized to 0-100 (assume full-scale ~0.5)
  let sumSq = 0;
  let minRms = 1;
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  for (let i = 0; i < ch.length; i += windowSize) {
    const end = Math.min(i + windowSize, ch.length);
    let s = 0;
    for (let j = i; j < end; j++) s += ch[j] * ch[j];
    const rms = Math.sqrt(s / (end - i));
    sumSq += rms * rms;
    if (rms > 0.001) minRms = Math.min(minRms, rms);
  }
  const meanRms = Math.sqrt(sumSq / Math.max(1, Math.floor(ch.length / windowSize)));
  const volume = Math.min(100, Math.round((meanRms / 0.5) * 100));
  // Background noise: scale the minimum RMS (noise floor) to 0-100
  const backgroundNoise = Math.min(100, Math.round((minRms / 0.2) * 100));

  // Pitch via autocorrelation on a representative 4096-sample window from the middle
  const pitch = estimatePitch(ch, sampleRate);

  return { volume, backgroundNoise, pitch, durationSec };
}

function estimatePitch(buf: Float32Array, sampleRate: number): number {
  const size = 4096;
  const start = Math.max(0, Math.floor(buf.length / 2 - size / 2));
  const frame = buf.slice(start, start + size);
  // RMS gate
  let rms = 0;
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
  rms = Math.sqrt(rms / frame.length);
  if (rms < 0.01) return 0; // too quiet

  const bestOffsets: number[] = [];
  // Try a few windows
  for (let w = 0; w < 3; w++) {
    const ws = Math.max(0, Math.floor(buf.length / 2 - size / 2) + w * 2048);
    const f = buf.slice(ws, ws + size);
    const acf = new Float32Array(1000);
    for (let lag = 0; lag < 1000; lag++) {
      let s = 0;
      for (let i = 0; i < size - lag; i++) s += f[i] * f[i + lag];
      acf[lag] = s;
    }
    // find first peak after the first zero crossing of acf
    let maxVal = 0;
    let maxLag = 0;
    let started = false;
    for (let lag = 1; lag < acf.length - 1; lag++) {
      if (!started && acf[lag] < acf[lag - 1]) started = true;
      if (started && acf[lag] > acf[lag - 1] && acf[lag] > acf[lag + 1]) {
        if (acf[lag] > maxVal) {
          maxVal = acf[lag];
          maxLag = lag;
        }
      }
    }
    if (maxLag > 0) bestOffsets.push(sampleRate / maxLag);
  }
  if (!bestOffsets.length) return 0;
  // median
  bestOffsets.sort((a, b) => a - b);
  return Math.round(bestOffsets[Math.floor(bestOffsets.length / 2)]);
}
