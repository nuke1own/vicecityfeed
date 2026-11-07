"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatDuration } from "@/lib/chat";

const SPEEDS = [1, 1.5, 2] as const;

/** Only one voice message plays at a time across the conversation. */
let current: HTMLAudioElement | null = null;

/**
 * Voice message player: play/pause, a waveform that fills as it plays (tap
 * or drag to seek), and 1x/1.5x/2x speed.
 */
export function VoiceMessage({
  url,
  durationMs,
  peaks,
  mine,
}: {
  url: string;
  durationMs: number;
  peaks: number[];
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(durationMs / 1000);
  const bars = peaks.length ? peaks : Array.from({ length: 32 }, () => 0.3);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let frame = 0;
    const tick = () => {
      if (audio.duration && Number.isFinite(audio.duration)) setDuration(audio.duration);
      const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationMs / 1000;
      setProgress(total ? Math.min(1, audio.currentTime / total) : 0);
      if (!audio.paused) frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      frame = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      tick();
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [durationMs]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (current && current !== audio) current.pause();
    current = audio;
    audio.playbackRate = speed;
    try {
      await audio.play();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  function seek(clientX: number) {
    const audio = audioRef.current;
    const box = barsRef.current?.getBoundingClientRect();
    if (!audio || !box) return;
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationMs / 1000;
    audio.currentTime = ratio * total;
    setProgress(ratio);
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const total = duration || durationMs / 1000;
  const shown = playing || progress > 0 ? total * (1 - progress) : total;
  const tone = mine
    ? { button: "bg-accent-ink text-vice-pink", played: "bg-accent-ink", rest: "bg-accent-ink/35", text: "text-accent-ink/80", chip: "bg-accent-ink/15 text-accent-ink" }
    : { button: "bg-white text-black", played: "bg-white", rest: "bg-white/30", text: "text-white/70", chip: "bg-white/10 text-white" };

  return (
    <div className="flex w-[15.5rem] max-w-full items-center gap-2.5 py-0.5" data-voice-message>
      <audio ref={audioRef} src={url} preload="metadata" onError={() => setFailed(true)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`tap-press grid size-10 shrink-0 place-items-center rounded-full ${tone.button} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
      >
        {playing ? <Pause aria-hidden className="size-[18px]" fill="currentColor" /> : <Play aria-hidden className="ml-0.5 size-[18px]" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          ref={barsRef}
          role="slider"
          tabIndex={0}
          aria-label="Voice message position"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(total * progress)}
          aria-valuetext={`${formatDuration(total * progress * 1000)} of ${formatDuration(total * 1000)}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seek(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons) seek(event.clientX);
          }}
          onKeyDown={(event) => {
            const audio = audioRef.current;
            if (!audio) return;
            if (event.key === "ArrowRight") audio.currentTime = Math.min(total, audio.currentTime + 5);
            if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
          }}
          className="flex h-8 cursor-pointer touch-none items-center gap-[2px] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {bars.map((peak, index) => (
            <span
              key={index}
              aria-hidden
              className={`w-[3px] flex-1 rounded-full transition-colors duration-150 ${index / bars.length < progress ? tone.played : tone.rest}`}
              style={{ height: `${Math.max(12, peak * 100)}%` }}
            />
          ))}
        </div>
        <div className={`mt-0.5 flex items-center justify-between text-[11px] font-semibold tabular-nums ${tone.text}`}>
          <span>{failed ? "Can't play here" : formatDuration(shown * 1000)}</span>
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Playback speed ${speed}x`}
            className={`rounded-full px-1.5 py-px text-[11px] font-bold ${tone.chip} focus-visible:outline-2 focus-visible:outline-white`}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
