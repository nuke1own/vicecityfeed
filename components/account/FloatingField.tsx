"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldError } from "@/components/account/Field";

type FloatingFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Text input whose label sits inside the box and shrinks to the top edge
 * once the field is focused or filled. Password fields get a show/hide toggle.
 */
export function FloatingField({
  name,
  label,
  error,
  hint,
  id,
  type = "text",
  ...input
}: FloatingFieldProps) {
  const fieldId = id ?? `field-${name}`;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={isPassword && reveal ? "text" : type}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`peer h-[52px] w-full rounded-sm border bg-raised px-4 pt-4 pb-1 text-base text-white transition-colors focus-visible:border-vice-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            error ? "border-vice-pink" : "border-white/15 hover:border-white/35"
          } ${isPassword ? "pr-12" : ""}`}
          {...input}
        />
        <label
          htmlFor={fieldId}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-white/75 transition-all duration-150 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
        >
          {label}
        </label>
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            aria-controls={fieldId}
            className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            {reveal ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-white/75">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
    </div>
  );
}
