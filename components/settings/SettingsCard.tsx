import type { ReactNode } from "react";

export function SettingsSection({
  title,
  id,
  description,
  children,
}: {
  title: string;
  id: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-bold tracking-tight text-white sm:text-xl">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-white/75">{description}</p> : null}
      <div className="mt-3 rounded-2xl border border-white/5 bg-raised px-4 sm:px-5">{children}</div>
    </section>
  );
}

export function PreviewNotice() {
  return (
    <p role="status" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-white">
      Preview mode: showing demo data. Changes are not saved.
    </p>
  );
}
