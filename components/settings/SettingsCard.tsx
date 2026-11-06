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
      <h2 id={id} className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
        {title}
      </h2>
      {description ? <p className="mt-2 text-base text-white/80">{description}</p> : null}
      <div className="mt-5 rounded-2xl border border-white/5 bg-raised px-5 sm:px-7">{children}</div>
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
