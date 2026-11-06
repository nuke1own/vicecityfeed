import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { PostComposer } from "@/components/social/PostComposer";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = { title: "New post", robots: { index: false, follow: false } };

/** Full-screen composer, opened from the floating button on phones. */
export default async function ComposePage() {
  if (!(await getCurrentUser())) redirect("/login/?next=/social/compose/");
  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-3 pt-3 pb-10">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/social/" aria-label="Cancel" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <X aria-hidden className="size-6" />
        </Link>
        <h1 className="text-lg font-bold text-white">New post</h1>
        <span className="size-11" aria-hidden />
      </div>
      <PostComposer autoFocus redirectToSocial id="compose-full" />
    </main>
  );
}
