import type { ReactNode } from "react";

export const primaryButtonClass =
  "tap-press inline-flex min-h-11 items-center justify-center rounded-sm bg-vice-pink px-6 text-base font-bold text-black transition-colors duration-200 hover:bg-white disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white";

export const secondaryButtonClass =
  "tap-press inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-white px-6 text-base font-bold text-white transition-colors duration-200 hover:border-vice-pink hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white";

export const textLinkClass =
  "text-sm text-white underline underline-offset-2 hover:text-vice-pink";

type AuthCardProps = {
  /** Renders as the page's single H1 when `as` is "h1". */
  title?: string;
  as?: "h1" | "h2";
  titleId?: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, as: Heading = "h1", titleId, description, children }: AuthCardProps) {
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className="w-full rounded-sm border border-white/10 bg-surface p-5 shadow-[0_20px_60px_rgb(0_0_0/0.5)] sm:p-6"
    >
      {title ? (
        <Heading id={titleId} className="text-2xl font-bold tracking-tight text-white">
          {title}
        </Heading>
      ) : null}
      {description ? <p className="mt-2 text-base text-white/85">{description}</p> : null}
      <div className={title || description ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}
