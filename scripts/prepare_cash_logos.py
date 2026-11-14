#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
從阿澤提供的富途牛牛〈Anthropic 現金儲備〉參考圖裁出 7 個圓形公司 logo，
製成透明 PNG（白圓保留、圓外去背），供 scripts/build_anthropic_cash.js 使用。

用法：
  python3 scripts/prepare_cash_logos.py <參考圖路徑>

座標是對 810×1012 原圖實測的白圓中心；裁 60×60 方塊後 4x Lanczos 放大，
再用 4x 超取樣的圓形 mask 做抗鋸齒去背。輸出 assets/cash-logos/<key>.png。
"""
import argparse
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, 'assets', 'cash-logos')

# (檔名, 圓心 y)；圓心 x 固定 77，半徑 30
ROWS = [
    ('googl', 332),
    ('anthropic', 414),
    ('amzn', 498),
    ('meta', 570),
    ('msft', 642),
    ('tencent', 715),
    ('baba', 787),
]
CROP = (47, 77 + 30)  # (x0, x1)；y 由 cy±30 決定
R = 30
SCALE = 4
SS = 4  # mask 超取樣倍數


def round_mask(size):
    s = size * SS
    m = Image.new('L', (s, s), 0)
    # 原圖白圓外側是黑底（Anthropic 行還有橙框），mask 內縮 9% 半徑把這圈黑邊／橙弧切掉
    inset = int(s * 0.09)
    ImageDraw.Draw(m).ellipse((inset, inset, s - inset - 1, s - inset - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src', help='參考圖路徑（810×1012 PNG）')
    args = ap.parse_args()

    im = Image.open(args.src).convert('RGB')
    if im.size != (810, 1012):
        print(f'⚠ 圖片尺寸 {im.size} 與實測的 810×1012 不同，裁切座標可能失準')

    os.makedirs(OUT_DIR, exist_ok=True)
    size = 2 * R * SCALE
    mask = round_mask(size)
    for name, cy in ROWS:
        crop = im.crop((CROP[0], cy - R, CROP[1], cy + R)).resize((size, size), Image.LANCZOS)
        rgba = crop.convert('RGBA')
        rgba.putalpha(mask)
        dst = os.path.join(OUT_DIR, f'{name}.png')
        rgba.save(dst)
        print(f'{name:10s} -> {dst}  ({size}x{size})')


if __name__ == '__main__':
    main()
