"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowLeft, Ban, BellOff, Loader2, MoreHorizontal } from "lucide-react";
import {
  deleteChat,
  editMessage,
  loadEarlierMessages,
  markConversationRead,
  reactToMessage,
  sendChatMessage,
  setBlocked,
  setConversationMuted,
  unsendMessage,
} from "@/app/actions/messages";
import { Avatar } from "@/components/account/Avatar";
import { ChatComposer, type OutgoingMessage } from "@/components/messages/ChatComposer";
import { ChatOptions } from "@/components/messages/ChatOptions";
import { MessageActions } from "@/components/messages/MessageActions";
import { MessageBubble, type BubbleStatus } from "@/components/messages/MessageBubble";
import { ImageViewer } from "@/components/social/PostImages";
import { messageSummary, type ChatAttachment, type ChatImage, type ChatMessage } from "@/lib/chat";
import { MESSAGE_EDIT_WINDOW_MS, MESSAGE_PAGE_SIZE, type MessageReaction } from "@/lib/limits";
import { DM_MUTED_EVENT, DM_SENT_EVENT, notifyMember } from "@/lib/dm-live";
import { useIsOnline } from "@/lib/presence";
import { refreshUnreadMessages } from "@/lib/use-unread";
import { loadSupabase } from "@/lib/supabase";

type Person = { id: string; handle: string; displayName: string; avatarUrl: string | null };

