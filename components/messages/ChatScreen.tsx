"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowDown, ArrowLeft, Loader2, UserRound } from "lucide-react";
import {
  editMessage,
  loadEarlierMessages,
  markConversationRead,
  reactToMessage,
  sendChatMessage,
  unsendMessage,
} from "@/app/actions/messages";
import { Avatar } from "@/components/account/Avatar";
import { ChatComposer, type OutgoingMessage } from "@/components/messages/ChatComposer";
import { MessageActions } from "@/components/messages/MessageActions";
import { MessageBubble, type BubbleStatus } from "@/components/messages/MessageBubble";
import { ImageViewer } from "@/components/social/PostImages";
import { messageSummary, type ChatAttachment, type ChatImage, type ChatMessage } from "@/lib/chat";
import { MESSAGE_EDIT_WINDOW_MS, MESSAGE_PAGE_SIZE, type MessageReaction } from "@/lib/limits";
import { loadSupabase } from "@/lib/supabase";

type Person = { id: string; handle: string; displayName: string; avatarUrl: string | null };

type ChatScreenProps = {
  conversationId: string;
  viewer: { id: string; handle: string };
  other: Person;
  messages: ChatMessage[];
  otherLastReadAt: string | null;
  /** When the server signed this batch of media links (ms). */
  signedAt: number;
  /** When you last read the conversation before this visit ("New messages" line). */
  viewerLastReadAt: string | null;
  /** Older messages exist beyond the first page. */
  hasMore: boolean;
};

type Pending = {
  clientId: string;
  message: ChatMessage;
  status: BubbleStatus;
  outgoing: OutgoingMessage;
  serverId?: string;
};

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const GROUP_GAP_MS = 5 * 60_000;
const TIME_GAP_MS = 60 * 60_000;
const QUICK_STARTS = ["Hey! 👋", "What's up?", "🔥🔥🔥"];
/** Signed links last an hour; reuse one for 45 minutes. */
const LINK_REUSE_MS = 45 * 60_000;

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFormat.format(date);
}

/**
 * On phones the conversation is a full-screen app view: it follows the
 * visible viewport, so the message box sits right above the keyboard.
 */
function useKeyboardAwareHeight(ref: React.RefObject<HTMLElement | null>, onResize: () => void) {
  useEffect(() => {
    const el = ref.current;
    const viewport = window.visualViewport;
    if (!el || !viewport) return;
    const phone = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (!phone.matches) {
        el.style.removeProperty("height");
        el.style.removeProperty("top");
        return;
      }
      el.style.height = `${viewport.height}px`;
      el.style.top = `${viewport.offsetTop}px`;
      onResize();
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    phone.addEventListener("change", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      phone.removeEventListener("change", apply);
    };
  }, [ref, onResize]);
}

