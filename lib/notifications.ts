import "server-only";
import { createServerSupabase } from "./supabase-server";

export type NotificationKind = "reply" | "like" | "repost" | "follow" | "mention" | "moderation";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
  postId: string | null;
  postBody: string | null;
  actor: { handle: string; displayName: string; avatarUrl: string | null } | null;
};

type Row = {
  id: string;
  kind: NotificationKind;
  created_at: string;
  read: boolean;
  post_id: string | null;
  post_body: string | null;
  actor_handle: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("get_notifications", { p_limit: 60 });
  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    createdAt: row.created_at,
    read: row.read,
    postId: row.post_id,
    postBody: row.post_body,
    actor: row.actor_handle
      ? { handle: row.actor_handle, displayName: row.actor_name ?? row.actor_handle, avatarUrl: row.actor_avatar }
      : null,
  }));
}
