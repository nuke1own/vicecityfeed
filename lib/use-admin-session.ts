"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, loadSupabase } from "./supabase";

export function useAdminSession() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void loadSupabase().then(async (supabase) => {
      if (!supabase || cancelled) return;
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        setReady(true);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configured]);

  return { configured, session, loading: configured && !ready };
}