export function ChatScreen({
  conversationId,
  viewer,
  other,
  messages,
  otherLastReadAt,
  signedAt,
  viewerLastReadAt,
  hasMore,
}: ChatScreenProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [pending, setPending] = useState<Pending[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [overrides, setOverrides] = useState<Map<string, MessageReaction | null>>(() => new Map());
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [gallery, setGallery] = useState<{ images: ChatImage[]; index: number } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  // Earlier pages loaded by scrolling up (and messages pushed off the live page).
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [moreOlder, setMoreOlder] = useState(hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Your edits, shown at once.
  const [edits, setEdits] = useState<Map<string, { body: string; editedAt: string }>>(() => new Map());
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [canEditActions, setCanEditActions] = useState(false);
  // The first message that arrived since your last visit (fixed for this visit).
  const [firstUnreadId] = useState(
    () =>
      messages.find((message) => message.senderId !== viewer.id && viewerLastReadAt && message.createdAt > viewerLastReadAt)?.id ??
      null,
  );

  const screenRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const restoreScroll = useRef<number | null>(null);

  const refresh = useCallback(() => startRefresh(() => router.refresh()), [router]);

  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottom.current = true;
    setNewBelow(0);
  }, []);

  const keepPinned = useCallback(() => {
    if (atBottom.current) scrollToBottom();
  }, [scrollToBottom]);
  useKeyboardAwareHeight(screenRef, keepPinned);

  // ----- Merge server messages with optimistic changes -----
  const serverIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages]);

  // When fresh server data arrives: drop sent messages it now has, and
  // reactions it already reflects (derived during render, not in an effect).
  const [seenMessages, setSeenMessages] = useState(messages);
  // Every refresh signs new links to the same private files. Keep using the
  // first link while it is valid, so photos do not reload and voice messages
  // do not restart.
  const [links, setLinks] = useState<Map<string, { url: string; at: number }>>(
    () => new Map(messages.flatMap((message) => message.attachments.map((item) => [item.key, { url: item.url, at: signedAt }] as const))),
  );
  if (messages !== seenMessages) {
    // A full live page that gained new messages pushes the oldest ones off;
    // keep them on screen as "older" messages.
    if (messages.length >= MESSAGE_PAGE_SIZE && messages[0]) {
      const oldest = messages[0].createdAt;
      const pushedOff = seenMessages.filter((message) => message.createdAt < oldest && !serverIds.has(message.id));
      if (pushedOff.length) {
        setOlder((list) => {
          const ids = new Set(list.map((message) => message.id));
          return [...list, ...pushedOff.filter((message) => !ids.has(message.id))].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
        });
      }
    }
    setSeenMessages(messages);
    const now = signedAt;
    let changed = false;
    const nextLinks = new Map(links);
    for (const message of messages) {
      for (const item of message.attachments) {
        const known = nextLinks.get(item.key);
        if (!known || now - known.at > LINK_REUSE_MS) {
          nextLinks.set(item.key, { url: item.url, at: now });
          changed = true;
        }
      }
    }
    if (changed) setLinks(nextLinks);
    if (pending.some((item) => item.serverId && serverIds.has(item.serverId))) {
      setPending((list) => list.filter((item) => !(item.serverId && serverIds.has(item.serverId))));
    }
    if (overrides.size) {
      const next = new Map(overrides);
      for (const [id, emoji] of overrides) {
        const message = messages.find((item) => item.id === id);
        const current = message?.reactions.find((reaction) => reaction.userId === viewer.id)?.emoji ?? null;
        if (!message || current === emoji) next.delete(id);
      }
      if (next.size !== overrides.size) setOverrides(next);
    }
  }

  const items = useMemo(() => {
    const withReactions = (message: ChatMessage): ChatMessage => {
      if (!overrides.has(message.id)) return message;
      const emoji = overrides.get(message.id) ?? null;
      const others = message.reactions.filter((reaction) => reaction.userId !== viewer.id);
      return { ...message, reactions: emoji ? [...others, { userId: viewer.id, emoji }] : others };
    };
    const withLinks = (message: ChatMessage): ChatMessage =>
      message.attachments.length === 0
        ? message
        : { ...message, attachments: message.attachments.map((item) => ({ ...item, url: links.get(item.key)?.url ?? item.url })) };
    const withEdits = (message: ChatMessage): ChatMessage => {
      const edit = edits.get(message.id);
      return edit && edit.editedAt !== message.editedAt ? { ...message, body: edit.body, editedAt: edit.editedAt } : message;
    };
    const liveIds = new Set(messages.map((message) => message.id));
    const fromServer = [...older.filter((message) => !liveIds.has(message.id)), ...messages]
      .filter((message) => !hidden.has(message.id))
      .map((message) => ({ message: withEdits(withLinks(withReactions(message))), status: "sent" as BubbleStatus }));
    const local = pending
      .filter((item) => !(item.serverId && serverIds.has(item.serverId)))
      .map((item) => ({ message: item.message, status: item.status }));
    return [...fromServer, ...local];
  }, [messages, older, pending, hidden, overrides, edits, serverIds, viewer.id, links]);

  const myReaction = useCallback(
    (message: ChatMessage): MessageReaction | null =>
      overrides.has(message.id)
        ? (overrides.get(message.id) ?? null)
        : (message.reactions.find((reaction) => reaction.userId === viewer.id)?.emoji ?? null),
    [overrides, viewer.id],
  );

  // "Seen" / "Sent" under your newest delivered message.
  const lastMine = [...items].reverse().find((item) => item.message.senderId === viewer.id && item.status === "sent");
  const seen = Boolean(lastMine && otherLastReadAt && new Date(otherLastReadAt) >= new Date(lastMine.message.createdAt));

  // ----- Realtime: new messages, typing, reactions/unsend/read pings -----
  const broadcast = useCallback((event: "changed" | "typing", payload: Record<string, string> = {}) => {
    void channelRef.current?.send({ type: "broadcast", event, payload: { userId: viewer.id, ...payload } });
  }, [viewer.id]);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    void loadSupabase().then((supabase) => {
      if (!supabase || cancelled) return;
      const channel = supabase
        .channel(`dm:${conversationId}`, { config: { broadcast: { self: false }, presence: { key: viewer.id } } })
        .on("presence", { event: "sync" }, () => {
          setOtherOnline(Object.keys(channel.presenceState()).includes(other.id));
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.userId === viewer.id) return;
          setOtherTyping(true);
          if (typingTimer.current) window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setOtherTyping(false), 4000);
        })
        .on("broadcast", { event: "changed" }, () => refresh())
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          () => {
            setOtherTyping(false);
            refresh();
          },
        )
        .subscribe((status) => {
          // "Active now": both people in the conversation can see the other is here.
          if (status === "SUBSCRIBED") void channel.track({ at: new Date().toISOString() });
        });
      channelRef.current = channel;
      stop = () => {
        channelRef.current = null;
        void supabase.removeChannel(channel);
      };
    });
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      stop?.();
    };
  }, [conversationId, viewer.id, other.id, refresh]);

  // Mark read when something new from them arrives (and tell them, for "Seen").
  const lastFromThem = [...messages].reverse().find((message) => message.senderId !== viewer.id)?.id;
  useEffect(() => {
    if (!lastFromThem) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      void markConversationRead(conversationId).then(() => broadcast("changed"));
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [lastFromThem, conversationId, broadcast]);

  // ----- Scrolling -----
  useLayoutEffect(() => {
    const list = listRef.current;
    const divider = list?.querySelector<HTMLElement>("[data-unread-divider]");
    if (list && divider && divider.offsetTop < list.scrollHeight - list.clientHeight) {
      // Lots of new messages: start at the first one, not the bottom.
      list.scrollTop = Math.max(0, divider.offsetTop - 72);
      atBottom.current = false;
      return;
    }
    scrollToBottom();
    // Only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastItem = items.at(-1);
  const lastKey = lastItem?.message.id;
  const previousLast = useRef(lastKey);
  useLayoutEffect(() => {
    // Only a new message at the bottom counts (not older ones loaded above).
    const grew = lastKey !== previousLast.current && lastKey !== undefined;
    previousLast.current = lastKey;
    if (!grew) return;
    if (atBottom.current || lastItem?.message.senderId === viewer.id) scrollToBottom(true);
    else setNewBelow((value) => value + 1);
  }, [lastKey, lastItem, viewer.id, scrollToBottom]);

  useEffect(() => {
    if (otherTyping && atBottom.current) scrollToBottom(true);
  }, [otherTyping, scrollToBottom]);

  // Photos finishing loading change heights: stay pinned to the newest message.
  useEffect(() => {
    const list = listRef.current;
    const content = list?.firstElementChild;
    if (!list || !content) return;
    const observer = new ResizeObserver(() => keepPinned());
    observer.observe(content);
    return () => observer.disconnect();
  }, [keepPinned]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !moreOlder) return;
    const first = older[0] ?? messages[0];
    if (!first) return;
    setLoadingOlder(true);
    const list = listRef.current;
    const result = await loadEarlierMessages(conversationId, first.createdAt).catch(() => null);
    if (!result) {
      setLoadingOlder(false);
      notify("Earlier messages could not be loaded.");
      return;
    }
    restoreScroll.current = list ? list.scrollHeight - list.scrollTop : null;
    setLinks((map) => {
      const next = new Map(map);
      for (const message of result.messages) {
        for (const item of message.attachments) if (!next.has(item.key)) next.set(item.key, { url: item.url, at: result.signedAt });
      }
      return next;
    });
    setOlder((list) => {
      const ids = new Set(list.map((message) => message.id));
      return [...result.messages.filter((message) => !ids.has(message.id)), ...list];
    });
    setMoreOlder(result.hasMore);
    setLoadingOlder(false);
  }, [loadingOlder, moreOlder, older, messages, conversationId, notify]);

  // Keep your place when older messages are added above.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && restoreScroll.current !== null) {
      list.scrollTop = list.scrollHeight - restoreScroll.current;
      restoreScroll.current = null;
    }
  }, [older]);

  // Load the previous page when the top of the list comes into view.
  useEffect(() => {
    const target = topRef.current;
    const list = listRef.current;
    if (!target || !list || !moreOlder) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadOlder();
    }, { root: list, rootMargin: "300px 0px 0px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [moreOlder, loadOlder]);

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (atBottom.current && newBelow) setNewBelow(0);
  }

  const jumpTo = useCallback((id: string) => {
    const target = listRef.current?.querySelector(`[data-message-id="${CSS.escape(id)}"]`);
    if (!target) {
      notify("That message is too far back to show.");
      return;
    }
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlight(id);
    window.setTimeout(() => setHighlight((value) => (value === id ? null : value)), 1600);
  }, [notify]);

  // ----- Sending -----
  const deliver = useCallback(
    async (clientId: string, outgoing: OutgoingMessage) => {
      const form = new FormData();
      form.set("conversationId", conversationId);
      form.set("body", outgoing.body);
      if (outgoing.replyTo) form.set("replyTo", outgoing.replyTo.id);
      for (const image of outgoing.images) {
        form.append("image", image.file);
        form.append("imageWidth", String(image.width));
        form.append("imageHeight", String(image.height));
      }
      if (outgoing.voice) {
        const ext = outgoing.voice.type.includes("mp4") ? "m4a" : outgoing.voice.type.includes("ogg") ? "ogg" : "webm";
        form.set("voice", new File([outgoing.voice.blob], `voice.${ext}`, { type: outgoing.voice.type }));
        form.set("voiceDuration", String(Math.round(outgoing.voice.durationMs)));
        form.set("voicePeaks", JSON.stringify(outgoing.voice.peaks));
      }
      const result = await sendChatMessage(form).catch(() => ({ ok: false as const, error: "Your message was not sent. Check your connection." }));
      if (result.ok) {
        setPending((list) =>
          list.map((item) =>
            item.clientId === clientId
              ? {
                  ...item,
                  status: "sent",
                  serverId: result.message.id,
                  // Keep the local previews until the server copy replaces this one.
                  message: { ...result.message, attachments: item.message.attachments },
                }
              : item,
          ),
        );
        broadcast("changed");
        refresh();
      } else {
        setPending((list) => list.map((item) => (item.clientId === clientId ? { ...item, status: "failed" } : item)));
        notify(result.error);
      }
    },
    [conversationId, broadcast, refresh, notify],
  );

  const send = useCallback(
    (outgoing: OutgoingMessage) => {
      const clientId = crypto.randomUUID();
      const attachments: ChatAttachment[] = outgoing.voice
        ? [{ kind: "audio", key: `local-${clientId}`, url: URL.createObjectURL(outgoing.voice.blob), durationMs: outgoing.voice.durationMs, peaks: outgoing.voice.peaks }]
        : outgoing.images.map((image, index) => ({
            kind: "image",
            key: `local-${clientId}-${index}`,
            url: image.preview,
            width: image.width,
            height: image.height,
            alt: `Photo ${index + 1} you sent`,
          }));
      const message: ChatMessage = {
        id: `local-${clientId}`,
        body: outgoing.body,
        createdAt: new Date().toISOString(),
        senderId: viewer.id,
        replyTo: outgoing.replyTo?.id ?? null,
        reply: outgoing.replyTo
          ? { id: outgoing.replyTo.id, senderId: outgoing.replyTo.senderId, text: messageSummary(outgoing.replyTo) }
          : null,
        attachments,
        reactions: [],
        editedAt: null,
      };
      setPending((list) => [...list, { clientId, message, status: "sending", outgoing }]);
      setReply(null);
      atBottom.current = true;
      void deliver(clientId, outgoing);
    },
    [viewer.id, deliver],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      const item = pending.find((entry) => entry.message.id === message.id);
      if (!item) return;
      setPending((list) => list.map((entry) => (entry.clientId === item.clientId ? { ...entry, status: "sending" } : entry)));
      void deliver(item.clientId, item.outgoing);
    },
    [pending, deliver],
  );

  const onTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    broadcast("typing");
  }, [broadcast]);

  // ----- Message actions -----
  const react = useCallback(
    async (message: ChatMessage, emoji: MessageReaction | null) => {
      navigator.vibrate?.(6);
      setOverrides((map) => new Map(map).set(message.id, emoji));
      const result = await reactToMessage(message.id, emoji).catch(() => ({ ok: false }));
      if (result.ok) {
        broadcast("changed");
        refresh();
      } else {
        setOverrides((map) => {
          const next = new Map(map);
          next.delete(message.id);
          return next;
        });
        notify("Your reaction was not saved. Please try again.");
      }
    },
    [broadcast, refresh, notify],
  );

  const heart = useCallback(
    (message: ChatMessage) => void react(message, myReaction(message) === "❤️" ? null : "❤️"),
    [react, myReaction],
  );

  const startReply = useCallback((message: ChatMessage) => {
    setReply(message);
    setFocusSignal((value) => value + 1);
  }, []);

  const openImages = useCallback((images: ChatImage[], index: number) => setGallery({ images, index }), []);

  async function unsend(message: ChatMessage) {
    setActionsFor(null);
    setHidden((set) => new Set(set).add(message.id));
    if (reply?.id === message.id) setReply(null);
    const result = await unsendMessage(message.id).catch(() => ({ ok: false }));
    if (result.ok) {
      broadcast("changed");
      refresh();
      notify("Message unsent");
    } else {
      setHidden((set) => {
        const next = new Set(set);
        next.delete(message.id);
        return next;
      });
      notify("That message could not be unsent.");
    }
  }

  const startEdit = useCallback((message: ChatMessage) => {
    setReply(null);
    setEditing(message);
    setFocusSignal((value) => value + 1);
  }, []);

  const saveEdit = useCallback(
    async (message: ChatMessage, body: string) => {
      setEditing(null);
      if (body === message.body.trim()) return;
      const previous = edits.get(message.id);
      setEdits((map) => new Map(map).set(message.id, { body, editedAt: new Date().toISOString() }));
      const result = await editMessage(message.id, body).catch(() => ({ ok: false as const, error: "That message could not be edited." }));
      if (result.ok) {
        broadcast("changed");
        refresh();
      } else {
        setEdits((map) => {
          const next = new Map(map);
          if (previous) next.set(message.id, previous);
          else next.delete(message.id);
          return next;
        });
        notify(result.error);
      }
    },
    [edits, broadcast, refresh, notify],
  );

  /** Up arrow in an empty box edits your last message (desktop), like Slack. */
  const editLast = useCallback(() => {
    const now = Date.now();
    const last = [...items].reverse().find(
      (item) =>
        item.status === "sent" &&
        item.message.senderId === viewer.id &&
        item.message.body.trim() &&
        now - new Date(item.message.createdAt).getTime() < MESSAGE_EDIT_WINDOW_MS,
    );
    if (last) startEdit(last.message);
  }, [items, viewer.id, startEdit]);

  const openActions = useCallback((message: ChatMessage) => {
    // Decided when the sheet opens (an event, so reading the clock is fine).
    setCanEditActions(
      message.senderId === viewer.id &&
        Boolean(message.body.trim()) &&
        Date.now() - new Date(message.createdAt).getTime() < MESSAGE_EDIT_WINDOW_MS,
    );
    setActionsFor(message);
  }, [viewer.id]);

  async function copy(message: ChatMessage) {
    setActionsFor(null);
    try {
      await navigator.clipboard.writeText(message.body);
      notify("Copied");
    } catch {
      notify("Copying is not available here.");
    }
  }

  // ----- Render -----
  const rows: React.ReactNode[] = [];
  items.forEach((item, index) => {
    const { message } = item;
    const previous = items[index - 1]?.message;
    const next = items[index + 1]?.message;
    const time = new Date(message.createdAt).getTime();
    const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
    const gap = previous ? time - new Date(previous.createdAt).getTime() : 0;
    if (newDay) {
      rows.push(
        <li key={`day-${message.id}`} className="my-4 flex justify-center">
          <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">{dayLabel(message.createdAt)}</span>
        </li>,
      );
    } else if (gap > TIME_GAP_MS) {
      rows.push(
        <li key={`gap-${message.id}`} className="my-3 text-center text-[11px] font-semibold text-white/50">
          {timeFormat.format(new Date(message.createdAt))}
        </li>,
      );
    }
    const sameAsPrevious = previous && previous.senderId === message.senderId && !newDay && gap < GROUP_GAP_MS;
    const sameAsNext =
      next &&
      next.senderId === message.senderId &&
      new Date(next.createdAt).toDateString() === new Date(message.createdAt).toDateString() &&
      new Date(next.createdAt).getTime() - time < GROUP_GAP_MS;
    const mine = message.senderId === viewer.id;
    if (message.id === firstUnreadId) {
      rows.push(
        <li key="unread-divider" data-unread-divider className="my-3 flex items-center gap-3 px-1" role="separator" aria-label="New messages">
          <span aria-hidden className="h-px flex-1 bg-vice-pink/60" />
          <span className="text-[11px] font-bold tracking-[0.14em] text-vice-pink uppercase">New messages</span>
          <span aria-hidden className="h-px flex-1 bg-vice-pink/60" />
        </li>,
      );
    }
    rows.push(
      <li key={message.id}>
        <MessageBubble
          message={message}
          mine={mine}
          status={item.status}
          receipt={lastMine && lastMine.message.id === message.id ? (seen ? "Seen" : "Sent") : null}
          groupStart={!sameAsPrevious}
          groupEnd={!sameAsNext}
          otherName={other.displayName}
          otherAvatar={other.avatarUrl}
          viewerId={viewer.id}
          highlighted={highlight === message.id}
          onActions={openActions}
          onReply={startReply}
          onHeart={heart}
          onJump={jumpTo}
          onOpenImages={openImages}
          onRetry={retry}
        />
      </li>,
    );
  });

  return (
    <section ref={screenRef} className="chat-screen flex w-full flex-col bg-black" aria-label={`Conversation with ${other.displayName}`}>
      <header className="chat-top flex shrink-0 items-center gap-1 border-b border-white/10 bg-black/85 px-1.5 py-1.5 backdrop-blur-xl">
        <Link
          href="/social/messages/"
          aria-label="Back to messages"
          // Wide screens show the conversation list alongside, so no back button there.
          className="tap-press grid size-11 shrink-0 place-items-center rounded-full text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white lg:hidden"
        >
          <ArrowLeft aria-hidden className="size-[22px]" />
        </Link>
        <Link
          href={`/u/${other.handle}/`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="relative shrink-0">
            <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={38} />
            {otherOnline ? (
              <span aria-hidden className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-black bg-[#5ee8a0]" />
            ) : null}
          </span>
          <span className="min-w-0">
            <h1 className="truncate text-[15px] leading-tight font-bold text-white">{other.displayName}</h1>
            <span className="block truncate text-xs text-white/60" aria-live="polite">
              {otherTyping ? (
                <span className="font-semibold text-vice-pink">typing…</span>
              ) : otherOnline ? (
                <span className="font-semibold text-[#5ee8a0]">Active now</span>
              ) : (
                `@${other.handle}`
              )}
            </span>
          </span>
        </Link>
        <Link
          href={`/u/${other.handle}/`}
          aria-label={`View ${other.displayName}'s profile`}
          className="tap-press grid size-11 shrink-0 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <UserRound aria-hidden className="size-[21px]" />
        </Link>
      </header>

      <div ref={listRef} onScroll={onScroll} className="chat-list relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 sm:px-4">
        <div className="flex min-h-full flex-col justify-end pt-3 pb-2">
          <div ref={topRef} aria-hidden={!loadingOlder} className="flex min-h-1 justify-center">
            {loadingOlder ? (
              <span className="flex items-center gap-2 py-3 text-xs font-semibold text-white/60">
                <Loader2 aria-hidden className="size-4 animate-spin" /> Loading earlier messages
              </span>
            ) : null}
          </div>
          {items.length > 0 && !moreOlder ? (
            <div className="flex flex-col items-center px-6 pt-6 pb-4 text-center">
              <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={64} />
              <p className="mt-2 text-base font-extrabold text-white">{other.displayName}</p>
              <p className="text-xs text-white/55">@{other.handle} · This is the start of your conversation</p>
            </div>
          ) : null}
          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
              <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={88} />
              <p className="mt-3 text-xl font-extrabold text-white">{other.displayName}</p>
              <p className="text-sm text-white/60">@{other.handle}</p>
              <Link
                href={`/u/${other.handle}/`}
                className="mt-3 inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10"
              >
                View profile
              </Link>
              <p className="mt-6 text-sm text-white/70">Say hi to start the conversation.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {QUICK_STARTS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => send({ body: text, images: [], voice: null, replyTo: null })}
                    className="tap-press min-h-10 rounded-full bg-raised px-4 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <ol aria-label={`Messages with ${other.displayName}`} className="flex flex-col">
            {rows}
          </ol>
          {otherTyping ? (
            <div className="chat-pop mt-2 flex items-end gap-2" aria-hidden>
              <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={28} />
              <span className="typing-dots flex h-9 items-center gap-1 rounded-[1.35rem] rounded-bl-[0.45rem] bg-raised px-3.5">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Above the list, so the emoji panel covers message reactions. */}
      <div className="relative z-20 shrink-0">
        {newBelow > 0 ? (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="chat-pop absolute -top-14 left-1/2 z-20 inline-flex min-h-10 -translate-x-1/2 items-center gap-1.5 rounded-full bg-vice-pink px-4 text-sm font-bold text-accent-ink shadow-[0_8px_24px_rgb(0_0_0/0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowDown aria-hidden className="size-4" />
            {newBelow === 1 ? "1 new message" : `${newBelow} new messages`}
          </button>
        ) : null}
        <ChatComposer
          conversationId={conversationId}
          otherName={other.displayName}
          viewerId={viewer.id}
          replyTo={reply}
          onCancelReply={() => setReply(null)}
          onSend={send}
          onTyping={onTyping}
          focusSignal={focusSignal}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaveEdit={(body) => editing && void saveEdit(editing, body)}
          onEditLast={editLast}
        />
      </div>

      {actionsFor ? (
        <MessageActions
          message={actionsFor}
          mine={actionsFor.senderId === viewer.id}
          senderName={other.displayName}
          myReaction={myReaction(actionsFor)}
          onReact={(emoji) => {
            const target = actionsFor;
            setActionsFor(null);
            void react(target, emoji);
          }}
          onReply={() => {
            const target = actionsFor;
            setActionsFor(null);
            startReply(target);
          }}
          onCopy={() => void copy(actionsFor)}
          onEdit={
            canEditActions
              ? () => {
                  const target = actionsFor;
                  setActionsFor(null);
                  startEdit(target);
                }
              : undefined
          }
          onUnsend={() => void unsend(actionsFor)}
          onClose={() => setActionsFor(null)}
        />
      ) : null}

      {gallery ? (
        <ImageViewer
          images={gallery.images.map((image) => ({ url: image.url, alt: image.alt, width: image.width, height: image.height }))}
          index={gallery.index}
          onIndex={(index) => setGallery((value) => (value ? { ...value, index } : value))}
          onClose={() => setGallery(null)}
          unoptimized
        />
      ) : null}

      {toast ? (
        <p role="status" className="chat-toast pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-[0_10px_30px_rgb(0_0_0/0.5)]">
          {toast}
        </p>
      ) : null}
    </section>
  );
}
