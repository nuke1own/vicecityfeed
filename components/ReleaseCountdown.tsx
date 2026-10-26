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

function TimeBlock({
  value,
  unit,
  accent = false,
  className = "",
}: {
  value: string;
  unit: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-[2.1rem] flex-col items-center justify-center rounded-lg bg-surface px-1.5 py-1 sm:min-w-[2.5rem] sm:px-2 sm:py-1.5 ${className}`.trim()}
    >
      <span
        className={`font-display text-xs leading-none font-extrabold tracking-tight tabular-nums sm:text-sm md:text-[15px] ${
          accent ? "text-vice-pink" : "text-white"
        }`}
      >
        <TickValue value={value} />
      </span>
      <span className="mt-1 text-[7px] leading-none font-bold tracking-[0.14em] text-white/50 uppercase sm:text-[8px]">
        {unit}
      </span>
    </div>
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
      ? `Time until GTA 6 release on 19 November 2026. ${remaining.days} days ${remaining.hours} hours ${remaining.minutes} minutes ${remaining.seconds} seconds remaining.`
      : "GTA 6 is out"
    : "Time until GTA 6 release on 19 November 2026.";

  return (
    <div
      className="countdown-chip inline-flex min-w-0 items-center leading-none text-white"
      aria-live="polite"
      aria-label={label}
      data-countdown={
        remaining
          ? live
            ? `${remaining.days}d-${pad(remaining.hours)}h-${pad(remaining.minutes)}m-${pad(remaining.seconds)}s`
            : "out"
          : "pending"
      }
      data-remaining-ms={remaining ? String(remaining.totalMs) : ""}
      suppressHydrationWarning
    >
      {remaining ? (
        live ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <TimeBlock value={String(remaining.days)} unit="Days" />
            <span
              aria-hidden="true"
              className="-mt-2 text-[10px] font-bold text-vice-pink/60 select-none sm:text-xs"
            >
              :
            </span>
            <TimeBlock value={pad(remaining.hours)} unit="Hrs" />
            <span
              aria-hidden="true"
              className="hidden -mt-2 text-[10px] font-bold text-vice-pink/60 select-none sm:inline sm:text-xs"
            >
              :
            </span>
            <TimeBlock
              value={pad(remaining.minutes)}
              unit="Min"
              className="hidden sm:flex"
            />
            <span
              aria-hidden="true"
              className="hidden -mt-2 text-[10px] font-bold text-vice-pink/60 select-none md:inline sm:text-xs"
            >
              :
            </span>
            <TimeBlock
              value={pad(remaining.seconds)}
              unit="Sec"
              accent
              className="hidden md:flex"
            />
          </div>
        ) : (
          <div className="rounded-lg bg-vice-pink px-2.5 py-1 text-xs font-extrabold tracking-wider text-white uppercase shadow-[0_0_16px_rgb(255_30_142/0.45)]">
            Out Now
          </div>
        )
      ) : (
        <div
          className="invisible flex items-center gap-1 sm:gap-1.5"
          aria-hidden="true"
        >
          <TimeBlock value="00" unit="Days" />
          <TimeBlock value="00" unit="Hrs" />
          <TimeBlock value="00" unit="Min" className="hidden sm:flex" />
          <TimeBlock value="00" unit="Sec" className="hidden md:flex" />
        </div>
      )}
    </div>
  );
}
