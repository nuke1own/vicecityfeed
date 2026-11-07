"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { NewMessageDialog } from "@/components/messages/NewMessageDialog";

export function NewMessageButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-vice-pink px-5 text-sm font-bold text-accent-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <SquarePen aria-hidden className="size-4" />
        New message
      </button>
      {open ? <NewMessageDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
