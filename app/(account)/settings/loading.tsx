/** Instant placeholder while a settings page renders on the server. */
export default function SettingsLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only" role="status">Loading settings</span>
      <div className="h-28 animate-pulse rounded-2xl bg-raised" />
      <div className="h-7 w-48 animate-pulse rounded-full bg-raised" />
      <div className="h-64 animate-pulse rounded-2xl bg-raised" />
    </div>
  );
}
