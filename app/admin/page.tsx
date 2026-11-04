import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDeskInner } from "@/components/AdminDeskInner";

export const metadata: Metadata = {
  alternates: { canonical: "/admin/" },
  title: "Desk",
  description: "Draft and publish Vice City Feed stories.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-white">
          Loading desk…
        </p>
      }
    >
      <AdminDeskInner />
    </Suspense>
  );
}
