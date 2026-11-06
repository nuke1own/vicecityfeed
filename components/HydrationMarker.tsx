"use client";

import { useEffect } from "react";

/** Marks <html data-ready> once the app is interactive (used by browser tests). */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.ready = "true";
  }, []);
  return null;
}
