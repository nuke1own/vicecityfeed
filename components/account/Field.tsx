import type { InputHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-raised px-4 py-3 text-base text-white placeholder:text-white/50 focus-visible:border-vice-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-[invalid=true]:border-vice-pink";

export const labelClass = "mb-2 block text-sm font-semibold text-white";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ name, label, error, hint, id, ...input }: FieldProps) {
  const fieldId = id ?? `field-${name}`;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-white/75">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-vice-pink">
      {children}
    </p>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
        tone === "error"
          ? "border-vice-pink/50 bg-vice-pink/10 text-white"
          : "border-teal/50 bg-teal/10 text-white"
      }`}
    >
      {children}
    </p>
  );
}
