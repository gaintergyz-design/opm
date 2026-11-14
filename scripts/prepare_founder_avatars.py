#!/usr/bin/env python3
"""
OPM 專題卡「Founder stakes vs. control」人物像素材準備。

來源：阿澤 2026-11-14 提供的「圖解財經／東方財富」三大創始人 CEO 持股對比圖
      （/Users/gaoyingze/.workbuddy/clipboard-images/clipboard-2026-11-14T05-12-23-717Z-2267ced8.jpg，720x1366）。
處理：從原圖精確裁出三個白底去背半身像 → 清掉黃仁勳旁的中文字 →
      2x LANCZOS 放大 + 輕微銳化，輸出 assets/founders/*.png。
      保留白底是刻意的：SVG 端用圓形 clipPath + 白色圓底，白底人像直接融入，
      不必做 alpha 去背（去背會吃掉白髮／眼鏡高光，畫質反而更差）。

用法：python3 scripts/prepare_founder_avatars.py [來源圖路徑]
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else (
    '/Users/gaoyingze/.workbuddy/clipboard-images/'
    'clipboard-2026-11-14T05-12-23-717Z-2267ced8.jpg'
)
OUT_DIR = os.path.join(BASE, 'assets', 'founders')

# 原圖座標下的裁切框；whiten = 需要抹成白底的額外矩形（相對裁切框座標）
CROPS = {
    'huang': {
        'box': (78, 330, 305, 585),
        'whiten': [(162, 25, 227, 145)],   # 右側「黃仁勳／英偉達創始人、前 CEO」
    },
    'musk': {
        'box': (46, 620, 202, 776),
        'whiten': [],
    },
    'zuck': {
        'box': (96, 914, 244, 1064),
        'whiten': [],
    },
}


def main():
    src = Image.open(SRC).convert('RGB')
    os.makedirs(OUT_DIR, exist_ok=True)
    print('source:', SRC, src.size)
    for name, cfg in CROPS.items():
        im = src.crop(cfg['box'])
        if cfg['whiten']:
            d = ImageDraw.Draw(im)
            for box in cfg['whiten']:
                d.rectangle(box, fill='white')
        # 2x 放大（卡片以 1080x1350 排版、2160x2700 輸出）
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
        big = big.filter(ImageFilter.UnsharpMask(radius=1.1, percent=105, threshold=3))
        p = os.path.join(OUT_DIR, name + '.png')
        big.save(p, optimize=True)
        print('  ->', p, big.size)
    # 檢查拼圖：白底並排，方便肉眼確認沒有殘留文字／圖表
    parts = [Image.open(os.path.join(OUT_DIR, n + '.png')) for n in CROPS]
    W = sum(p.width for p in parts) + 20 * (len(parts) + 1)
    H = max(p.height for p in parts) + 40
    sheet = Image.new('RGB', (W, H), '#E9EDF2')
    x = 20
    for p in parts:
        sheet.paste(p, (x, 20))
        x += p.width + 20
    sheet.save('/tmp/opm-founders-sheet.png')
    print('sheet -> /tmp/opm-founders-sheet.png')


if __name__ == '__main__':
    main()
