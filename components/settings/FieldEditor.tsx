"use client";

import { useActionState } from "react";
import type { SettingsFormState } from "@/app/actions/profile";
import { FieldError, FormMessage, inputClass, labelClass } from "@/components/account/Field";
import { primaryButtonClass } from "@/components/account/AuthCard";

type FieldEditorProps = {
  action: (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  /** Hidden "field" value for actions that edit several columns. */
  field?: string;
  label: string;
  defaultValue: string;
  type?: "text" | "email";
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
  autoComplete?: string;
  onCancel: () => void;
};

const initial: SettingsFormState = { status: "idle" };

export function FieldEditor({
  action,
  field,
  label,
  defaultValue,
  type = "text",
  multiline = false,
  maxLength,
  hint,
  autoComplete,
  onCancel,
}: FieldEditorProps) {
  const [state, formAction, pending] = useActionState(action, initial);
  const inputId = `edit-${field ?? label.toLowerCase().replace(/\s+/g, "-")}`;
  const error = state.fields?.value;
  const describedBy = [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {field ? <input type="hidden" name="field" value={field} /> : null}
      {state.message ? (
        <FormMessage tone={state.status === "saved" ? "success" : "error"}>{state.message}</FormMessage>
      ) : null}
      <div>
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
        {multiline ? (
          <textarea
            id={inputId}
            name="value"
            rows={4}
            maxLength={maxLength}
            defaultValue={defaultValue}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${inputClass} resize-y`}
            autoFocus
          />
        ) : (
          <input
            id={inputId}
            name="value"
            type={type}
            maxLength={maxLength}
            defaultValue={defaultValue}
            autoComplete={autoComplete}
            autoCapitalize={type === "email" || field === "handle" ? "none" : undefined}
            spellCheck={field === "handle" ? false : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={inputClass}
            autoFocus
          />
        )}
        {hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-white/75">
            {hint}
          </p>
        ) : null}
        {error ? <FieldError id={`${inputId}-error`}>{error}</FieldError> : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButtonClass.replace("rounded-sm", "rounded-full")} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-full px-5 text-base font-semibold text-white hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
