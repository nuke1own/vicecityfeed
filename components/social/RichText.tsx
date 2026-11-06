import Link from "next/link";
import type { ReactNode } from "react";

const TOKEN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(#[A-Za-z0-9_]{2,30})|(@[A-Za-z0-9_]{3,24})/g;

/**
 * Post text with #hashtags, @mentions and web links turned into links.
 * Everything else stays plain text (React escapes it), so posts cannot inject HTML.
 */
export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [token, url, tag, mention] = match;
    const key = `${index}-${token}`;
    if (url) {
      const display = url.replace(/^https?:\/\/(www\.)?/, "");
      parts.push(
        <a key={key} href={url} target="_blank" rel="nofollow ugc noopener noreferrer" className="relative z-10 text-vice-pink hover:underline">
          {display.length > 40 ? `${display.slice(0, 38)}…` : display}
        </a>,
      );
    } else if (tag) {
      parts.push(
        <Link key={key} href={`/social/?tag=${tag.slice(1).toLowerCase()}`} className="relative z-10 text-vice-pink hover:underline">
          {tag}
        </Link>,
      );
    } else if (mention) {
      parts.push(
        <Link key={key} href={`/u/${mention.slice(1).toLowerCase()}/`} className="relative z-10 text-vice-pink hover:underline">
          {mention}
        </Link>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
