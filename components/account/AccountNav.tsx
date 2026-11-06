"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { outlinePillClass } from "@/components/pills";
import { getSupabase } from "@/lib/supabase";

type NavProfile = { handle: string; displayName: string; avatarUrl: string | null };

/**
 * Header account control: "Sign in" when signed out, avatar linking to the
 * member's profile when signed in. Rechecks on navigation because sign-in
 * happens in a server action, which does not fire client auth events.
 */
export function AccountNav() {
  const pathname = usePathname();
  const [state, setState] = useState<{ userId: string | null; profile: NavProfile | null }>({
    userId: null,
    profile: null,
  });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    async function load(userId: string | null) {
      if (!userId) {
        if (!cancelled) setState({ userId: null, profile: null });
        return;
      }
      const { data } = await supabase!
        .from("profiles")
        .select("handle, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setState({
        userId,
        profile: data
          ? { handle: data.handle, displayName: data.display_name, avatarUrl: data.avatar_url }
          : null,
      });
    }

    // Local cookie read only; this is for display, the server re-verifies.
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  const size = "size-9 min-h-9 sm:size-11 sm:min-h-11";

  if (state.profile) {
    const { handle, displayName, avatarUrl } = state.profile;
    return (
      <Link
        href={`/u/${handle}/`}
        aria-label={`Your profile, @${handle}`}
        data-account-nav="signed-in"
        className={outlinePillClass(`${size} overflow-hidden p-0`)}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            width={44}
            height={44}
            sizes="44px"
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span aria-hidden className="text-xs font-bold">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={state.userId ? "/settings/profile/" : "/login/"}
      aria-label={state.userId ? "Your account" : "Sign in or join"}
      data-account-nav="signed-out"
      className={outlinePillClass(`${size} md:w-auto md:gap-2 md:px-3.5`)}
    >
      <UserRound className="size-4 shrink-0" aria-hidden />
      <span className="hidden text-xs font-semibold tracking-wide md:inline">
        {state.userId ? "Account" : "Sign in"}
      </span>
    </Link>
  );
}
