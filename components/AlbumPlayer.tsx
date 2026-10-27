"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import {
  ALBUM,
  ALBUM_SINGLES,
  formatClock,
  youtubeThumb,
  type AlbumTrack,
} from "@/lib/album";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (id: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: Record<string, unknown>,
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function AlbumPlayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(ALBUM_SINGLES[0].durationSec);

  const track = ALBUM_SINGLES[index];

  const selectTrack = useCallback((next: number, autoplay = true) => {
    const bounded = (next + ALBUM_SINGLES.length) % ALBUM_SINGLES.length;
    indexRef.current = bounded;
    setIndex(bounded);
    setElapsed(0);
    setDuration(ALBUM_SINGLES[bounded].durationSec);
    const player = playerRef.current;
    if (!player) return;
    player.loadVideoById(ALBUM_SINGLES[bounded].youtubeId);
    if (!autoplay) player.pauseVideo();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    loadYoutubeApi()
      .then(() => {
        if (cancelled || !hostRef.current || !window.YT) return;
        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: ALBUM_SINGLES[0].youtubeId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setReady(true);
              const live = playerRef.current?.getDuration();
              if (live && live > 0) setDuration(live);
            },
            onStateChange: (event: { data: number }) => {
              const state = window.YT?.PlayerState;
              if (!state) return;
              if (event.data === state.PLAYING) {
                setPlaying(true);
                const live = playerRef.current?.getDuration();
                if (live && live > 0) setDuration(live);
              } else if (event.data === state.PAUSED) {
                setPlaying(false);
              } else if (event.data === state.ENDED) {
                selectTrack(indexRef.current + 1, true);
              }
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const time = player.getCurrentTime();
        if (Number.isFinite(time)) setElapsed(time);
      } catch {
        /* player not ready */
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [selectTrack]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  function seek(ratio: number) {
    const player = playerRef.current;
    if (!player || duration <= 0) return;
    const next = Math.min(duration, Math.max(0, ratio * duration));
    player.seekTo(next, true);
    setElapsed(next);
  }

  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;

  return (
    <div className="album-desk">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <NowPlaying
          track={track}
          playing={playing}
          ready={ready}
          elapsed={elapsed}
          duration={duration}
          progress={progress}
          onToggle={togglePlay}
          onPrev={() => selectTrack(index - 1)}
          onNext={() => selectTrack(index + 1)}
          onSeek={seek}
        />
        <TrackList
          current={track}
          playing={playing}
          onPick={(i) => selectTrack(i, true)}
        />
        <OfficialVideo hostRef={hostRef} failed={failed} track={track} />
      </div>
    </div>
  );
}

function NowPlaying({
  track,
  playing,
  ready,
  elapsed,
  duration,
  progress,
  onToggle,
  onPrev,
  onNext,
  onSeek,
}: {
  track: AlbumTrack;
  playing: boolean;
  ready: boolean;
  elapsed: number;
  duration: number;
  progress: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (ratio: number) => void;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 md:p-5">
      <div className="relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-xl bg-raised sm:max-w-none">
        <img
          key={track.youtubeId}
          src={youtubeThumb(track.youtubeId)}
          alt=""
          className="album-art-swap absolute inset-0 size-full object-cover"
        />
        {playing ? (
          <span className="album-eq pointer-events-none absolute right-3 bottom-3" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
        Now playing
      </p>
      <h2 className="font-display mt-2 text-2xl leading-tight font-extrabold tracking-tight text-white md:text-3xl">
        {track.title}
      </h2>
      <p className="mt-2 text-sm font-medium text-white">{track.artists}</p>
      <p className="mt-1 text-xs text-white/80">{track.sourceLabel}</p>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="album-transport tap-press inline-flex size-11 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-200 ease-out hover:bg-raised"
          aria-label="Previous single"
        >
          <SkipBack className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={!ready}
          data-album-play
          className="album-play tap-press inline-flex size-14 items-center justify-center rounded-full bg-vice-pink text-white shadow-[0_0_20px_rgb(255_30_142/0.55)] transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-white hover:text-ink disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="size-6" fill="currentColor" aria-hidden />
          ) : (
            <Play className="size-6 translate-x-0.5" fill="currentColor" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="album-transport tap-press inline-flex size-11 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-200 ease-out hover:bg-raised"
          aria-label="Next single"
        >
          <SkipForward className="size-5" aria-hidden />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Seek in current single</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(event) => onSeek(Number(event.target.value) / 1000)}
          data-album-progress
          className="album-seek w-full"
          style={{ ["--album-progress" as string]: `${Math.round(progress * 100)}%` }}
        />
      </label>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-white">
        <span>{formatClock(elapsed)}</span>
        <span>{formatClock(duration)}</span>
      </div>
    </section>
  );
}

function OfficialVideo({
  hostRef,
  failed,
  track,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  failed: boolean;
  track: AlbumTrack;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 lg:col-start-1 md:p-5">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
        Official video
      </p>
      <div className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-raised">
        <div ref={hostRef} id="vcf-yt-player" className="absolute inset-0 size-full" />
      </div>
      {failed ? (
        <p className="mt-4 text-sm text-white">
          The official player could not start here. Use Atlantic’s upload:{" "}
          <a href={track.officialUrl} className="link-draw text-vice-pink">
            {track.title}
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}

function TrackList({
  current,
  playing,
  onPick,
}: {
  current: AlbumTrack;
  playing: boolean;
  onPick: (index: number) => void;
}) {
  return (
    <section className="rounded-2xl bg-surface p-2 md:p-3">
      <ol className="flex flex-col">
        {ALBUM_SINGLES.map((song, i) => {
          const active = song.id === current.id;
          return (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                data-album-track={song.id}
                aria-current={active ? "true" : undefined}
                className={`album-track tap-press flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-[background-color,transform,color] duration-200 ease-out ${
                  active ? "bg-raised" : "hover:bg-raised/70"
                }`}
              >
                <span className="flex w-6 justify-center text-center text-sm tabular-nums text-white">
                  {active && playing ? (
                    <span className="album-eq album-eq-inline" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <span className={active ? "text-vice-pink" : undefined}>{i + 1}</span>
                  )}
                </span>
                <img
                  src={youtubeThumb(song.youtubeId)}
                  alt=""
                  width={40}
                  height={40}
                  className={`size-10 shrink-0 rounded-md object-cover transition-transform duration-300 ease-out ${
                    active ? "scale-105" : ""
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-semibold ${
                      active ? "text-vice-pink" : "text-white"
                    }`}
                  >
                    {song.title}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-white/80">
                    {song.artists}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-white">
                  {song.durationLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-1 flex items-start gap-3 rounded-xl px-3 py-4 text-white">
        <Lock className="mt-0.5 size-4 shrink-0 text-white/70" aria-hidden />
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">
            {ALBUM.trackCountAnnounced - ALBUM.singlesOut} tracks locked
          </span>
          {" until "}
          {ALBUM.fullAlbumOn}. Only the six official singles are listed.{" "}
          <a href={ALBUM.officialPage} className="link-draw text-vice-pink">
            Rockstar’s music page
          </a>
          .
        </p>
      </div>
    </section>
  );
}
