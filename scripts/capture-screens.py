#!/usr/bin/env python3
"""
Capture app screenshots for the landing page's product tour.

Usage (with the app running, e.g. `pnpm build && pnpm start`):
    python3 scripts/capture-screens.py [--base-url http://localhost:3000]

For every entry in SHOTS it saves light and dark WebP images to
public/screens/<name>-<device>-<theme>.webp. To show a new screen on the
landing page, add it here, re-run, then reference it in
components/landing/product-tour.tsx.

Needs Google Chrome (or Chromium) and Pillow.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops

# width (CSS px), device pixel ratio
DEVICES = {
    "desktop": (1440, 1),
    "tablet": (834, 2),
    "phone": (390, 2),
}

# name, path, {device: page height to capture in CSS px; empty space below is trimmed}
SHOTS = [
    ("dashboard", "/dashboard", {"desktop": 1500, "phone": 3300}),
    ("analytics", "/dashboard/analytics", {"desktop": 1250, "tablet": 1600}),
    ("offers", "/dashboard/offers", {"desktop": 2450, "phone": 4200, "tablet": 2600}),
    ("create", "/groups/new", {"desktop": 900, "phone": 1350}),
    ("business", "/business/dashboard", {"desktop": 1000}),
]

THEMES = {"light": "1", "dark": "0"}  # Blink's preferredColorScheme: 0 = dark, 1 = light


def trim_bottom(img, pad=48):
    """Crop the empty page background below the last bit of content."""
    bg = Image.new(img.mode, img.size, img.getpixel((2, img.height - 2)))
    box = ImageChops.difference(img, bg).convert("L").point(lambda v: 255 if v > 12 else 0).getbbox()
    if not box:
        return img
    return img.crop((0, 0, img.width, min(img.height, box[3] + pad)))


def find_chrome():
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        if path := shutil.which(name):
            return path
    sys.exit("Chrome or Chromium not found on PATH.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    args = parser.parse_args()

    chrome = find_chrome()
    out_dir = Path(__file__).resolve().parent.parent / "public" / "screens"
    out_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        for name, path, devices in SHOTS:
            for device, height in devices.items():
                width, scale = DEVICES[device]
                for theme, scheme in THEMES.items():
                    png = Path(tmp) / f"{name}-{device}-{theme}.png"
                    subprocess.run(
                        [
                            chrome,
                            "--headless=new",
                            "--disable-gpu",
                            "--hide-scrollbars",
                            f"--user-data-dir={tmp}/profile-{theme}",
                            f"--blink-settings=preferredColorScheme={scheme}",
                            f"--window-size={width},{height}",
                            f"--force-device-scale-factor={scale}",
                            "--virtual-time-budget=10000",
                            f"--screenshot={png}",
                            args.base_url + path,
                        ],
                        check=True,
                        capture_output=True,
                        timeout=120,
                    )
                    target = out_dir / f"{name}-{device}-{theme}.webp"
                    trim_bottom(Image.open(png).convert("RGB")).save(target, "WEBP", quality=78, method=6)
                    print(f"saved {target.relative_to(out_dir.parent.parent)} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
