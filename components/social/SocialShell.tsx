import type { ReactNode } from "react";
import { SocialNav } from "@/components/social/SocialNav";

/** Left Social navigation plus the page (timeline, thread, inbox...). */
export function SocialShell({ children }: { children: ReactNode }) {
  return (
    <div className="social-shell mx-auto flex w-full max-w-7xl justify-center md:gap-3 md:px-4 xl:gap-6">
      <SocialNav />
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
    </div>
  );
}
