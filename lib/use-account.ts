"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasAuthCookie, isSupabaseConfigured, loadSupabase } from "./supabase";
import { applyTheme, currentTheme, isThemeId } from "./themes";

export type NavProfile = { handle: string; displayName: string; avatarUrl: string | null; isStaff: boolean };
export type AccountState = {
  userId: string | null;
  profile: NavProfile | null;
  /** False until the session has been read, so "signed out" is not assumed too early. */
  ready: boolean;
};

const EMPTY: AccountState = { userId: null, profile: null, ready: false };
const SIGNED_OUT: AccountState = { userId: null, profile: null, ready: true };

// One profile request per user id, shared by every component that asks.
const profileRequests = new Map<string, Promise<NavProfile | null>>();

function loadProfile(userId: string): Promise<NavProfile | null> {
  let request = profileRequests.get(userId);
  if (!request) {
    request = (async () => {
      const supabase = await loadSupabase();
      if (!supabase) return null;
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, avatar_url, theme, role")
        .eq("id", userId)
        .maybeSingle();
      // A theme saved to the account wins, so it follows the member everywhere.
      if (data && isThemeId(data.theme) && data.theme !== currentTheme()) {
        applyTheme(data.theme);
      }
      return data
        ? {
            handle: data.handle,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            isStaff: ["moderator", "editor", "admin"].includes(data.role),
          }
        : null;
    })();
    profileRequests.set(userId, request);
    // Let edits (new photo, new handle) show up on the next navigation.
    window.setTimeout(() => profileRequests.delete(userId), 5000);
  }
  return request;
}

const ACCOUNT_CHANGE_EVENT = "vcf-account-change";

/** Call after changing the profile (e.g. a new avatar) so every nav updates now. */
export function notifyAccountChanged(): void {
  profileRequests.clear();
  window.dispatchEvent(new Event(ACCOUNT_CHANGE_EVENT));
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
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function load(userId: string | null) {
      if (!userId) {
        if (!cancelled) setState(SIGNED_OUT);
        return;
      }
      const profile = await loadProfile(userId);
      if (!cancelled) setState({ userId, profile, ready: true });
    }

    async function check() {
      // No sign-in cookie means signed out: skip downloading the Supabase library.
      if (!hasAuthCookie()) return load(null);
      const supabase = await loadSupabase();
      if (!supabase || cancelled) return;
      // Local cookie read only; no network unless someone is signed in.
      const { data } = await supabase.auth.getSession();
      await load(data.session?.user.id ?? null);
      if (cancelled || unsubscribe) return;
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        void load(session?.user.id ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    }

    void check();
    const reload = () => void check();
    window.addEventListener(ACCOUNT_CHANGE_EVENT, reload);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener(ACCOUNT_CHANGE_EVENT, reload);
    };
  }, [pathname]);

  return state;
}
