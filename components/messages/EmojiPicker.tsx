"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Flame, Hand, Heart, Palmtree, Smile } from "lucide-react";

const CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    Icon: Smile,
    emoji: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 😌 😔 😪 😴 😷 🤒 🥵 🥶 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 💀 🤡 👻 👽 🤖 💩",
  },
  {
    id: "hands",
    label: "Hands and people",
    Icon: Hand,
    emoji: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 ✍️ 💅 🤳 👀 👁️ 🧠 🫶 🙋 🙆 🙅 🤷 🤦 💃 🕺 🏃 🧍 🧑‍💻 🕵️ 👮 💂 🥷",
  },
  {
    id: "hearts",
    label: "Hearts and symbols",
    Icon: Heart,
    emoji: "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 💯 ✨ ⭐ 🌟 💫 ⚡ 💥 💢 💦 💨 🕳️ 💬 💭 💤 ✅ ❌ ❗ ❓ ‼️ ⁉️ 🔔 🎵 🎶 ➕ 🆒 🆕 🔝",
  },
  {
    id: "vice",
    label: "Vice City",
    Icon: Palmtree,
    emoji: "🌴 🏝️ 🏖️ 🌊 🌅 🌇 🌆 🌃 🌙 ☀️ 🦩 🐊 🐬 🦈 🍹 🍸 🥂 🍾 🚗 🏎️ 🚓 🚔 🚨 🚁 🛥️ 🚤 🏍️ 🛵 💰 💵 💸 💎 🏦 🔫 💣 🎰 🃏 🎮 🕹️ 📸 🎥 📺 📱 🎧 🎤 🎸 🕶️ 👑 🏆 🎉 🎊 🔥 🗺️ 📍",
  },
  {
    id: "activity",
    label: "Food and fun",
    Icon: Flame,
    emoji: "🍕 🍔 🌮 🌯 🍟 🌭 🥪 🍣 🍜 🍩 🍪 🎂 🍦 🍿 ☕ 🥤 🧋 🍺 🍻 🍷 🥃 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🥊 🏋️ 🏄 🚴 🎯 🎳 🎲 ♟️ 🧩 🎨 🎬 🎭 🎟️ 🛍️ 🎁 🎈 🪩",
  },
] as const;

const RECENT_KEY = "vcf-recent-emoji";
const RECENT_MAX = 24;

function readRecent(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(emoji: string): void {
  try {
    const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); recents are a nicety.
  }
}

/** Emoji panel above the message box: recents plus five categories. */
export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  // The picker only opens after a tap, in the browser, so storage is available.
  const [recent] = useState<string[]>(() => readRecent());
  const [tab, setTab] = useState<string>(() => (recent.length ? "recent" : "smileys"));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!panelRef.current?.contains(target) && !target?.closest("[data-emoji-toggle]")) onClose();
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const tabs = [
    ...(recent.length ? [{ id: "recent", label: "Recent", Icon: Clock, list: recent }] : []),
    ...CATEGORIES.map((category) => ({ id: category.id, label: category.label, Icon: category.Icon, list: category.emoji.split(" ") })),
  ];
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji"
      className="chat-pop absolute inset-x-2 bottom-full z-40 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[0_18px_50px_rgb(0_0_0/0.6)] sm:left-2 sm:right-auto sm:w-[22rem]"
    >
      <div role="tablist" aria-label="Emoji categories" className="flex gap-0.5 border-b border-white/10 px-1.5 pt-1.5">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active.id === id}
            aria-label={label}
            onClick={() => setTab(id)}
            className={`relative grid h-10 flex-1 place-items-center rounded-t-lg transition-colors ${
              active.id === id ? "text-white" : "text-white/55 hover:text-white"
            } focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white`}
          >
            <Icon aria-hidden className="size-[18px]" />
            {active.id === id ? <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-vice-pink" /> : null}
          </button>
        ))}
      </div>
      <p className="px-3 pt-2 text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">{active.label}</p>
      <div role="tabpanel" aria-label={active.label} className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto overscroll-contain p-1.5 pt-1">
        {active.list.map((emoji) => (
          <button
            key={`${active.id}-${emoji}`}
            type="button"
            aria-label={emoji}
            onClick={() => {
              rememberEmoji(emoji);
              onPick(emoji);
            }}
            className="tap-press grid aspect-square place-items-center rounded-lg text-[1.6rem] leading-none transition-transform hover:bg-white/10 active:scale-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
