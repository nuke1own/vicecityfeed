"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCheck, Search, SquarePen, X } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { NewMessageDialog } from "@/components/messages/NewMessageDialog";
import { RelativeTime } from "@/components/social/RelativeTime";

export type InboxRow = {
  conversationId: string;
  lastMessageAt: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  lastBody: string | null;
  lastFromMe: boolean;
  lastSeen: boolean;
  unread: boolean;
  unreadCount: number;
};

/**
 * The conversation list: search, unread counts, "Seen", and New message.
 * Used as the Messages page and as the desktop sidebar beside a chat.
 */
export function InboxList({ entries, variant }: { entries: InboxRow[]; variant: "page" | "sidebar" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const Heading = variant === "page" ? "h1" : "h2";

  // Keep the list fresh while it is the page being looked at.
  useEffect(() => {
    if (variant !== "page") return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [variant, router]);

  const needle = query.trim().toLowerCase().replace(/^@/, "");
  const shown = needle
    ? entries.filter((entry) =>
        [entry.displayName, entry.handle, entry.lastBody ?? ""].some((text) => text.toLowerCase().includes(needle)),
      )
    : entries;
  const unreadTotal = entries.filter((entry) => entry.unread).length;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <Heading className="font-display text-2xl font-extrabold tracking-tight text-white md:text-[1.7rem]">Messages</Heading>
          <p className="text-sm text-white/65">
            {unreadTotal ? `${unreadTotal} unread ${unreadTotal === 1 ? "conversation" : "conversations"}` : "Private conversations with members"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing(true)}
          aria-label="New message"
          className="tap-press grid size-11 shrink-0 place-items-center rounded-full bg-vice-pink text-accent-ink shadow-[0_0_18px_rgb(var(--accent-rgb)/0.35)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <SquarePen aria-hidden className="size-5" />
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="px-4 pt-1 pb-3">
          <label className="search-field-plain flex h-11 items-center gap-2.5 rounded-full border border-white/10 bg-raised px-4 outline-none focus-within:border-white/40">
            <Search aria-hidden className="size-[18px] shrink-0 text-white/55" />
            <span className="sr-only">Search conversations</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              autoComplete="off"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/45 focus-visible:outline-none md:text-[15px]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-7 place-items-center rounded-full text-white/70 hover:bg-white/10">
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </label>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-bold text-white">No messages yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-white/70">Start a private conversation with anyone on Vice City Feed.</p>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-vice-pink px-5 text-sm font-bold text-accent-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <SquarePen aria-hidden className="size-4" />
              New message
            </button>
          </div>
        ) : shown.length === 0 ? (
          <p role="status" className="px-6 py-10 text-center text-sm text-white/65">
            No conversations match “{query.trim()}”.
          </p>
        ) : (
          <ul aria-label="Conversations" className="pb-4">
            {shown.map((entry) => {
              const href = `/social/messages/${entry.conversationId}/`;
              const active = pathname === href || pathname === href.slice(0, -1);
              return (
                <li key={entry.conversationId}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`tap-press mx-2 flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                      active ? "bg-white/[0.09]" : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`truncate text-[15px] text-white ${entry.unread ? "font-extrabold" : "font-bold"}`}>
                          {entry.displayName}
                        </span>
                        <span className="hidden truncate text-sm text-white/55 sm:inline">@{entry.handle}</span>
                        <RelativeTime
                          iso={entry.lastMessageAt}
                          className={`ml-auto shrink-0 text-xs ${entry.unread ? "font-bold text-vice-pink" : "text-white/55"}`}
                        />
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${entry.unread ? "font-semibold text-white" : "text-white/65"}`}>
                          {entry.lastBody ? `${entry.lastFromMe ? "You: " : ""}${entry.lastBody}` : "No messages yet"}
                        </span>
                        {entry.lastFromMe && entry.lastSeen ? (
                          <CheckCheck aria-label="Seen" className="size-4 shrink-0 text-vice-pink" />
                        ) : null}
                        {entry.unread ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-vice-pink px-1.5 text-[11px] font-bold text-accent-ink tabular-nums">
                            <span aria-hidden>{entry.unreadCount > 99 ? "99+" : entry.unreadCount}</span>
                            <span className="sr-only">{entry.unreadCount} unread</span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {composing ? <NewMessageDialog onClose={() => setComposing(false)} /> : null}
    </div>
  );
}
