#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
個股 logo 抓取與緩存 → assets/logos/<TICKER>.png + data/logos.json（base64 data URI）

源：Financial Modeling Prep（主，覆蓋最全、透明通道）→ CompaniesMarketCap（備）
處理：去透明邊 → 正方形留白 6% → 96×96 PNG
用法：python fetch_logos.py [--refresh]
"""
import json, os, io, base64, subprocess, argparse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(BASE, 'assets', 'logos')
OUT = os.path.join(BASE, 'data', 'logos.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
SIZE = 96

SRC = [
    'https://financialmodelingprep.com/image-stock/{}.png',
    'https://companiesmarketcap.com/img/company-logos/128/{}.png',
]


def fetch(t):
    for u in SRC:
        r = subprocess.run(['curl', '-s', '--max-time', '12', '-H', f'User-Agent: {UA}', u.format(t)],
                           capture_output=True)
        if not r.stdout or len(r.stdout) < 300:
            continue
        try:
            im = Image.open(io.BytesIO(r.stdout)).convert('RGBA')
        except Exception:
            continue
        if im.size[0] < 16:
            continue
        # 去透明邊
        bbox = im.split()[3].getbbox()
        if bbox:
            im = im.crop(bbox)
        # 正方形 + 6% 留白
        side = int(max(im.size) * 1.12)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
        canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
        return canvas
    return None


def collect_tickers():
    ticks = set()
    p = os.path.join(BASE, 'data', 'pages.json')
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        o = d.get('ondeck', {}).get('earnings', {})
        ticks.update(o.get('before', []) or [])
        ticks.update(o.get('after', []) or [])
        for day in d.get('earnings_week', {}).get('days', []):
            ticks.update(day.get('before', []) or [])
            ticks.update(day.get('after', []) or [])
        for day in d.get('week_ahead', {}).get('days', []):
            ticks.update(day.get('earn', []) or [])
        w = d.get('winners', {})
        ticks.update([r['ticker'] for r in w.get('gainers', [])])
        ticks.update([r['ticker'] for r in w.get('losers', [])])
    c = os.path.join(BASE, 'data', 'close.json')
    if os.path.exists(c):
        d = json.load(open(c, encoding='utf-8'))
        ticks.update([r['ticker'] for r in d.get('volume', {}).get('rows', [])])
    return sorted(t for t in ticks if t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--refresh', action='store_true')
    args = ap.parse_args()

    os.makedirs(LOGO_DIR, exist_ok=True)
    ticks = collect_tickers()
    print(f'tickers: {len(ticks)}')

    def work(t):
        path = os.path.join(LOGO_DIR, f'{t}.png')
        if os.path.exists(path) and not args.refresh:
            return t, True
        im = fetch(t)
        if not im:
            return t, False
        im.save(path)
        return t, True

    ok, fail = [], []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for t, good in ex.map(work, ticks):
            (ok if good else fail).append(t)

    logos = {}
    for t in ticks:
        path = os.path.join(LOGO_DIR, f'{t}.png')
        if os.path.exists(path):
            logos[t] = 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
    json.dump(logos, open(OUT, 'w'), ensure_ascii=False)

    print(f'OK {len(ok)} | FAIL {len(fail)}')
    if fail:
        print('  missing:', ', '.join(fail))


if __name__ == '__main__':
    main()
