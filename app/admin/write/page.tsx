import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminWriteInner } from "@/components/AdminWriteInner";

export const metadata: Metadata = {
  alternates: { canonical: "/admin/write/" },
  title: "Write",
  description: "Create or edit a Vice City Feed story.",
  robots: { index: false, follow: false },
};

export default function AdminWritePage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-12 text-sm text-white">Loading editor…</p>}>
      <AdminWriteInner />
    </Suspense>
  );
}
