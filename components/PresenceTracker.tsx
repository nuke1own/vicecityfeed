"use client";

import { usePresence } from "@/lib/presence";
import { useAccount } from "@/lib/use-account";

/** Shares "I'm on the site" for signed-in members (see lib/presence.ts). */
export function PresenceTracker() {
  const { userId } = useAccount();
  usePresence(userId);
  return null;
}
