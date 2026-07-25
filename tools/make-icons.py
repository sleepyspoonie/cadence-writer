#!/usr/bin/env python3
"""Generate app icons for Cadence Writer from a single source image.

Usage:  python tools/make-icons.py path/to/picture.png

Writes assets/icon.ico (Windows), assets/icon.png (Linux + dev window),
and assets/icon.icns (macOS, if pillow can write it).

The source should ideally be square and at least 512x512. Non-square images
are centered on a transparent canvas rather than stretched.
"""
import sys
import os
from PIL import Image, ImageFilter

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')


def squarify(img):
    """Center the image on a square transparent canvas without distorting it."""
    if img.width == img.height:
        return img
    side = max(img.width, img.height)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    img = Image.open(src).convert('RGBA')

    if min(img.size) < 256:
        print(f'Warning: source is {img.width}x{img.height}; 512x512 or larger '
              'gives noticeably sharper results on high-DPI displays.')

    img = squarify(img)
    os.makedirs(OUT_DIR, exist_ok=True)

    master = img.resize((1024, 1024), Image.LANCZOS)
    master.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT_DIR, 'icon.png'))

    # Multi-resolution .ico so Windows picks the right size for taskbar,
    # Explorer, and the installer without rescaling artifacts. Each size is
    # resized individually; small ones get a light unsharp pass, since detail
    # otherwise turns to mush below ~32px.
    frames = []
    for size in ICO_SIZES:
        frame = master.resize((size, size), Image.LANCZOS)
        if size <= 48:
            frame = frame.filter(
                ImageFilter.UnsharpMask(radius=0.6, percent=110, threshold=0))
        frames.append(frame)
    frames[-1].save(os.path.join(OUT_DIR, 'icon.ico'),
                    sizes=[(s, s) for s in ICO_SIZES],
                    append_images=frames[:-1])

    try:
        master.save(os.path.join(OUT_DIR, 'icon.icns'))
        icns = 'icon.icns'
    except Exception as exc:
        icns = f'(skipped: {exc})'

    print('Wrote to assets/: icon.png (512x512), '
          f'icon.ico ({len(ICO_SIZES)} sizes), {icns}')


if __name__ == '__main__':
    main()
