"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { outlinePillClass } from "@/components/pills";
import { getSupabase } from "@/lib/supabase";

/** Shows "Edit profile" only to the profile's owner. Display only; RLS enforces edits. */
export function OwnProfileActions({ profileId }: { profileId: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setIsOwner(data.session?.user.id === profileId);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (!isOwner) return null;
  return (
    <Link href="/settings/profile/" className={outlinePillClass("px-4 text-sm font-semibold")}>
      Edit profile
    </Link>
  );
}
