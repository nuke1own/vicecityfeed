"use client";

import { FormEvent, useState } from "react";
import { ctaPillClass } from "@/components/pills";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }
    setStatus("done");
    setEmail("");
  }

  return (
    <section aria-labelledby="newsletter-heading" className="w-full max-w-md">
      <h2
        id="newsletter-heading"
        className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase"
      >
        Newsletter
      </h2>
      {status === "done" ? (
        <p className="mt-4 text-sm font-semibold text-white" role="status">
          You&apos;re on the list
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-white">
            Map notes, mission timers, and garage drops. Unsubscribe anytime.
          </p>
          <form
            onSubmit={onSubmit}
            className="newsletter-field mt-4 flex items-center rounded-full bg-raised p-1"
          >
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="h-10 min-w-0 flex-1 rounded-full border-0 bg-transparent px-4 text-base text-white outline-none placeholder:text-white/75 focus-visible:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className={ctaPillClass("white", "h-10 px-4 disabled:opacity-60")}
            >
              {status === "loading" ? "Sending" : "Subscribe"}
            </button>
          </form>
          {status === "error" ? (
            <p className="mt-3 text-sm text-white" role="alert">
              Enter a valid email and try again.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
