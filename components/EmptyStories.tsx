type EmptyStoriesProps = {
  className?: string;
};

export function EmptyStories({ className = "" }: EmptyStoriesProps) {
  return (
    <div
      data-empty-stories
      className={`empty-desk reveal ${className}`.trim()}
    >
      <div className="flex items-center gap-2.5">
        <span className="wire-pulse" aria-hidden />
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
          Desk quiet
        </p>
      </div>
      <p className="mt-3 text-lg font-bold text-white">No stories yet</p>
      <div className="empty-desk-slots mt-6" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function EmptyFeed() {
  return (
    <div className="empty-desk reveal max-w-2xl">
      <div className="flex items-center gap-2.5">
        <span className="wire-pulse" aria-hidden />
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
          Editorial · Live desk
        </p>
      </div>
      <h1
        id="hero-heading"
        className="font-display mt-3 text-[2.1rem] leading-[1.05] font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl"
      >
        Articles
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-snug font-bold text-white md:text-xl">
        Stories from the Vice City Feed staff land here.
      </p>
      <div className="empty-desk-slots mt-10" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
