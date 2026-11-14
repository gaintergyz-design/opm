#!/usr/bin/env python3
"""把阿澤提供的 OPM 字標圖（白底 JPG）做成卡片可用的透明 PNG。

用法：python3 scripts/prepare_opm_logo.py <source-image>
輸出：assets/opm-logo.png

流程：白底差值找出內容邊界 → 裁切留 6px 邊 → 去白（估 alpha 並反算前景色，
     避免放大後出現白邊）→ 4x LANCZOS 放大。
卡片端用 data URI 載入（resvg 不認 file:// href）。
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

BASE = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1])
dst = BASE / 'assets' / 'opm-logo.png'

im = Image.open(src).convert('RGB')
white = Image.new('RGB', im.size, (255, 255, 255))
mask = ImageChops.difference(im, white).convert('L').point(lambda v: 255 if v > 20 else 0)
bbox = mask.getbbox()
if not bbox:
    raise SystemExit('no logo content found')

pad = 6
box = (
    max(0, bbox[0] - pad), max(0, bbox[1] - pad),
    min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad),
)
crop = im.crop(box)

rgba = Image.new('RGBA', crop.size)
sp, dp = crop.load(), rgba.load()
for y in range(crop.height):
    for x in range(crop.width):
        r, g, b = sp[x, y]
        d = 255 - min(r, g, b)
        a = min(255, int(d * 1.5))
        if a < 10:
            dp[x, y] = (0, 0, 0, 0)
            continue
        af = a / 255.0
        f = [max(0, min(255, round((c - (1 - af) * 255) / af))) for c in (r, g, b)]
        dp[x, y] = (f[0], f[1], f[2], a)

S = 4
out = rgba.resize((crop.width * S, crop.height * S), Image.LANCZOS)
out.save(dst)
print(f'{dst}  {out.size[0]}x{out.size[1]}  from bbox {bbox}')
