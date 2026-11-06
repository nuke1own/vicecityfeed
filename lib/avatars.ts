/**
 * The only avatars members can choose. Files live in public/avatars/ (cut
 * from assets/avatar-grid-source.jpg). Profiles store the `src` path; the
 * database only accepts paths of this shape.
 */
export const AVATARS = [
  { id: "jason-and-lucia", name: "Jason & Lucia" },
  { id: "lucia", name: "Lucia" },
  { id: "cal-hampton", name: "Cal Hampton" },
  { id: "boobie-ike", name: "Boobie Ike" },
  { id: "drequan-priest", name: "Dre'Quan Priest" },
  { id: "real-dimez", name: "Real Dimez" },
  { id: "raul-bautista", name: "Raul Bautista" },
  { id: "brian-heder", name: "Brian Heder" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const AVATAR_IDS = AVATARS.map((avatar) => avatar.id) as [AvatarId, ...AvatarId[]];

export function avatarSrc(id: AvatarId): string {
  return `/avatars/${id}.webp`;
}

/** The preset id for a stored avatar path, or null if it is not one of ours. */
export function avatarIdFromUrl(url: string | null | undefined): AvatarId | null {
  const match = url?.match(/^\/avatars\/([a-z0-9-]+)\.webp$/);
  const id = match?.[1];
  return id && (AVATAR_IDS as string[]).includes(id) ? (id as AvatarId) : null;
}

export function avatarName(id: AvatarId): string {
  return AVATARS.find((avatar) => avatar.id === id)?.name ?? "Avatar";
}
