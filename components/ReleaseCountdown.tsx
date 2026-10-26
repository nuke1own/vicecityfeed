"use client";

import { useEffect, useState } from "react";
import { remainingUntilRelease, type ReleaseRemaining } from "@/lib/release";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function TickValue({ value }: { value: string }) {
  return (
    <span className="inline-flex overflow-hidden">
      <span key={value} className="tick-digit">
        {value}
      </span>
    </span>
  );
}

export function ReleaseCountdown() {
  const [remaining, setRemaining] = useState<ReleaseRemaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(remainingUntilRelease());
    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const live = remaining ? remaining.totalMs > 0 : true;
  const label = remaining
    ? live
      ? `Time until GTA 6 release on 19 November 2026. ${remaining.days} days ${remaining.hours} hours ${remaining.minutes} minutes remaining.`
      : "GTA 6 is out"
    : "Time until GTA 6 release on 19 November 2026.";

  return (
    <div
      className="countdown-chip group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.035] px-2.5 py-1.5 leading-none text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-300 hover:border-vice-pink/45 hover:bg-white/[0.055] hover:shadow-[0_0_20px_rgb(255_30_142/0.18)] md:gap-2.5 md:rounded-full md:px-3.5 md:py-2"
      aria-live="polite"
      aria-label={label}
      data-countdown={
        remaining
          ? live
            ? `${remaining.days}d-${pad(remaining.hours)}h-${pad(remaining.minutes)}m`
            : "out"
          : "pending"
      }
      data-remaining-ms={remaining ? String(remaining.totalMs) : ""}
      suppressHydrationWarning
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-vice-pink opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-vice-pink shadow-[0_0_8px_#ff1e8e]" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.14em] uppercase md:text-[10px] md:tracking-[0.16em]">
          <span className="text-vice-pink">GTA VI</span>
          <span className="hidden text-white/30 sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden whitespace-nowrap font-semibold tracking-[0.08em] text-white/65 sm:inline">
            {remaining && !live ? "In Stores" : "Nov 19"}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-bold tracking-tight tabular-nums text-white md:text-[13px]">
          {remaining ? (
            live ? (
              <>
                <TickValue value={String(remaining.days)} />
                <span className="text-white/60">d</span>{" "}
                <TickValue value={pad(remaining.hours)} />
                <span className="text-white/60">h</span>
                <span className="hidden md:inline">
                  {" "}
                  <TickValue value={pad(remaining.minutes)} />
                  <span className="text-white/60">m</span>
                </span>
              </>
            ) : (
              "Out now"
            )
          ) : (
            <span className="invisible" aria-hidden="true">
              00d 00h
            </span>
          )}
        </div>
        <div className="mt-0.5 whitespace-nowrap text-[8px] font-medium tracking-[0.05em] text-white/55 uppercase sm:hidden">
          {remaining && !live ? "in stores" : "until Nov 19"}
        </div>
      </div>
    </div>
  );
}
