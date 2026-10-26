#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2× 超采樣 PNG 縮回標準尺寸（LANCZOS）。

build_close.js / build_pages.js / build_earnings.js 現在以 2160px 寬渲染
（2× 超采樣：向量文字/圓環與位圖 logo 的邊緣都更平滑），
本工具在產圖後把它縮回 1080px 寬。已是 ≤1080 的文件自動跳過。

用法：python downscale_png.py out/the-close-*.png
"""
import glob, os, sys
from PIL import Image

TARGET_W = 1080


def main(paths):
    n = 0
    for p in paths:
        if not os.path.isfile(p) or not p.lower().endswith('.png'):
            continue
        im = Image.open(p)
        if im.width <= TARGET_W:
            continue
        h = round(im.height * TARGET_W / im.width)
        out = im.resize((TARGET_W, h), Image.LANCZOS)
        out.save(p)
        n += 1
        print(f'  downscale {os.path.basename(p)}: {im.width}x{im.height} -> {TARGET_W}x{h}')
    print(f'downscale_png: {n} file(s)')


if __name__ == '__main__':
    args = sys.argv[1:]
    files = []
    for a in args:
        files.extend(glob.glob(a) if any(c in a for c in '*?') else [a])
    main(files)
