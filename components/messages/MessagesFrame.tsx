"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

/**
 * Desktop (lg and up): the conversation list stays beside an open chat, like
 * X and Instagram. The Messages page lays out its own list, so the sidebar
 * shows only inside a conversation. Phones always show one at a time.
 */
export function MessagesFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return (
    <div className="flex w-full justify-center">
      {segment && sidebar ? (
        <aside aria-label="Conversations" className="messages-pane hidden w-[22rem] shrink-0 flex-col border-l border-white/10 lg:flex">
          {sidebar}
        </aside>
      ) : null}
      {children}
    </div>
  );
}
