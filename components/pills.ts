export function pillClass(active = false, extra = "") {
  return [
    "tap-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,transform,border-color,box-shadow] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    active
      ? "bg-vice-pink text-accent-ink shadow-[0_0_12px_rgb(var(--accent-rgb)/0.65),0_0_28px_rgb(var(--accent-rgb)/0.4),0_0_48px_rgb(var(--accent-rgb)/0.2)]"
      : "bg-raised text-white hover:bg-vice-pink hover:text-accent-ink hover:shadow-[0_0_12px_rgb(var(--accent-rgb)/0.6),0_0_26px_rgb(var(--accent-rgb)/0.35),0_0_44px_rgb(var(--accent-rgb)/0.18)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function outlinePillClass(extra = "") {
  return [
    "tap-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-out hover:border-vice-pink hover:bg-vice-pink hover:text-accent-ink hover:shadow-[0_0_12px_rgb(var(--accent-rgb)/0.65),0_0_28px_rgb(var(--accent-rgb)/0.4),0_0_48px_rgb(var(--accent-rgb)/0.2)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function ctaPillClass(variant: "white" | "gold" = "white", extra = "") {
  return [
    "tap-press inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-[background-color,color,transform,box-shadow] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    variant === "gold"
      ? "bg-gold text-ink hover:bg-sunset"
      : "bg-white text-ink hover:bg-vice-pink hover:text-accent-ink hover:shadow-[0_0_12px_rgb(var(--accent-rgb)/0.65),0_0_28px_rgb(var(--accent-rgb)/0.4),0_0_48px_rgb(var(--accent-rgb)/0.2)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Header icon buttons: no outline at rest; the outline appears on hover. */
export function ghostPillClass(extra = "") {
  return [
    "tap-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-transparent text-white transition-[background-color,color,border-color,transform] duration-200 ease-out hover:border-white/40 hover:bg-white/[0.04] aria-expanded:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Header controls: soft filled circle/pill that brightens on hover. */
export function headerButtonClass(extra = "") {
  return [
    "tap-press inline-flex shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white ring-1 ring-white/10 transition-[background-color,box-shadow,color] duration-200 ease-out hover:bg-white/[0.14] hover:ring-white/25 aria-expanded:bg-white/[0.14] aria-expanded:ring-white/30 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
