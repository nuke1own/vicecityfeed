"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/actions/social";

/** Opening the notifications page marks everything read (after it is shown). */
export function MarkNotificationsRead() {
  useEffect(() => {
    const id = window.setTimeout(() => void markNotificationsRead(), 800);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
