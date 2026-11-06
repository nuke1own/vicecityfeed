"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { votePoll } from "@/app/actions/social";
import type { PostPoll } from "@/lib/social";

function timeLeft(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Final results";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    // Round days up, like X: a fresh 3-day poll reads "3 days left".
    const days = Math.ceil(ms / 86_400_000);
    return `${days} ${days === 1 ? "day" : "days"} left`;
  }
  if (hours >= 1) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  return `${Math.max(1, Math.floor(ms / 60_000))} minutes left`;
}

/** Vote once; afterwards (or when the poll ends) everyone sees the results. */
export function PollView({ postId, poll, isAuthor }: { postId: string; poll: PostPoll; isAuthor: boolean }) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(poll);
  const closed = new Date(state.endsAt).getTime() <= now;
  const total = state.counts.reduce((sum, count) => sum + count, 0);
  const showResults = closed || state.myVote !== null || isAuthor;
  const leader = Math.max(...state.counts);

  function vote(option: number) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ ...state, myVote: option, counts: state.counts.map((c, i) => (i === option ? c + 1 : c)) });
      const result = await votePoll(postId, option);
      if (result.reason === "signed-out") {
        router.push(`/login/?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!result.ok) setError(result.reason === "closed" ? "This poll has ended." : "Your vote did not count. Please try again.");
      router.refresh();
    });
  }

  return (
    <div className="relative z-10 mt-2.5" role="group" aria-label="Poll">
      <ul className="space-y-2">
        {state.options.map((option, index) => {
          const count = state.counts[index] ?? 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          if (!showResults) {
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => vote(index)}
                  className="flex min-h-11 w-full items-center justify-center rounded-full border border-vice-pink/70 px-4 text-[15px] font-bold text-vice-pink transition-colors hover:bg-vice-pink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {option}
                </button>
              </li>
            );
          }
          const mine = state.myVote === index;
          const winner = count === leader && count > 0;
          return (
            <li key={option} className="relative flex min-h-10 items-center overflow-hidden rounded-lg">
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 rounded-lg transition-[width] duration-500 ${winner ? "bg-vice-pink/45" : "bg-white/12"}`}
                style={{ width: `${Math.max(percent, 1)}%` }}
              />
              <span className={`relative flex flex-1 items-center gap-1.5 px-3 text-[15px] ${winner ? "font-bold" : ""} text-white`}>
                {option}
                {mine ? <Check aria-label="Your vote" className="size-4 text-white" strokeWidth={3} /> : null}
              </span>
              <span className={`relative px-3 text-[15px] tabular-nums ${winner ? "font-bold" : ""} text-white`}>{percent}%</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-white/60">
        {total.toLocaleString("en-US")} {total === 1 ? "vote" : "votes"} · {timeLeft(state.endsAt, now)}
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-sm font-semibold text-[#ff8a8a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
