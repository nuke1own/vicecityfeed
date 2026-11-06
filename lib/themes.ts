/**
 * Site colour themes. One accent colour drives buttons, active nav pills,
 * links, glows and focus details. Every accent is checked for WCAG AA:
 * the accent as text on black, and `ink` as text on the accent.
 */
export type Theme = {
  id: string;
  name: string;
  /** Short line shown in the picker. */
  note: string;
  accent: `#${string}`;
  /** Text colour used on top of the accent. */
  ink: `#${string}`;
};

export const THEMES = [
  { id: "overcast", name: "Overcast Grey", note: "Clean and quiet. The default.", accent: "#a9a9b4", ink: "#000000" },
  { id: "vice-pink", name: "Vice City Pink", note: "Neon signs on Ocean Drive.", accent: "#ff1e8e", ink: "#000000" },
  { id: "sunset", name: "Leonida Sunset", note: "Orange skies over the Keys.", accent: "#ff7a3d", ink: "#000000" },
  { id: "aqua", name: "Ocean Drive Aqua", note: "Art deco and shallow water.", accent: "#22d8c3", ink: "#000000" },
  { id: "neon-violet", name: "Neon Nights", note: "Club lights after midnight.", accent: "#b57bff", ink: "#000000" },
  { id: "golden-hour", name: "Golden Hour", note: "Beach light and gold chains.", accent: "#fcb92c", ink: "#000000" },
  { id: "grassrivers", name: "Grassrivers Green", note: "Swamp, sawgrass and airboats.", accent: "#72d65a", ink: "#000000" },
  { id: "keys-blue", name: "Keys Blue", note: "Open sea and police lights.", accent: "#47a8ff", ink: "#000000" },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "overcast";
export const THEME_STORAGE_KEY = "vcf-theme";
export const THEME_IDS = THEMES.map((theme) => theme.id) as [ThemeId, ...ThemeId[]];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as string[]).includes(value);
}

export function hexToRgbTriplet(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

function vars(theme: Theme): string {
  return `--accent:${theme.accent};--accent-rgb:${hexToRgbTriplet(theme.accent)};--accent-ink:${theme.ink};`;
}

/** CSS for every theme. The default applies on :root; others on [data-theme]. */
export const THEME_CSS = THEMES.map((theme) =>
  theme.id === DEFAULT_THEME
    ? `:root{${vars(theme)}}`
    : `:root[data-theme="${theme.id}"]{${vars(theme)}}`,
).join("");

/**
 * Runs in <head> before first paint so the saved theme never flashes.
 * Kept tiny and dependency-free; ids are checked against the known list.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEME_IDS)}.indexOf(t)>0)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

/** Apply a theme now and remember it on this device. */
export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  if (id === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent("vcf-theme-change", { detail: id }));
}

export function currentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const value = document.documentElement.getAttribute("data-theme");
  return isThemeId(value) ? value : DEFAULT_THEME;
}
