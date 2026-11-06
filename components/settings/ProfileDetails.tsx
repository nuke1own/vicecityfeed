"use client";

import { updateEmail, updateProfileField } from "@/app/actions/profile";
import { DetailRow } from "@/components/settings/DetailRow";
import { FieldEditor } from "@/components/settings/FieldEditor";

type ProfileDetailsProps = {
  email: string;
  displayName: string;
  handle: string;
  bio: string;
};

export function ProfileDetails({ email, displayName, handle, bio }: ProfileDetailsProps) {
  return (
    <ul>
      <DetailRow
        label="Email"
        value={email || "No email"}
        editor={(close) => (
          <FieldEditor
            action={updateEmail}
            label="New email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            hint="We will send a confirmation link to the new address."
            onCancel={close}
          />
        )}
      />
      <DetailRow label="Password" value="••••••••••" href="/settings/security/" />
      <DetailRow
        label="Display name"
        value={displayName}
        editor={(close) => (
          <FieldEditor
            action={updateProfileField}
            field="displayName"
            label="Display name"
            maxLength={60}
            autoComplete="nickname"
            defaultValue={displayName}
            onCancel={close}
          />
        )}
      />
      <DetailRow
        label="Handle"
        value={`@${handle}`}
        editor={(close) => (
          <FieldEditor
            action={updateProfileField}
            field="handle"
            label="Handle"
            maxLength={24}
            autoComplete="username"
            defaultValue={handle}
            hint="3 to 24 letters, numbers or underscores. Changing it changes your profile link."
            onCancel={close}
          />
        )}
      />
      <DetailRow
        label="Bio"
        value={bio || <span className="font-normal text-white/60">Add a short bio</span>}
        editor={(close) => (
          <FieldEditor
            action={updateProfileField}
            field="bio"
            label="Bio"
            multiline
            maxLength={280}
            defaultValue={bio}
            hint="Up to 280 characters. Shown on your public profile."
            onCancel={close}
          />
        )}
      />
    </ul>
  );
}
