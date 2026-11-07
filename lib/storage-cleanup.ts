import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deleting posts or messages removes their rows (and everything that cascades
 * from them) in the database, which queues their files. Storage cannot be
 * cleaned from SQL, so this removes the queued files and clears the queue.
 */
const QUEUES = [
  { bucket: "post-images", list: "list_storage_cleanup", clear: "clear_storage_cleanup" },
  { bucket: "message-media", list: "list_message_media_cleanup", clear: "clear_message_media_cleanup" },
] as const;

export async function removeQueuedImageFiles(supabase: SupabaseClient): Promise<void> {
  for (const queue of QUEUES) {
    const { data, error } = await supabase.rpc(queue.list, { p_limit: 200 });
    if (error || !Array.isArray(data) || data.length === 0) continue;
    const paths = data.filter((path): path is string => typeof path === "string");
    if (paths.length === 0) continue;
    await supabase.storage.from(queue.bucket).remove(paths);
    await supabase.rpc(queue.clear, { p_paths: paths });
  }
}
