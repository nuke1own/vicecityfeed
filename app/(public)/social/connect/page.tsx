import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { PeopleList } from "@/components/social/PeopleList";
import { getCurrentUser } from "@/lib/profiles";
import { getWhoToFollow } from "@/lib/social";

export const metadata: Metadata = { title: "Follow people", robots: { index: false, follow: true } };

export default async function ConnectPage() {
  const user = await getCurrentUser();
  const people = await getWhoToFollow(user?.id ?? null, 25);
  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-2">
        <Link href="/social/" aria-label="Back to Social" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Follow</h1>
          <p className="text-xs text-white/60">Find people to follow in the community.</p>
        </div>
      </div>
      {people.length ? (
        <PeopleList people={people} />
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-vice-pink/15 text-vice-pink">
            <UserPlus aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-xl font-extrabold text-white">You are following everyone</p>
          <p className="mt-1 text-sm text-white/70">New members will show up here.</p>
        </div>
      )}
    </main>
  );
}
