import "server-only";
import { createServerSupabase } from "./supabase-server";

export type ReportedPost = {
  postId: string;
  body: string;
  hidden: boolean;
  postCreatedAt: string;
  authorHandle: string;
  authorName: string;
  reportCount: number;
  reasons: string[];
  lastReportedAt: string;
};

type Row = {
  post_id: string;
  body: string;
  hidden: boolean;
  post_created_at: string;
  author_handle: string;
  author_name: string;
  report_count: number | string;
  reasons: string[] | null;
  last_reported_at: string;
};

export const STAFF_ROLES = ["moderator", "editor", "admin"] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role ?? "");
}

/** Reported posts for staff ("open" needs a decision, "resolved" were hidden). */
export async function getReportQueue(status: "open" | "resolved"): Promise<ReportedPost[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("get_report_queue", { p_status: status });
  return ((data ?? []) as Row[]).map((row) => ({
    postId: row.post_id,
    body: row.body,
    hidden: row.hidden,
    postCreatedAt: row.post_created_at,
    authorHandle: row.author_handle,
    authorName: row.author_name,
    reportCount: Number(row.report_count) || 0,
    reasons: row.reasons ?? [],
    lastReportedAt: row.last_reported_at,
  }));
}
