"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { hidesFooter } from "@/lib/sections";

/** Hides the site footer on app-like areas (Social, Notifications, Messages, Album). */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return hidesFooter(pathname) ? null : <>{children}</>;
}
