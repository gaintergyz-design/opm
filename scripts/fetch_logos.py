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
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(BASE, 'assets', 'logos')
OUT = os.path.join(BASE, 'data', 'logos.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
# 256 而非 96：卡上以 26-30px 顯示，源圖太小會鋸齒（2026-10-26 阿澤指出）
SIZE = 256
# logos.json 嵌入尺寸：64px（≈卡上顯示尺寸的 2 倍）。
# 實測 resvg 把 256px 直接縮到 30px 會鋸齒（大比例降採樣質量差），
# 先用 LANCZOS 預縮到 64px 再交 resvg 1:2 縮放，邊緣平滑（2026-10-26 對照實驗）。
EMBED = 64
# 留白係數：卡上 logo 用圓形裁切，方形圖的**四角會被切掉**。
# 內容必須落在圓的內接正方形內（邊長 = 直徑/√2 ≈ 0.707），故整圖放大到 1/0.68 ≈ 1.47 倍。
FIT = 1.47

SRC = [
    'https://financialmodelingprep.com/image-stock/{}.png',
    'https://companiesmarketcap.com/img/company-logos/128/{}.png',
]


def white_ratio(im):
    """不透明像素裡近白色的佔比（0.0-1.0）"""
    px = im.load()
    w, h = im.size
    op = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 200]
    if not op:
        return 1.0
    wht = sum(1 for x, y in op if px[x, y][0] > 235 and px[x, y][1] > 235 and px[x, y][2] > 235)
    return wht / len(op)


def white_on_transparent(im):
    """白字 + 透明底的 logo 放在白卡上等於隱形（Marvell 就是）。
    判斷：不透明像素裡 ≥97% 是近白色 → 視為壞圖，換下一個來源。
    （AAPL / LRCX 那種「白底方塊 + 深色圖形」白佔比約 0.88，不算壞圖）"""
    return white_ratio(im) >= 0.97


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
        if white_on_transparent(im):
            continue          # 白字透明底 → 白卡上看不見，換下一個來源
        # 去透明邊
        bbox = im.split()[3].getbbox()
        if bbox:
            im = im.crop(bbox)
        # 正方形 + 留白（見 FIT：確保內容不被圓形裁切切角）
        side = int(max(im.size) * FIT)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
        canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
        # 白字 logo（如 AFRM：白字+藍弧）在白卡上隱形 → 墊深色圓底讓白色筆畫可讀
        # （品牌 App 圖標做法：白字 logo 本來就設計在深色底上）
        if white_ratio(canvas) >= 0.5:
            bg = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            pad = 4
            ImageDraw.Draw(bg).ellipse(
                (pad, pad, SIZE - pad, SIZE - pad), fill=(25, 31, 44, 255))
            bg.paste(canvas, (0, 0), canvas)
            canvas = bg
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
    buf = io.BytesIO()
    for t in ticks:
        path = os.path.join(LOGO_DIR, f'{t}.png')
        if os.path.exists(path):
            im = Image.open(path).convert('RGBA').resize((EMBED, EMBED), Image.LANCZOS)
            buf.truncate(0); buf.seek(0)
            im.save(buf, 'PNG')
            logos[t] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    json.dump(logos, open(OUT, 'w'), ensure_ascii=False)

    print(f'OK {len(ok)} | FAIL {len(fail)}')
    if fail:
        print('  missing:', ', '.join(fail))


if __name__ == '__main__':
    main()
