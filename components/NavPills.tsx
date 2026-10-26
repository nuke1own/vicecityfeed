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
    <div ref={rowRef} className="nav-pills relative mx-auto flex w-max gap-2 overflow-visible px-4 md:px-6">
      <span
        aria-hidden
        className="nav-pill-indicator pointer-events-none absolute top-1/2 left-0 z-0 h-11 rounded-full bg-vice-pink shadow-[0_0_12px_rgb(255_30_142/0.65),0_0_28px_rgb(255_30_142/0.4),0_0_52px_rgb(255_30_142/0.22)]"
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
            className={`tap-press relative z-10 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white ${
              active ? "text-white" : "text-white hover:bg-white/8"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
