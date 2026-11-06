"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";
import { Avatar } from "@/components/account/Avatar";
import { Field, FieldError, FormMessage, inputClass, labelClass } from "@/components/account/Field";
import { ctaPillClass } from "@/components/pills";

type ProfileFormProps = {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

const initial: ProfileFormState = { status: "idle" };

export function ProfileForm({ handle, displayName, bio, avatarUrl }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [bioLength, setBioLength] = useState(bio.length);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.message ? (
        <FormMessage tone={state.status === "saved" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      ) : null}

      <fieldset>
        <legend className={labelClass}>Avatar</legend>
        <div className="flex items-center gap-4">
          <Avatar displayName={displayName} avatarUrl={avatarUrl} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor="field-avatar" className="sr-only">
              Upload a new avatar
            </label>
            <input
              id="field-avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={`field-avatar-hint${errors.avatar ? " field-avatar-error" : ""}`}
              aria-invalid={errors.avatar ? true : undefined}
              className="block w-full text-sm text-white file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-raised file:px-4 file:font-semibold file:text-white hover:file:bg-vice-pink"
            />
            <p id="field-avatar-hint" className="text-sm text-white/75">
              JPG, PNG or WebP, up to 2 MB.
            </p>
            {avatarUrl ? (
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-white">
                <input type="checkbox" name="removeAvatar" className="size-4 accent-vice-pink" />
                Remove current avatar
              </label>
            ) : null}
            {errors.avatar ? <FieldError id="field-avatar-error">{errors.avatar}</FieldError> : null}
          </div>
        </div>
      </fieldset>

      <Field
        name="displayName"
        label="Display name"
        maxLength={60}
        required
        defaultValue={displayName}
        error={errors.displayName}
      />
      <Field
        name="handle"
        label="Handle"
        autoCapitalize="none"
        spellCheck={false}
        minLength={3}
        maxLength={24}
        required
        hint="Changing your handle changes your profile link."
        defaultValue={handle}
        error={errors.handle}
      />
      <div>
        <label htmlFor="field-bio" className={labelClass}>
          Bio
        </label>
        <textarea
          id="field-bio"
          name="bio"
          rows={4}
          maxLength={280}
          defaultValue={bio}
          onChange={(event) => setBioLength(event.target.value.length)}
          aria-describedby={`field-bio-count${errors.bio ? " field-bio-error" : ""}`}
          aria-invalid={errors.bio ? true : undefined}
          className={`${inputClass} resize-y`}
        />
        <p id="field-bio-count" className="mt-1.5 text-right text-sm text-white/75">
          {bioLength}/280
        </p>
        {errors.bio ? <FieldError id="field-bio-error">{errors.bio}</FieldError> : null}
      </div>

      <button type="submit" className={ctaPillClass("white")} disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
