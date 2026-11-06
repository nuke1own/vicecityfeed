import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:py-10 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-12 md:px-6 lg:gap-20">
      <aside className="min-w-0 md:sticky md:top-48 md:self-start">
        <SettingsNav />
      </aside>
      <main id="main" className="min-w-0 space-y-10 pb-12">
        {children}
      </main>
    </div>
  );
}
