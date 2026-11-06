import Image from "next/image";

type AvatarProps = {
  displayName: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ displayName, avatarUrl, size, className = "" }: AvatarProps) {
  const base = `shrink-0 overflow-hidden rounded-full ${className}`;
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${displayName}'s avatar`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`${base} bg-raised object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`${displayName}'s avatar`}
      className={`${base} inline-flex items-center justify-center bg-vice-pink font-bold text-black`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(displayName)}
    </span>
  );
}
