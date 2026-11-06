/** Shows the current accent on real UI so people can judge a theme. */
export function ThemePreview() {
  return (
    <div className="flex flex-wrap items-center gap-3 py-4 md:py-7" aria-label="Theme preview">
      <span className="inline-flex min-h-11 items-center rounded-full bg-vice-pink px-5 text-sm font-bold text-accent-ink shadow-[0_0_14px_rgb(var(--accent-rgb)/0.55)]">
        Active pill
      </span>
      <span className="inline-flex min-h-11 items-center rounded-full border border-vice-pink px-5 text-sm font-semibold text-vice-pink">
        Outline
      </span>
      <span className="text-base font-semibold text-vice-pink underline underline-offset-2">A link</span>
      <span className="rounded-full bg-vice-pink px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-accent-ink uppercase">
        Breaking
      </span>
    </div>
  );
}
