"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { messageSchema } from "@/lib/community-validation";
import { getCurrentProfile } from "@/lib/profiles";
import { createServerSupabase } from "@/lib/supabase-server";

export type MessageFormState = {
  status: "idle" | "error" | "sent";
  message?: string;
  sentAt?: number;
};

/** Opens (or creates) the one-to-one conversation with another member. */
export async function startConversation(otherId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?next=/messages/");
  if (!z.uuid().safeParse(otherId).success || otherId === profile.id) redirect("/messages/");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("start_conversation", { p_other: otherId });
  if (error || typeof data !== "string") redirect("/messages/?error=start");
  redirect(`/messages/${data}/`);
}

export async function sendMessage(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?next=/messages/");
  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: profile.id,
    body: parsed.data.body,
  });
  if (error) {
    return {
      status: "error",
      message: error.message.includes("rate_limited")
        ? "You are sending messages too fast. Wait a moment."
        : "Your message was not sent. Please try again.",
    };
  }
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  return { status: "sent", sentAt: Date.now() };
}

/** Marks a conversation read for the viewer (unread badge and inbox dot). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !z.uuid().safeParse(conversationId).success) return;
  const supabase = await createServerSupabase();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", profile.id);
}
