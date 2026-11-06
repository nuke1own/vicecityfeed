import type { ReactNode } from "react";
import { SocialNav } from "@/components/social/SocialNav";

/** Left Social navigation plus the page (timeline, thread, inbox...). */
export function SocialShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center md:gap-2 md:px-3 xl:gap-4">
      <SocialNav />
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
    </div>
  );
}
