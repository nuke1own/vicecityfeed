import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Removes image files whose database rows were deleted (a deleted post, its
 * replies, a rolled-back post or a deleted account). The database queues the
 * files (see storage_cleanup in supabase/schema.sql); queued files may be
 * removed by any signed-in request, and entries are cleared only once the
 * file is really gone, so a failed attempt is retried on the next delete.
 */
export async function removeQueuedImageFiles(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.rpc("list_storage_cleanup", { p_limit: 200 });
  if (error || !Array.isArray(data) || data.length === 0) return;
  const paths = data.filter((path): path is string => typeof path === "string");
  if (paths.length === 0) return;
  await supabase.storage.from("post-images").remove(paths);
  await supabase.rpc("clear_storage_cleanup", { p_paths: paths });
}
