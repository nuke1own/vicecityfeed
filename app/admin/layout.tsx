import type { ReactNode } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><header className="border-b border-white/10 px-4 py-4"><nav aria-label="Admin" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><Link href="/admin/" className="min-h-11 inline-flex items-center font-bold">Vice City Feed · Admin</Link><a href={SITE.url} target="_blank" rel="noopener noreferrer" className="min-h-11 inline-flex items-center text-sm underline underline-offset-4">View website ↗</a></nav></header>{children}</>;
}