type ChatScreenProps = {
  conversationId: string;
  viewer: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  other: Person;
  messages: ChatMessage[];
  otherLastReadAt: string | null;
  /** When the server signed this batch of media links (ms). */
  signedAt: number;
  /** When you last read the conversation before this visit ("New messages" line). */
  viewerLastReadAt: string | null;
  /** Older messages exist beyond the first page. */
  hasMore: boolean;
  muted: boolean;
  iBlocked: boolean;
  blockedMe: boolean;
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
  muted,
  iBlocked,
  blockedMe,
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
  // Messages from them that arrived live (before the server list has them).
  const [incoming, setIncoming] = useState<{ message: ChatMessage; confirmed: boolean }[]>([]);
  // Their reactions that arrived live: message id -> emoji (null = removed).
  const [remoteReactions, setRemoteReactions] = useState<Map<string, MessageReaction | null>>(() => new Map());
  const [liveReadAt, setLiveReadAt] = useState<string | null>(null);
  // They have this conversation open right now (shown like Snapchat).
  const [otherInChat, setOtherInChat] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Mute and block change at once; the server copy catches up on refresh.
  const [mutedNow, setMutedNow] = useState(muted);
  const [iBlockedNow, setIBlockedNow] = useState(iBlocked);
  const [seenFlags, setSeenFlags] = useState({ muted, iBlocked });
  if (seenFlags.muted !== muted || seenFlags.iBlocked !== iBlocked) {
    setSeenFlags({ muted, iBlocked });
    setMutedNow(muted);
    setIBlockedNow(iBlocked);
  }
  const blocked = iBlockedNow || blockedMe;
  const onSite = useIsOnline(other.id);
  // No activity either way while a block stands.
  const inChat = otherInChat && !blocked;
  const active = (onSite || otherInChat) && !blocked;
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
  const blockedRef = useRef(blocked);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  // Private (members-only) channel joined: message content may travel on it.
  const secureRef = useRef(false);

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
    // Edits the server now has: stop overriding (a later edit elsewhere then shows).
    if (edits.size) {
      const nextEdits = new Map(edits);
      for (const [id, edit] of edits) {
        const message = messages.find((item) => item.id === id);
        if (message?.editedAt && message.body === edit.body) nextEdits.delete(id);
      }
      if (nextEdits.size !== edits.size) setEdits(nextEdits);
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
      let reactions = message.reactions;
      if (remoteReactions.has(message.id)) {
        const theirs = remoteReactions.get(message.id) ?? null;
        reactions = reactions.filter((reaction) => reaction.userId !== other.id);
        if (theirs) reactions = [...reactions, { userId: other.id, emoji: theirs }];
      }
      if (overrides.has(message.id)) {
        const emoji = overrides.get(message.id) ?? null;
        reactions = reactions.filter((reaction) => reaction.userId !== viewer.id);
        if (emoji) reactions = [...reactions, { userId: viewer.id, emoji }];
      }
      return reactions === message.reactions ? message : { ...message, reactions };
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
    const serverClientIds = new Set(messages.map((message) => message.clientId).filter(Boolean));
    const fromServer = [...older.filter((message) => !liveIds.has(message.id)), ...messages]
      .filter((message) => !hidden.has(message.id))
      .map((message) => ({ message: withEdits(withLinks(withReactions(message))), status: "sent" as BubbleStatus }));
    // Live arrivals not in the server list yet (matched by id or the sender's client id).
    const arrived = incoming
      .filter(({ message }) => !liveIds.has(message.id) && !(message.clientId && serverClientIds.has(message.clientId)) && !hidden.has(message.id))
      .map(({ message, confirmed }) => ({
        message: confirmed ? withEdits(withReactions(message)) : message,
        status: (confirmed ? "sent" : "arrived") as BubbleStatus,
      }));
    // Just-sent messages (not in the server list yet) can already be unsent,
    // reacted to and edited, so the same changes apply to them.
    const local = pending
      .filter((item) => !(item.serverId && serverIds.has(item.serverId)) && !hidden.has(item.message.id))
      .map((item) => ({
        message: item.status === "sent" ? withEdits(withReactions(item.message)) : item.message,
        status: item.status,
      }));
    return [...fromServer, ...arrived, ...local];
  }, [messages, older, incoming, pending, hidden, overrides, remoteReactions, edits, serverIds, viewer.id, other.id, links]);

  const myReaction = useCallback(
    (message: ChatMessage): MessageReaction | null =>
      overrides.has(message.id)
        ? (overrides.get(message.id) ?? null)
        : (message.reactions.find((reaction) => reaction.userId === viewer.id)?.emoji ?? null),
    [overrides, viewer.id],
  );

  // "Seen" / "Sent" under your newest delivered message.
  const lastMine = [...items].reverse().find((item) => item.message.senderId === viewer.id && item.status === "sent");
  const readAt = [otherLastReadAt, liveReadAt].filter(Boolean).sort().at(-1) ?? null;
  const seen = Boolean(lastMine && readAt && new Date(readAt) >= new Date(lastMine.message.createdAt));

  // ----- Realtime: new messages, typing, reactions/unsend/read pings -----
  /**
   * Sends a live event to the other member. Message content (message, edit...)
   * only travels on the private members-only channel; pings work on either.
   */
  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      const channel = channelRef.current;
      if (!channel) return;
      const content = !["changed", "typing", "read"].includes(event);
      if (content && !secureRef.current) return;
      const body = { userId: viewer.id, ...payload };
      if (channel.state === "joined") void channel.send({ type: "broadcast", event, payload: body });
      else if (secureRef.current) void channel.httpSend(event, body).catch(() => undefined);
    },
    [viewer.id],
  );

  /** Tells the other member's inbox and badge (their private channel), at once. */
  const notifyOther = useCallback(
    (message: ChatMessage) => {
      const supabase = supabaseRef.current;
      if (!supabase || blockedRef.current) return;
      void notifyMember(supabase, other.id, {
        conversationId,
        senderId: viewer.id,
        senderName: viewer.displayName,
        senderHandle: viewer.handle,
        senderAvatar: viewer.avatarUrl,
        preview: messageSummary(message),
        createdAt: message.createdAt,
      });
      window.dispatchEvent(new CustomEvent(DM_SENT_EVENT, { detail: { conversationId, preview: messageSummary(message), createdAt: message.createdAt } }));
    },
    [conversationId, other.id, viewer],
  );

  const addIncoming = useCallback((message: ChatMessage, confirmed: boolean) => {
    setOtherTyping(false);
    setIncoming((list) => {
      const index = list.findIndex(
        (item) => item.message.id === message.id || (message.clientId && item.message.clientId === message.clientId),
      );
      if (index === -1) return [...list, { message, confirmed }];
      const next = [...list];
      next[index] = { message, confirmed: confirmed || next[index].confirmed };
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    const join = (supabase: SupabaseClient, secure: boolean) => {
      const channel = supabase
        .channel(`dm:${conversationId}`, { config: { private: secure, broadcast: { self: false }, presence: { key: viewer.id } } })
        .on("presence", { event: "sync" }, () => {
          setOtherInChat(Object.keys(channel.presenceState()).includes(other.id));
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.userId === viewer.id || blockedRef.current) return;
          setOtherTyping(true);
          if (typingTimer.current) window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setOtherTyping(false), 4000);
        })
        .on("broadcast", { event: "changed" }, () => refresh())
        // Instant delivery: the message itself, then its saved copy (or a retraction).
        .on("broadcast", { event: "message" }, ({ payload }) => {
          const message = payload?.message as ChatMessage | undefined;
          if (!message || message.senderId !== other.id || blockedRef.current) return;
          addIncoming(message, !message.id.startsWith("live-"));
        })
        .on("broadcast", { event: "confirmed" }, ({ payload }) => {
          const message = payload?.message as ChatMessage | undefined;
          if (message && message.senderId === other.id) addIncoming(message, true);
        })
        .on("broadcast", { event: "retract" }, ({ payload }) => {
          setIncoming((list) => list.filter((item) => item.message.clientId !== payload?.clientId));
        })
        .on("broadcast", { event: "read" }, ({ payload }) => {
          if (typeof payload?.at === "string") setLiveReadAt((value) => (value && value > payload.at ? value : payload.at));
        })
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          if (payload?.userId !== other.id || typeof payload?.messageId !== "string") return;
          setRemoteReactions((map) => new Map(map).set(payload.messageId, (payload.emoji as MessageReaction | null) ?? null));
        })
        .on("broadcast", { event: "unsend" }, ({ payload }) => {
          if (typeof payload?.messageId === "string") setHidden((set) => new Set(set).add(payload.messageId));
        })
        .on("broadcast", { event: "edit" }, ({ payload }) => {
          if (typeof payload?.messageId !== "string" || typeof payload?.body !== "string") return;
          setEdits((map) => new Map(map).set(payload.messageId, { body: payload.body, editedAt: String(payload.editedAt ?? new Date().toISOString()) }));
        })
        // Safety net: the saved row, in case a live event was missed.
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const row = payload.new as { id?: string; sender_id?: string; client_id?: string | null };
            if (row.sender_id === viewer.id) return;
            setOtherTyping(false);
            refresh();
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            secureRef.current = secure;
            if (!blockedRef.current) {
              // "In the chat": both people can see the other has it open.
              void channel.track({ at: new Date().toISOString() });
              // Opening the chat reads it: tell them now (for "Seen").
              void channel.send({ type: "broadcast", event: "read", payload: { userId: viewer.id, at: new Date().toISOString() } });
            }
          } else if (status === "CHANNEL_ERROR" && secure && !cancelled) {
            // Private channels not set up (run supabase/schema.sql): fall back to
            // pings only on a public channel; messages then arrive by refresh.
            void supabase.removeChannel(channel);
            join(supabase, false);
          }
        });
      channelRef.current = channel;
      stop = () => {
        channelRef.current = null;
        secureRef.current = false;
        void supabase.removeChannel(channel);
      };
    };
    void loadSupabase().then((supabase) => {
      if (!supabase || cancelled) return;
      supabaseRef.current = supabase;
      join(supabase, true);
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
  }, [conversationId, viewer.id, other.id, refresh, addIncoming]);

  useEffect(() => {
    blockedRef.current = blocked;
    const channel = channelRef.current;
    if (!channel || channel.state !== "joined") return;
    // Leave (or rejoin) the conversation's "in the chat" presence with the block.
    if (blocked) void channel.untrack();
    else void channel.track({ at: new Date().toISOString() });
  }, [blocked]);

  // Mark read when something new from them arrives (and tell them, for "Seen").
  const lastFromThem = [...items].reverse().find((item) => item.message.senderId !== viewer.id)?.message.id;
  useEffect(() => {
    if (!lastFromThem) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      // Tell them at once (for "Seen"), then save it.
      broadcast("read", { at: new Date().toISOString() });
      void markConversationRead(conversationId).then(() => refreshUnreadMessages());
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
      form.set("clientId", clientId);
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
        const saved = { ...result.message, clientId };
        if (outgoing.images.length || outgoing.voice) {
          // Media goes out once uploaded (with links the other side can open).
          broadcast("message", { message: saved });
          notifyOther(saved);
        } else {
          broadcast("confirmed", { clientId, message: saved });
        }
        refresh();
      } else {
        setPending((list) => list.map((item) => (item.clientId === clientId ? { ...item, status: "failed" } : item)));
        if (!outgoing.images.length && !outgoing.voice) broadcast("retract", { clientId });
        notify(result.error);
      }
    },
    [conversationId, broadcast, notifyOther, refresh, notify],
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
        clientId,
      };
      setPending((list) => [...list, { clientId, message, status: "sending", outgoing }]);
      setReply(null);
      atBottom.current = true;
      // Text goes to them the instant Send is tapped; the saved copy follows.
      if (!outgoing.images.length && !outgoing.voice) {
        const live = { ...message, id: `live-${clientId}` };
        broadcast("message", { message: live });
        notifyOther(live);
      }
      void deliver(clientId, outgoing);
    },
    [viewer.id, deliver, broadcast, notifyOther],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      const item = pending.find((entry) => entry.message.id === message.id);
      if (!item) return;
      setPending((list) => list.map((entry) => (entry.clientId === item.clientId ? { ...entry, status: "sending" } : entry)));
      if (!item.outgoing.images.length && !item.outgoing.voice) {
        broadcast("message", { message: { ...item.message, id: `live-${item.clientId}` } });
      }
      void deliver(item.clientId, item.outgoing);
    },
    [pending, deliver, broadcast],
  );

  const onTyping = useCallback(() => {
    if (blockedRef.current) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    broadcast("typing");
  }, [broadcast]);

  // ----- Message actions -----
  const react = useCallback(
    async (message: ChatMessage, emoji: MessageReaction | null) => {
      navigator.vibrate?.(6);
      const before = message.reactions.find((reaction) => reaction.userId === viewer.id)?.emoji ?? null;
      setOverrides((map) => new Map(map).set(message.id, emoji));
      broadcast("reaction", { messageId: message.id, emoji });
      const result = await reactToMessage(message.id, emoji).catch(() => ({ ok: false }));
      if (result.ok) {
        refresh();
      } else {
        broadcast("reaction", { messageId: message.id, emoji: before });
        setOverrides((map) => {
          const next = new Map(map);
          next.delete(message.id);
          return next;
        });
        notify("Your reaction was not saved. Please try again.");
      }
    },
    [broadcast, refresh, notify, viewer.id],
  );

  const heart = useCallback(
    (message: ChatMessage) => {
      if (blockedRef.current) return;
      void react(message, myReaction(message) === "❤️" ? null : "❤️");
    },
    [react, myReaction],
  );

  const startReply = useCallback((message: ChatMessage) => {
    if (blockedRef.current) return;
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
      broadcast("unsend", { messageId: message.id });
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
        broadcast("edit", { messageId: message.id, body, editedAt: result.editedAt });
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

  async function toggleMute() {
    const next = !mutedNow;
    setOptionsOpen(false);
    setMutedNow(next);
    const result = await setConversationMuted(conversationId, next).catch(() => ({ ok: false }));
    if (result.ok) {
      window.dispatchEvent(new CustomEvent(DM_MUTED_EVENT, { detail: { conversationId, muted: next } }));
      notify(next ? "Messages muted" : "Messages unmuted");
      refresh();
    } else {
      setMutedNow(!next);
      notify("That did not save. Please try again.");
    }
  }

  async function toggleBlock() {
    const next = !iBlockedNow;
    setOptionsOpen(false);
    setIBlockedNow(next);
    if (next) {
      setOtherTyping(false);
      setReply(null);
      setEditing(null);
    }
    const result = await setBlocked(other.id, next).catch(() => ({ ok: false }));
    if (result.ok) {
      notify(next ? `Blocked @${other.handle}` : `Unblocked @${other.handle}`);
      broadcast("changed");
      refresh();
    } else {
      setIBlockedNow(!next);
      notify("That did not save. Please try again.");
    }
  }

  async function removeChat() {
    setOptionsOpen(false);
    const result = await deleteChat(conversationId).catch(() => ({ ok: false }));
    if (result.ok) router.push("/social/messages/");
    else notify("The chat could not be deleted. Please try again.");
  }

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
    <section ref={screenRef} className="chat-screen relative flex w-full flex-col bg-black" aria-label={`Conversation with ${other.displayName}`}>
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
            <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={40} />
            {active ? (
              <span aria-hidden className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-black bg-[#5ee8a0]" />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <h1 className="truncate text-[15px] leading-tight font-bold text-white">{other.displayName}</h1>
              {mutedNow ? <BellOff aria-label="Muted" className="size-3.5 shrink-0 text-white/55" /> : null}
            </span>
            <span className="block truncate text-xs text-white/60" aria-live="polite">
              {otherTyping && !blocked ? (
                <span className="font-semibold text-vice-pink">typing…</span>
              ) : inChat ? (
                <span className="font-semibold text-[#5ee8a0]">In the chat</span>
              ) : active ? (
                <span className="font-semibold text-[#5ee8a0]">Active now</span>
              ) : (
                `@${other.handle}`
              )}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOptionsOpen(true)}
          aria-label="Conversation options"
          aria-haspopup="dialog"
          className="tap-press grid size-11 shrink-0 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <MoreHorizontal aria-hidden className="size-[22px]" />
        </button>
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
              {blocked ? null : <p className="mt-6 text-sm text-white/70">Say hi to start the conversation.</p>}
              <div className={`mt-3 flex-wrap justify-center gap-2 ${blocked ? "hidden" : "flex"}`}>
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
          {otherTyping && !blocked ? (
            <div className="chat-pop mt-2 flex items-end gap-2" aria-hidden>
              <span className="in-chat-avatar relative shrink-0 rounded-full">
                <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={32} />
              </span>
              <span className="typing-dots flex h-9 items-center gap-1 rounded-[1.35rem] rounded-bl-[0.45rem] bg-raised px-3.5">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : inChat ? (
            // Like Snapchat: their avatar shows at the bottom while they have this chat open.
            <div className="chat-pop mt-2 flex items-center gap-2" data-in-chat>
              <span className="in-chat-avatar relative shrink-0 rounded-full">
                <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={32} />
                <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-black bg-[#5ee8a0]" />
              </span>
              <span className="text-xs font-semibold text-white/55">{other.displayName} is in the chat</span>
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
        {iBlockedNow ? (
          <div className="chat-composer border-t border-white/10 bg-black/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-white">
              <Ban aria-hidden className="size-4 text-[#ff8a8a]" />
              You blocked @{other.handle}
            </p>
            <p className="mt-0.5 text-xs text-white/60">They can&apos;t message you or see when you&apos;re active.</p>
            <button
              type="button"
              onClick={() => void toggleBlock()}
              className="tap-press mt-2.5 min-h-10 rounded-full bg-white/[0.1] px-5 text-sm font-bold text-white hover:bg-white/[0.16] focus-visible:outline-2 focus-visible:outline-white"
            >
              Unblock
            </button>
          </div>
        ) : blockedMe ? (
          <div className="chat-composer border-t border-white/10 bg-black/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
            <p className="text-sm font-bold text-white">You can&apos;t reply to this conversation</p>
            <p className="mt-0.5 text-xs text-white/60">@{other.handle} isn&apos;t receiving messages from you.</p>
          </div>
        ) : (
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
        )}
      </div>

      {actionsFor ? (
        <MessageActions
          blocked={blocked}
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

      {optionsOpen ? (
        <ChatOptions
          other={other}
          muted={mutedNow}
          iBlocked={iBlockedNow}
          onMute={() => void toggleMute()}
          onBlock={() => void toggleBlock()}
          onDelete={() => void removeChat()}
          onClose={() => setOptionsOpen(false)}
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
        <p role="status" className="chat-toast chat-pop pointer-events-none absolute left-1/2 z-[70] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-[0_10px_30px_rgb(0_0_0/0.5)]">
          {toast}
        </p>
      ) : null}
    </section>
  );
}
