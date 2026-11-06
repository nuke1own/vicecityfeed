import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AtSign, Heart, MessageCircle, Shield, UserPlus, Bell } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { MarkNotificationsRead } from "@/components/notifications/MarkNotificationsRead";
import { RelativeTime } from "@/components/social/RelativeTime";
import { getNotifications, type AppNotification } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

const KIND = {
  like: { Icon: Heart, tone: "text-[#ff5c8a]", text: "liked your post" },
  reply: { Icon: MessageCircle, tone: "text-vice-pink", text: "replied to your post" },
  mention: { Icon: AtSign, tone: "text-vice-pink", text: "mentioned you" },
  follow: { Icon: UserPlus, tone: "text-vice-pink", text: "followed you" },
  repost: { Icon: MessageCircle, tone: "text-vice-pink", text: "reposted your post" },
  moderation: { Icon: Shield, tone: "text-[#fcb92c]", text: "Vice City Feed staff reviewed your post" },
} as const;

function href(item: AppNotification): string {
  if (item.postId) return `/social/post/${item.postId}/`;
  if (item.actor) return `/u/${item.actor.handle}/`;
  return "/social/";
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/social/notifications/");
  const items = await getNotifications();

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <MarkNotificationsRead />
      <div className="border-b border-white/10 px-4 py-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">Notifications</h1>
        <p className="text-sm text-white/70">Likes, replies, mentions and new followers.</p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-vice-pink/15 text-vice-pink">
            <Bell aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-xl font-extrabold text-white">Nothing yet</p>
          <p className="mt-1 max-w-sm text-sm text-white/70">When people like, reply to or mention your posts, you will see it here.</p>
        </div>
      ) : (
        <ul>
          {items.map((item) => {
            const { Icon, tone, text } = KIND[item.kind];
            return (
              <li key={item.id} className="border-b border-white/10">
                <Link
                  href={href(item)}
                  className={`flex gap-3 px-4 py-3 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${item.read ? "" : "bg-vice-pink/[0.06]"}`}
                >
                  <Icon aria-hidden className={`mt-1 size-6 shrink-0 ${tone}`} fill={item.kind === "like" ? "currentColor" : "none"} />
                  <span className="min-w-0 flex-1">
                    {item.actor ? <Avatar displayName={item.actor.displayName} avatarUrl={item.actor.avatarUrl} size={32} /> : null}
                    <span className="mt-1.5 block text-[15px] text-white">
                      {item.actor ? <strong>{item.actor.displayName}</strong> : null} {text}
                      <span className="text-white/60"> · </span>
                      <RelativeTime iso={item.createdAt} className="text-sm text-white/60" />
                      {!item.read ? <span className="sr-only"> (new)</span> : null}
                    </span>
                    {item.postBody ? <span className="mt-0.5 line-clamp-2 block text-sm text-white/70">{item.postBody}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
