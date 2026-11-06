"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderatePost } from "@/app/actions/moderation";

type Props = { postId: string; hidden: boolean; resolved: boolean };

export function ModerationActions({ postId, hidden, resolved }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function run(action: "hide" | "restore" | "dismiss") {
    setError(false);
    startTransition(async () => {
      const result = await moderatePost(postId, action);
      if (!result.ok) setError(true);
      router.refresh();
    });
  }

  const base =
    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hidden ? (
        <button type="button" disabled={pending} onClick={() => run("restore")} className={`${base} border border-white/25 text-white hover:border-white`}>
          Restore post
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => run("hide")} className={`${base} bg-[#c62f35] text-white hover:bg-[#e0353c]`}>
          Hide post
        </button>
      )}
      {!resolved && !hidden ? (
        <button type="button" disabled={pending} onClick={() => run("dismiss")} className={`${base} border border-white/25 text-white hover:border-white`}>
          Dismiss reports
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-[#ff8a8a]">
          That did not work. Please try again.
        </p>
      ) : null}
    </div>
  );
}
