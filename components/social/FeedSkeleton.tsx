/** Shimmering placeholders shown instantly while a social page loads. */
export function PostSkeleton() {
  return (
    <div className="flex gap-3 border-b border-white/10 px-4 py-4" aria-hidden>
      <span className="skeleton size-11 shrink-0 rounded-full" />
      <span className="flex-1 space-y-2.5 pt-1">
        <span className="skeleton block h-3.5 w-2/5 rounded-full" />
        <span className="skeleton block h-3.5 w-full rounded-full" />
        <span className="skeleton block h-3.5 w-4/5 rounded-full" />
        <span className="mt-3 flex gap-8">
          <span className="skeleton block h-3.5 w-8 rounded-full" />
          <span className="skeleton block h-3.5 w-8 rounded-full" />
        </span>
      </span>
    </div>
  );
}

export function FeedSkeleton({ title, rows = 6 }: { title?: string; rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-2xl md:border-x md:border-white/10" aria-busy="true">
      <span className="sr-only" role="status">Loading{title ? ` ${title}` : ""}</span>
      <div className="border-b border-white/10 px-4 py-5">
        <span className="skeleton block h-8 w-36 rounded-lg" aria-hidden />
        <span className="skeleton mt-3 block h-3.5 w-3/4 rounded-full" aria-hidden />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1].map((key) => (
        <div key={key} className="rounded-2xl border border-white/10 bg-surface p-4">
          <span className="skeleton block h-5 w-2/3 rounded-full" />
          <span className="skeleton mt-4 block h-3.5 w-full rounded-full" />
          <span className="skeleton mt-3 block h-3.5 w-5/6 rounded-full" />
          <span className="skeleton mt-3 block h-3.5 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
