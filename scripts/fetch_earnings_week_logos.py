#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
為「本週美股業績」卡抓取個股 logo → assets/logos/<TICKER>.png + data/logos.json

重用 fetch_logos.py 的抓取／去背／正方形留白邏輯；只補這張卡用到的 ticker，
且對 data/logos.json 做 dict-union（不覆蓋既有條目，符合「只增不改」）。

用法：python3 scripts/fetch_earnings_week_logos.py
"""
import json, os, io, base64, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_logos as FL

BASE = FL.BASE
TICKERS = '''
BEKE BIDU IQ POET XPEV DIS ESLT HD JD VIK BLSH LOW PONY TGT TJX ZIM
BABA FUTU NTES PDD WMG WMT BJ WRD INFQ RCAT NVDA SQM JOYY PANW WWD
ESTC GAP INTU ROST
'''.split()


def work(t):
    path = os.path.join(FL.LOGO_DIR, f'{t}.png')
    if os.path.exists(path):
        return t, 'cached'
    im = FL.fetch(t)
    if im is None:
        return t, 'FAIL'
    im.save(path)
    return t, 'ok'


def main():
    os.makedirs(FL.LOGO_DIR, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as ex:
        res = list(ex.map(work, TICKERS))

    ok = [t for t, s in res if s in ('ok', 'cached')]
    fail = [t for t, s in res if s == 'FAIL']

    # dict-union：只加新鍵，既有條目原樣保留
    logos = {}
    if os.path.exists(FL.OUT):
        logos = json.load(open(FL.OUT, encoding='utf-8'))
    buf = io.BytesIO()
    for t in TICKERS:
        path = os.path.join(FL.LOGO_DIR, f'{t}.png')
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGBA').resize((FL.EMBED, FL.EMBED), Image.LANCZOS)
        buf.truncate(0); buf.seek(0)
        im.save(buf, 'PNG')
        logos.setdefault(t, 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode())
    json.dump(logos, open(FL.OUT, 'w'), ensure_ascii=False)

    print(f'OK {len(ok)} / {len(TICKERS)} | FAIL {len(fail)}')
    if fail:
        print('  missing:', ', '.join(fail))
    print('logos.json keys:', len(logos))


if __name__ == '__main__':
    main()
