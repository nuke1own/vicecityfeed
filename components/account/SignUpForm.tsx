"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { signUp, type AuthFormState } from "@/app/actions/auth";
import {
  AuthCard,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/account/AuthCard";
import { FieldError, FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";
import { birthDateProblem } from "@/lib/limits";

const initial: AuthFormState = { status: "idle" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 101 }, (_, index) => THIS_YEAR - index);

const BIRTH_FIELDS = ["birthMonth", "birthDay", "birthYear"] as const;
type BirthField = (typeof BIRTH_FIELDS)[number];

const selectClass =
  "h-[52px] w-full appearance-none rounded-sm border bg-raised pr-10 pl-3 text-base text-white focus-visible:border-vice-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function BirthSelect({
  name,
  label,
  placeholder,
  value,
  onChange,
  invalid,
  options,
}: {
  name: BirthField;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={`field-${name}`} className="sr-only">
        {label}
      </label>
      <select
        id={`field-${name}`}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? "birth-error" : "birth-prompt"}
        className={`${selectClass} ${invalid ? "border-vice-pink" : "border-white/15 hover:border-white/35"}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-white/80"
      />
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [birth, setBirth] = useState<Record<BirthField, string>>({
    birthMonth: "",
    birthDay: "",
    birthYear: "",
  });
  const [birthError, setBirthError] = useState<string | null>(null);
  const [seenState, setSeenState] = useState(state);
  const detailsRef = useRef<HTMLDivElement>(null);

  // If the server rejects the date of birth, go back to step 1 to show why.
  if (state !== seenState) {
    setSeenState(state);
    const serverBirthError = BIRTH_FIELDS.map((key) => state.fields?.[key]).find(Boolean);
    if (serverBirthError) {
      setBirthError(serverBirthError);
      setStep(1);
    }
  }

  function goToDetails() {
    const problem = birthDateProblem(birth);
    if (problem) {
      setBirthError(problem.message);
      return;
    }
    setBirthError(null);
    setStep(2);
    requestAnimationFrame(() => detailsRef.current?.querySelector("input")?.focus());
  }

  if (state.status === "check-email" && state.message) {
    return (
      <AuthCard title="Check your email" titleId="signup-heading">
        <FormMessage tone="success">{state.message}</FormMessage>
        <p className="mt-5 text-base text-white">
          Already confirmed?{" "}
          <Link href="/login/" className="font-semibold text-vice-pink underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  const errors = state.fields ?? {};
  const values = state.values ?? {};

  return (
    <>
      <AuthCard
        title="Create a Vice City Feed account"
        titleId="signup-heading"
        description={
          step === 1 ? "Please provide your date of birth so we can verify your age." : undefined
        }
      >
        <form action={action} noValidate>
          <fieldset hidden={step !== 1} aria-describedby="birth-prompt">
            <legend id="birth-prompt" className="sr-only">
              Date of birth
            </legend>
            <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2.5 sm:gap-3">
              <BirthSelect
                name="birthMonth"
                label="Birth month"
                placeholder="Month"
                value={birth.birthMonth}
                onChange={(value) => setBirth((prev) => ({ ...prev, birthMonth: value }))}
                invalid={Boolean(birthError)}
                options={MONTHS.map((month, index) => ({ value: String(index + 1), label: month }))}
              />
              <BirthSelect
                name="birthDay"
                label="Birth day"
                placeholder="Day"
                value={birth.birthDay}
                onChange={(value) => setBirth((prev) => ({ ...prev, birthDay: value }))}
                invalid={Boolean(birthError)}
                options={DAYS.map((day) => ({ value: String(day), label: String(day) }))}
              />
              <BirthSelect
                name="birthYear"
                label="Birth year"
                placeholder="Year"
                value={birth.birthYear}
                onChange={(value) => setBirth((prev) => ({ ...prev, birthYear: value }))}
                invalid={Boolean(birthError)}
                options={YEARS.map((year) => ({ value: String(year), label: String(year) }))}
              />
            </div>
            {birthError ? <FieldError id="birth-error">{birthError}</FieldError> : null}
            <p className="mt-3 text-sm text-white/75">
              We only use this to check your age. It is not saved.
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={goToDetails} className={primaryButtonClass}>
                Next
              </button>
            </div>
          </fieldset>

          <div ref={detailsRef} hidden={step !== 2} className="space-y-5">
            {state.status === "error" && state.message ? (
              <FormMessage tone="error">{state.message}</FormMessage>
            ) : null}
            <FloatingField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              defaultValue={values.email}
              error={errors.email}
            />
            <FloatingField
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              hint="At least 8 characters."
              error={errors.password}
            />
            <FloatingField
              name="displayName"
              label="Display name"
              autoComplete="nickname"
              maxLength={60}
              required
              defaultValue={values.displayName}
              error={errors.displayName}
            />
            <FloatingField
              name="handle"
              label="Handle"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={24}
              required
              hint="Your @name: 3 to 24 letters, numbers or underscores."
              defaultValue={values.handle}
              error={errors.handle}
            />
            <div className="flex items-center justify-between gap-4 pt-1">
              <button type="button" onClick={() => setStep(1)} className={secondaryButtonClass}>
                Back
              </button>
              <button type="submit" className={primaryButtonClass} disabled={pending}>
                {pending ? "Creating…" : "Create account"}
              </button>
            </div>
          </div>
        </form>
      </AuthCard>
      <p className="text-center text-base text-white">
        Already have a Vice City Feed account?{" "}
        <Link href="/login/" className="font-semibold text-vice-pink underline underline-offset-2 hover:text-white">
          Sign in
        </Link>
      </p>
    </>
  );
}
