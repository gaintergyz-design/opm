#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一次性抓取全球晶圓代工十強 logo → assets/foundry/<KEY>.png
（OPM 個股 logo 走 fetch_logos.py；這批多為非美股，FMP 覆蓋不全，故另立清單）

處理：去透明邊 → 正方形留白 8% → 320×320 PNG（卡上以 76-84px 顯示，需高解析）
"""
import io, os, subprocess, sys
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'assets', 'foundry')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
SIZE = 320
PAD = 1.08     # 不裁圓，只留一點呼吸空間

CAND = {
    'TSMC':   ['TSM', '2330.TW'],
    'SAMSUNG': ['005930.KS', 'SSNLF'],
    'SMIC':   ['0981.HK', '688981.SS', 'SMIC'],
    'UMC':    ['UMC', '2303.TW'],
    'GFS':    ['GFS'],
    'HUAHD':  ['1347.HK', '688347.SS', 'HHUSF'],
    'TOWER':  ['TSEM'],
    'VIS':    ['5347.TW', 'VIS'],
    'NEXCHIP': ['688249.SS', '688249.SH'],
    'PSMC':   ['6770.TW', 'PSMC'],
}
SRC = [
    'https://financialmodelingprep.com/image-stock/{}.png',
    'https://companiesmarketcap.com/img/company-logos/256/{}.png',
]
LOCAL = {
    'SAMSUNG': '/Users/gyz-igyz-imacmac/WorkBuddy/2026-10-22-10-23-38/samsung_earnings/assets/005930.png',
}


def white_ratio(im):
    px = im.load()
    w, h = im.size
    op = [(x, y) for y in range(0, h, 2) for x in range(0, w, 2) if px[x, y][3] > 200]
    if not op:
        return 1.0
    return sum(1 for x, y in op if px[x, y][0] > 235 and px[x, y][1] > 235 and px[x, y][2] > 235) / len(op)


def norm(raw):
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    if min(im.size) < 24:
        return None
    bbox = im.split()[3].getbbox()
    if bbox:
        im = im.crop(bbox)
    side = int(max(im.size) * PAD)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def get(url):
    r = subprocess.run(['curl', '-sS', '--http1.1', '--max-time', '20', '-H', f'User-Agent: {UA}', url],
                       capture_output=True)
    if r.returncode != 0 or len(r.stdout) < 400:
        return None
    return r.stdout


def main():
    os.makedirs(OUT, exist_ok=True)
    report = []
    for key, syms in CAND.items():
        done = False
        for sym in syms:
            for tpl in SRC:
                raw = get(tpl.format(sym))
                if not raw:
                    continue
                try:
                    im = norm(raw)
                except Exception:
                    continue
                if im is None or white_ratio(im) >= 0.97:
                    continue
                im.save(os.path.join(OUT, f'{key}.png'))
                report.append((key, sym, tpl.split('/')[2], im.size))
                done = True
                break
            if done:
                break
        if not done:
            p = LOCAL.get(key)
            if p and os.path.exists(p):
                im = norm(open(p, 'rb').read())
                im.save(os.path.join(OUT, f'{key}.png'))
                report.append((key, 'LOCAL', p, im.size))
                done = True
        if not done:
            report.append((key, 'FAIL', '', ''))
    for r in report:
        print(*r)


if __name__ == '__main__':
    sys.exit(main())
