#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CEO 頭像抓取（Wikipedia 摘要 API 官方肖像）→ assets/ceos/<T>.png + data/ceo-avatars.json
另補 META logo 進 data/logos.json。
用法：python fetch_ceos.py
"""
import json, os, io, base64, subprocess, time
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CEO_DIR = os.path.join(BASE, 'assets', 'ceos')
LOGO_DIR = os.path.join(BASE, 'assets', 'logos')
LOGOS_JSON = os.path.join(BASE, 'data', 'logos.json')
OUT = os.path.join(BASE, 'data', 'ceo-avatars.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
SIZE = 160          # 嵌入尺寸：卡上顯示 ~66px，2x 渲染 = 132px
LOGO_EMBED = 64

# ticker → (wikipedia page, 顯示名)
CEOS = [
    ('AAPL', 'Tim_Cook',        'Tim Cook'),
    ('NVDA', 'Jensen_Huang',    'Jensen Huang'),
    ('MSFT', 'Satya_Nadella',   'Satya Nadella'),
    ('GOOGL', 'Sundar_Pichai',  'Sundar Pichai'),
    ('AMZN', 'Andy_Jassy',      'Andy Jassy'),
    ('TSM',  'C._C._Wei',       'C.C. Wei'),
    ('SPCX', 'Elon_Musk',       'Elon Musk'),
    ('META', 'Mark_Zuckerberg', 'Mark Zuckerberg'),
    ('AVGO', 'Hock_Tan',        'Hock Tan'),
    ('TSLA', 'Elon_Musk',       'Elon Musk'),
]


def fetch(url, timeout=20):
    return subprocess.run(['curl', '-sL', '--max-time', str(timeout), '-H',
                           f'User-Agent: {UA}', url], capture_output=True).stdout


def wiki_photo(page):
    d = fetch(f'https://en.wikipedia.org/api/rest_v1/page/summary/{page}')
    try:
        j = json.loads(d)
    except Exception:
        return None
    for key in ('originalimage', 'thumbnail'):
        src = (j.get(key) or {}).get('source')
        if src:
            return src
    return None


def square(im, size):
    """中心偏上裁方形（人像照頭在上半），去邊再縮放"""
    w, h = im.size
    side = min(w, h)
    if h > w:                       # 豎版：從偏上 8% 起裁，保住頭部
        top = max(0, int((h - side) * 0.08))
        box = (0, top, w, top + side)
    else:                           # 橫版：水平居中
        x0 = (w - side) // 2
        box = (x0, 0, x0 + side, side)
    return im.crop(box).resize((size, size), Image.LANCZOS).convert('RGB')


def to_uri(path, size):
    im = Image.open(path).convert('RGB').resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


os.makedirs(CEO_DIR, exist_ok=True)
avatars = {}
fail = []
for t, page, name in CEOS:
    path = os.path.join(CEO_DIR, f'{t}.jpg')
    src = wiki_photo(page)
    got = False
    for attempt in range(2):
        if src:
            raw = fetch(src, timeout=30)
            if len(raw) > 3000:
                try:
                    im = Image.open(io.BytesIO(raw)).convert('RGB')
                    square(im, 256).save(path, quality=92)
                    got = True
                    break
                except Exception:
                    pass
        time.sleep(3)
        src = wiki_photo(page)
    if got:
        avatars[t] = {'name': name, 'uri': to_uri(path, SIZE)}
        print(f'  {t:6} {name:16} OK ({len(avatars[t]["uri"])//1024}KB uri)')
    else:
        fail.append((t, name, page))
        print(f'  {t:6} {name:16} FAIL ({page})')

json.dump(avatars, open(OUT, 'w'), ensure_ascii=False)
print('saved ->', OUT, f'({len(avatars)}/{len(CEOS)})')
if fail:
    print('FAILED:', fail)

# ---- 補 META logo（logos.json 缺）----
logos = json.load(open(LOGOS_JSON))
if 'META' not in logos:
    lpath = os.path.join(LOGO_DIR, 'META.png')
    if os.path.exists(lpath):
        logos['META'] = to_uri(lpath, LOGO_EMBED)
    else:
        for u in ('https://financialmodelingprep.com/image-stock/META.png',
                  'https://companiesmarketcap.com/img/company-logos/128/META.png'):
            raw = fetch(u, timeout=15)
            if len(raw) > 300:
                try:
                    im = Image.open(io.BytesIO(raw)).convert('RGBA')
                    bbox = im.split()[3].getbbox()
                    if bbox:
                        im = im.crop(bbox)
                    side = int(max(im.size) * 1.47)
                    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
                    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
                    canvas.resize((256, 256), Image.LANCZOS).save(lpath)
                    logos['META'] = to_uri(lpath, LOGO_EMBED)
                    break
                except Exception:
                    pass
    json.dump(logos, open(LOGOS_JSON, 'w'), ensure_ascii=False)
    print('META logo:', 'OK' if 'META' in logos else 'STILL MISSING')
