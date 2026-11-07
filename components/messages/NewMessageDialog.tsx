"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { findPeopleToMessage, startConversation, type MessageCandidate } from "@/app/actions/messages";
import { Avatar } from "@/components/account/Avatar";

function PersonButton({ person }: { person: MessageCandidate }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-press flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none disabled:opacity-70"
    >
      <Avatar displayName={person.displayName} avatarUrl={person.avatarUrl} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-white">{person.displayName}</span>
        <span className="block truncate text-sm text-white/60">@{person.handle}</span>
      </span>
      {pending ? (
        <Loader2 aria-label="Opening conversation" className="size-5 animate-spin text-white/70" />
      ) : (
        <ChevronRight aria-hidden className="size-5 text-white/40" />
      )}
    </button>
  );
}

/** "New message": find a member by name or @handle and open the conversation. */
export function NewMessageDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<MessageCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);

  // Search as you type (debounced); with an empty box, suggest people you follow.
  useEffect(() => {
    const request = ++latest.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const found = await findPeopleToMessage(query).catch(() => []);
      if (request !== latest.current) return;
      setPeople(found);
      setSearching(false);
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();

  return (
    <dialog
      ref={ref}
      aria-labelledby="new-message-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="message-sheet m-0 mt-auto h-[min(85dvh,40rem)] w-full max-w-none bg-transparent p-0 text-white backdrop:bg-black/60 sm:m-auto sm:h-[min(80dvh,36rem)] sm:w-[28rem]"
    >
      <div className="message-sheet-panel flex h-full flex-col rounded-t-[1.75rem] border border-white/10 bg-surface sm:rounded-3xl">
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />
        <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-2">
          <h2 id="new-message-title" className="text-lg font-extrabold text-white">
            New message
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-press grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="shrink-0 px-4 pb-2">
          <label className="search-field-plain flex h-12 items-center gap-2.5 rounded-full border border-white/12 bg-raised px-4 outline-none focus-within:border-white/40">
            <Search aria-hidden className="size-[18px] shrink-0 text-white/60" />
            <span className="sr-only">Search people</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or @handle"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/45 focus-visible:outline-none"
            />
            {searching ? <Loader2 aria-hidden className="size-4 animate-spin text-white/60" /> : null}
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!trimmed && people && people.length > 0 ? (
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.14em] text-white/55 uppercase">People you follow</p>
          ) : null}
          {people === null ? null : people.length === 0 ? (
            <p role="status" className="px-4 py-10 text-center text-sm text-white/65">
              {trimmed ? `No members match “${trimmed}”.` : "Search for someone to message."}
            </p>
          ) : (
            <ul aria-label={trimmed ? "Search results" : "Suggestions"}>
              {people.map((person) => (
                <li key={person.id}>
                  <form action={startConversation.bind(null, person.id)}>
                    <PersonButton person={person} />
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
