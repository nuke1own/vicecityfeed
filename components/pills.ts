export function pillClass(active = false, extra = "") {
  return [
    "tap-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,transform,border-color,box-shadow] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
    active
      ? "bg-vice-pink text-white shadow-[0_0_20px_rgb(255_30_142/0.45)]"
      : "bg-raised text-white hover:bg-vice-pink hover:text-white hover:shadow-[0_0_18px_rgb(255_30_142/0.4)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function outlinePillClass(extra = "") {
  return [
    "tap-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-out hover:border-vice-pink hover:bg-vice-pink hover:text-white hover:shadow-[0_0_20px_rgb(255_30_142/0.45)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white",
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
      : "bg-white text-ink hover:bg-vice-pink hover:text-white hover:shadow-[0_0_20px_rgb(255_30_142/0.45)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
