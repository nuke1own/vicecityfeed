"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notifies a member (on their private `user:<id>` channel) that a message just
 * arrived, so their inbox, badge and banner update without waiting for a poll.
 * Sent over REST, so there is no need to join their channel (only they can).
 */
export type DmNotice = {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatar: string | null;
  preview: string;
  createdAt: string;
};

export async function notifyMember(supabase: SupabaseClient, memberId: string, notice: DmNotice): Promise<void> {
  const channel = supabase.channel(`user:${memberId}`, { config: { private: true } });
  try {
    await channel.httpSend("message", notice);
  } catch {
    // Best effort: the other side's poll and the database feed still deliver.
  } finally {
    void supabase.removeChannel(channel);
  }
}

/** Window events between the chat, the inbox and the notifier on this page. */
export const DM_RECEIVED_EVENT = "vcf:dm-received";
export const DM_SENT_EVENT = "vcf:dm-sent";
export const DM_MUTED_EVENT = "vcf:dm-muted";
