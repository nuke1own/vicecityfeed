"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const rowClass =
  "flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

function RowText({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block text-xs text-white/75">{label}</span>
      <span className="mt-0.5 block truncate text-base font-semibold text-white">{value}</span>
    </span>
  );
}

type DetailRowProps = {
  label: string;
  value: ReactNode;
  /** Inline editor revealed when the row is opened. Receives a close callback. */
  editor?: (close: () => void) => ReactNode;
  /** Navigate instead of expanding (e.g. Password goes to Security). */
  href?: string;
};

/** One line of the details card: label, value and a chevron to edit it. */
export function DetailRow({ label, value, editor, href }: DetailRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (href) {
    return (
      <li className="border-b border-white/10 last:border-b-0">
        <Link href={href} className={rowClass} aria-label={`${label}: change on the Security page`}>
          <RowText label={label} value={value} />
          <ChevronRight aria-hidden className="size-5 shrink-0 text-white/80" />
        </Link>
      </li>
    );
  }

  if (!editor) {
    return (
      <li className="border-b border-white/10 py-3 last:border-b-0">
        <RowText label={label} value={value} />
      </li>
    );
  }

  return (
    <li className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        className={rowClass}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <RowText label={label} value={value} />
        <span className="sr-only">{open ? `Close ${label} editor` : `Edit ${label}`}</span>
        <ChevronRight
          aria-hidden
          className={`size-5 shrink-0 text-white/80 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <div id={panelId} hidden={!open} className="pb-4">
        {open ? editor(() => setOpen(false)) : null}
      </div>
    </li>
  );
}
