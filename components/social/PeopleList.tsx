import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import type { SuggestedMember } from "@/lib/social";

export function PeopleList({ people }: { people: SuggestedMember[] }) {
  return (
    <ul>
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Link href={`/u/${person.handle}/`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar displayName={person.displayName} avatarUrl={person.avatarUrl} size={48} />
            <span className="min-w-0">
              <span className="flex items-center gap-1 font-bold text-white">
                <span className="truncate">{person.displayName}</span>
                {person.isStaff ? <BadgeCheck aria-label="Vice City Feed staff" className="size-4 shrink-0 text-vice-pink" /> : null}
              </span>
              <span className="block truncate text-sm text-white/60">@{person.handle}</span>
              {person.bio ? <span className="line-clamp-1 text-sm text-white/80">{person.bio}</span> : null}
            </span>
          </Link>
          <FollowButton profileId={person.id} handle={person.handle} size="sm" />
        </li>
      ))}
    </ul>
  );
}
