"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { DM_MUTED_EVENT, DM_RECEIVED_EVENT, type DmNotice } from "@/lib/dm-live";
import { loadSupabase } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import { refreshUnreadMessages } from "@/lib/use-unread";

/**
 * Listens on your private `user:<id>` channel for new messages, so the unread
 * badge, the inbox and a small banner update the moment someone hits Send,
 * on any page (not only inside that chat).
 */
export function MessageNotifier() {
  const { userId } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const [banner, setBanner] = useState<DmNotice | null>(null);
  const [muted, setMuted] = useState<Set<string>>(() => new Set());

  // Muted conversations get no banner.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadSupabase().then(async (supabase) => {
      if (!supabase || cancelled) return;
      const { data } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId).eq("muted", true);
      if (!cancelled) setMuted(new Set((data ?? []).map((row) => row.conversation_id as string)));
    });
    const onMuted = (event: Event) => {
      const { conversationId, muted: on } = (event as CustomEvent<{ conversationId: string; muted: boolean }>).detail;
      setMuted((set) => {
        const next = new Set(set);
        if (on) next.add(conversationId);
        else next.delete(conversationId);
        return next;
      });
    };
    window.addEventListener(DM_MUTED_EVENT, onMuted);
    return () => {
      cancelled = true;
      window.removeEventListener(DM_MUTED_EVENT, onMuted);
    };
  }, [userId]);

  const [notice, setNotice] = useState<DmNotice | null>(null);

  useEffect(() => {
    if (!userId) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    void loadSupabase().then((supabase) => {
      if (!supabase || cancelled) return;
      channel = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "message" }, ({ payload }) => {
          const incoming = payload as DmNotice;
          if (!incoming?.conversationId || incoming.senderId === userId) return;
          // The notice arrives before the message is saved: count again shortly after.
          for (const delay of [0, 700, 1600, 4000]) window.setTimeout(refreshUnreadMessages, delay);
          window.dispatchEvent(new CustomEvent(DM_RECEIVED_EVENT, { detail: incoming }));
          setNotice(incoming);
        })
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [userId]);

  // Show a banner unless you are already in that chat (or muted it).
  const [seenNotice, setSeenNotice] = useState<DmNotice | null>(null);
  if (notice !== seenNotice) {
    setSeenNotice(notice);
    const inThatChat = notice && pathname.replace(/\/$/, "") === `/social/messages/${notice.conversationId}`;
    if (notice && !inThatChat && !muted.has(notice.conversationId)) setBanner(notice);
  }

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 4500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  if (!banner) return null;
  return (
    <div className="dm-banner chat-pop fixed inset-x-0 z-[80] flex justify-center px-3" role="status" aria-live="polite">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-surface/95 p-2.5 pr-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            setBanner(null);
            router.push(`/social/messages/${banner.conversationId}/`);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-white"
        >
          <Avatar displayName={banner.senderName} avatarUrl={banner.senderAvatar} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">{banner.senderName}</span>
            <span className="block truncate text-sm text-white/75">{banner.preview}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setBanner(null)}
          aria-label="Dismiss"
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
