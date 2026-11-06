"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "./supabase";
import { applyTheme, currentTheme, isThemeId } from "./themes";

export type NavProfile = { handle: string; displayName: string; avatarUrl: string | null };
export type AccountState = { userId: string | null; profile: NavProfile | null };

const EMPTY: AccountState = { userId: null, profile: null };

// One profile request per user id, shared by every component that asks.
const profileRequests = new Map<string, Promise<NavProfile | null>>();

function loadProfile(userId: string): Promise<NavProfile | null> {
  let request = profileRequests.get(userId);
  if (!request) {
    request = (async () => {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, avatar_url, theme")
        .eq("id", userId)
        .maybeSingle();
      // A theme saved to the account wins, so it follows the member everywhere.
      if (data && isThemeId(data.theme) && data.theme !== currentTheme()) {
        applyTheme(data.theme);
      }
      return data
        ? { handle: data.handle, displayName: data.display_name, avatarUrl: data.avatar_url }
        : null;
    })();
    profileRequests.set(userId, request);
    // Let edits (new photo, new handle) show up on the next navigation.
    window.setTimeout(() => profileRequests.delete(userId), 5000);
  }
  return request;
}

/**
 * Who is signed in, for display in navigation only (the server re-verifies
 * every write). Rechecks on navigation because sign-in happens in a server
 * action, which does not fire client auth events.
 */
export function useAccount(): AccountState {
  const pathname = usePathname();
  const [state, setState] = useState<AccountState>(EMPTY);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    async function load(userId: string | null) {
      if (!userId) {
        if (!cancelled) setState(EMPTY);
        return;
      }
      const profile = await loadProfile(userId);
      if (!cancelled) setState({ userId, profile });
    }

    // Local cookie read only; no network unless someone is signed in.
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return state;
}
