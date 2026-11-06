import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT, THEME_CSS, THEMES, hexToRgbTriplet } from "../lib/themes";

function luminance(hex: string): number {
  const [r, g, b] = hexToRgbTriplet(hex).split(" ").map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("the default theme is the grey accent", () => {
  assert.equal(DEFAULT_THEME, "overcast");
  assert.equal(THEMES.find((theme) => theme.id === DEFAULT_THEME)?.name, "Overcast Grey");
  assert.match(THEME_CSS, /^:root\{--accent:#a9a9b4;/);
});

test("every theme meets WCAG AA for accent text on black and ink on accent", () => {
  for (const theme of THEMES) {
    assert.ok(contrast(theme.accent, "#000000") >= 4.5, `${theme.name} on black`);
    assert.ok(contrast(theme.ink, theme.accent) >= 4.5, `ink on ${theme.name}`);
    // Surfaces used for cards and inputs.
    assert.ok(contrast(theme.accent, "#1f1f1f") >= 4.5, `${theme.name} on raised`);
  }
});

test("theme ids are unique and the boot script only accepts known ids", () => {
  const ids = THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(THEME_BOOT_SCRIPT, new RegExp(`"${id}"`));
  assert.doesNotMatch(THEME_BOOT_SCRIPT, /innerHTML|eval/);
});
