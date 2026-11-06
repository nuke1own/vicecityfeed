"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { startConversation } from "@/app/actions/messages";
import { FollowButton } from "@/components/social/FollowButton";
import { outlinePillClass } from "@/components/pills";
import { useAccount } from "@/lib/use-account";

/** Edit profile for the owner; Message and Follow for everyone else. */
export function ProfileActions({ profileId, handle }: { profileId: string; handle: string }) {
  const { userId } = useAccount();

  if (userId === profileId) {
    return (
      <Link href="/settings/profile/" className={outlinePillClass("px-4 text-sm font-semibold")}>
        Edit profile
      </Link>
    );
  }

  return (
    <div className="flex gap-2">
      {userId ? (
        <form action={startConversation.bind(null, profileId)}>
          <button type="submit" aria-label={`Message @${handle}`} className={outlinePillClass("size-11")}>
            <Mail aria-hidden className="size-5" />
          </button>
        </form>
      ) : null}
      <FollowButton profileId={profileId} handle={handle} />
    </div>
  );
}
