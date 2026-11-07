"use client";

import { useState } from "react";
import { ctaPillClass } from "@/components/pills";
import { describeAdminError } from "@/lib/admin-errors";
import { loadSupabase } from "@/lib/supabase";

const fieldClass =
  "w-full rounded-xl bg-raised px-4 py-3 text-white placeholder:text-white/40";

export function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = await loadSupabase();
    if (!supabase) {
      setError("You are not signed in.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: nextError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (nextError) {
      setError(describeAdminError(nextError));
    }
  }

  return (
    <form
      data-admin-signin
      className="max-w-md space-y-5"
      onSubmit={(event) => void onSubmit(event)}
    >
      <p className="text-sm text-white">
        Sign in with the desk account you created in Supabase Auth.
      </p>
      <div>
        <label
          className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-white uppercase"
          htmlFor="admin-email"
        >
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          className={fieldClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <label
          className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-white uppercase"
          htmlFor="admin-password"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          className={fieldClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-sm font-semibold text-magenta" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={ctaPillClass("white")} disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
