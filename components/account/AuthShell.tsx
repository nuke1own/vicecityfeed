import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-display text-[2rem] leading-[1.06] font-extrabold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base text-white/85">{description}</p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
        {children}
      </div>
      {footer ? <div className="mt-6 text-sm text-white/85">{footer}</div> : null}
    </main>
  );
}
