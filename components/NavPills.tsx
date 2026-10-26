"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, NAV_ITEMS } from "@/lib/site";

export function NavPills() {
  const pathname = usePathname();
  const rowRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const row = rowRef.current;
      if (!row) return;
      const active = row.querySelector<HTMLElement>("[data-nav-active='true']");
      if (!active) return;
      setIndicator({ x: active.offsetLeft, w: active.offsetWidth, ready: true });
    }

    measure();
    const frame = requestAnimationFrame(measure);
    const fonts = document.fonts?.ready?.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      fonts?.catch(() => {});
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  return (
    <div
      ref={rowRef}
      className="nav-pills relative mx-auto flex w-max items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_28px_rgb(0_0_0/0.45)] backdrop-blur-md md:gap-1.5 md:p-1.5"
    >
      <span
        aria-hidden
        className="nav-pill-indicator pointer-events-none absolute top-1/2 left-0 z-0 h-9 rounded-full bg-vice-pink shadow-[0_0_22px_rgb(255_30_142/0.55),inset_0_1px_0_rgb(255_255_255/0.3)] md:h-10"
        style={{
          width: indicator.w,
          transform: `translate3d(${indicator.x}px, -50%, 0)`,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            data-nav-active={active ? "true" : "false"}
            className={`tap-press relative z-10 inline-flex h-9 min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-[background-color,color,transform] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white md:h-10 md:min-h-10 md:px-5 md:text-sm ${
              active
                ? "text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]"
                : "text-white/80 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
