"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPeaks } from "@/lib/chat";
import { VOICE_MAX_MS, VOICE_PEAKS } from "@/lib/limits";

export type VoiceClip = { blob: Blob; type: string; durationMs: number; peaks: number[] };

type RecorderState =
  | { status: "idle" }
  | { status: "recording"; startedAt: number }
  | { status: "error"; message: string };

/** MP4/AAC plays everywhere (incl. iPhone), so prefer it; fall back to WebM/Ogg Opus. */
const TYPES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function voiceRecordingSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/**
 * Records a voice message: live loudness levels for the meter while
 * recording, then a clip with its duration and waveform peaks.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>({ status: "idle" });
  const [levels, setLevels] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const chunks = useRef<Blob[]>([]);
  const allLevels = useRef<number[]>([]);
  const timer = useRef<number | null>(null);
  const started = useRef(0);
  const finish = useRef<((clip: VoiceClip | null) => void) | null>(null);
  const keep = useRef(false);

  const cleanup = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audio.current?.close().catch(() => undefined);
    audio.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  /** Stops recording; `send` keeps the clip, otherwise it is thrown away. */
  const stop = useCallback((send: boolean) => {
    keep.current = send;
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else {
      cleanup();
      setState({ status: "idle" });
      finish.current?.(null);
      finish.current = null;
    }
  }, [cleanup]);

  /** Resolves with the clip once recording stops (or null if cancelled). */
  const start = useCallback(async (): Promise<Promise<VoiceClip | null> | null> => {
    if (!voiceRecordingSupported()) {
      setState({ status: "error", message: "Voice messages are not supported in this browser." });
      return null;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState({ status: "error", message: "Allow microphone access to record a voice message." });
      return null;
    }
    const type = pickType();
    const rec = type ? new MediaRecorder(media, { mimeType: type, audioBitsPerSecond: 64_000 }) : new MediaRecorder(media);
    stream.current = media;
    recorder.current = rec;
    chunks.current = [];
    allLevels.current = [];
    keep.current = false;
    setLevels([]);
    setElapsed(0);

    // Loudness meter (RMS of the waveform every 80ms).
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(media);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audio.current = context;
      const buffer = new Uint8Array(analyser.fftSize);
      timer.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const value of buffer) sum += ((value - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buffer.length) * 3.2);
        allLevels.current.push(level);
        setLevels((current) => [...current.slice(-47), level]);
        const ms = Date.now() - started.current;
        setElapsed(ms);
        if (ms >= VOICE_MAX_MS) stop(true);
      }, 80);
    } catch {
      timer.current = window.setInterval(() => setElapsed(Date.now() - started.current), 200);
    }

    const done = new Promise<VoiceClip | null>((resolve) => {
      finish.current = resolve;
    });
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    rec.onstop = () => {
      const durationMs = Math.min(Date.now() - started.current, VOICE_MAX_MS);
      const blobType = (rec.mimeType || type || "audio/webm").split(";")[0];
      const clip = keep.current
        ? { blob: new Blob(chunks.current, { type: blobType }), type: blobType, durationMs, peaks: toPeaks(allLevels.current, VOICE_PEAKS) }
        : null;
      cleanup();
      setState({ status: "idle" });
      finish.current?.(clip);
      finish.current = null;
    };
    started.current = Date.now();
    rec.start(250);
    setState({ status: "recording", startedAt: started.current });
    return done;
  }, [cleanup, stop]);


  const clearError = useCallback(() => setState({ status: "idle" }), []);

  return { state, levels, elapsed, start, stop, clearError };
}
