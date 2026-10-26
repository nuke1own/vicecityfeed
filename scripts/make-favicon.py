#!/usr/bin/env python3
"""Composite public/images/logo.png onto #0B0B0B for tab / touch icons."""

from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    Image = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "public/images/logo.png"
PUBLIC = ROOT / "public"
EXPECTED_ICONS = (
    PUBLIC / "favicon.ico",
    PUBLIC / "icon.png",
    PUBLIC / "apple-touch-icon.png",
    PUBLIC / "icon-512.png",
)
BG = (0x0B, 0x0B, 0x0B, 255)
# Keep the full VC mark (contain, not cover) with a little inset.
PAD = 0.10


def fit_on_black(size: int) -> "Image.Image":
    assert Image is not None
    logo = Image.open(LOGO).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), BG)
    inner = max(1, int(round(size * (1 - 2 * PAD))))
    lw, lh = logo.size
    scale = min(inner / lw, inner / lh)
    nw = max(1, int(round(lw * scale)))
    nh = max(1, int(round(lh * scale)))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas.convert("RGB")


def main() -> None:
    if Image is None:
        if all(icon.is_file() for icon in EXPECTED_ICONS):
            print("Pillow not installed; keeping existing public/ icons")
            return
        raise SystemExit("Pillow is required to generate icons (pip install pillow)")

    if not LOGO.is_file():
        raise SystemExit(f"missing uploaded logo: {LOGO}")

    PUBLIC.mkdir(parents=True, exist_ok=True)

    icon32 = fit_on_black(32)
    icon32.save(PUBLIC / "icon.png", format="PNG")

    apple = fit_on_black(180)
    apple.save(PUBLIC / "apple-touch-icon.png", format="PNG")

    icon512 = fit_on_black(512)
    icon512.save(PUBLIC / "icon-512.png", format="PNG")

    # Real multi-size ICO so /favicon.ico is the same mark, not a transparent PNG.
    ico = fit_on_black(256)
    ico.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    print("wrote public/favicon.ico, icon.png, apple-touch-icon.png, icon-512.png")


if __name__ == "__main__":
    main()
