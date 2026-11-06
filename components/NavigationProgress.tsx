"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin accent-coloured bar at the top of the page that starts the moment an
 * internal link is clicked and finishes when the new route renders, so every
 * navigation gives instant feedback.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const startedFrom = useRef<string | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      startedFrom.current = window.location.pathname;
      setState("loading");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (startedFrom.current === null || startedFrom.current === pathname) return;
    startedFrom.current = null;
    // Route changed: finish the bar, then hide it.
    const finish = window.setTimeout(() => setState("done"), 0);
    const hide = window.setTimeout(() => setState("idle"), 260);
    return () => {
      window.clearTimeout(finish);
      window.clearTimeout(hide);
    };
  }, [pathname]);

  useEffect(() => {
    if (state !== "loading") return;
    // Safety net if a navigation is cancelled or fails.
    const timeout = window.setTimeout(() => setState("idle"), 10000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  return <div aria-hidden className="nav-progress" data-state={state} />;
}
