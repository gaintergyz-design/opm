#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
歷史快照回填 → data/history/<date>.json

用途：週牛熊榜（Winners & Losers）靠 data/history/ 的每日快照累積算週報酬。
若某個交易日沒留快照（產線當天沒跑/失敗），週榜窗口就會缺頭，退回 demo。
本工具用 Yahoo Finance 官方日 K 重建該交易日的收盤快照（真實收盤價 × 成交量）。

ticker 池 = 鄰近快照裡出現過的 ticker（保持榜單語義一致）。

用法：
  python backfill_history.py --date 2026-10-19
"""
import argparse, json, os, subprocess, time
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, 'data', 'history')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
YH = 'https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1mo&interval=1d'


def curl(url, timeout=20):
    return subprocess.run(['curl', '-s', '--max-time', str(timeout),
                           '-H', f'User-Agent: {UA}', url],
                          capture_output=True, text=True).stdout


def bar_on(sym, date_str, retries=2):
    """回 (close, volume)；該日無成交回 None"""
    for i in range(retries + 1):
        t = (curl(YH.format(sym)) or '').strip()
        if t.startswith('{'):
            try:
                d = json.loads(t)
            except Exception:
                d = {}
            res = (d.get('chart') or {}).get('result') or []
            if res:
                r = res[0]
                ts = r.get('timestamp') or []
                q = ((r.get('indicators') or {}).get('quote') or [{}])[0]
                cl, vol = q.get('close') or [], q.get('volume') or []
                for k, t_ in enumerate(ts):
                    day = datetime.fromtimestamp(t_, ZoneInfo('America/New_York')).strftime('%Y-%m-%d')
                    if day == date_str:
                        c = cl[k] if k < len(cl) else None
                        v = vol[k] if k < len(vol) else None
                        if isinstance(c, (int, float)) and c > 0:
                            return round(float(c), 2), int(v) if isinstance(v, (int, float)) else 0
                        return None
                return None
        time.sleep(2)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--date', required=True)
    args = ap.parse_args()
    date_str = args.date

    # ticker 池：所有既有快照的聯集（避免只有鄰日少數幾檔）
    pool = {}
    for f in sorted(os.listdir(HIST)):
        if not f.endswith('.json'):
            continue
        for sym, v in json.load(open(os.path.join(HIST, f))).items():
            pool.setdefault(sym, v.get('name', ''))

    print(f'候選 {len(pool)} 檔 → 回填 {date_str}')
    snap, miss = {}, []
    for i, (sym, name) in enumerate(sorted(pool.items()), 1):
        got = bar_on(sym, date_str)
        if not got:
            miss.append(sym)
            continue
        c, v = got
        snap[sym] = {'last': c, 'name': name, 'dollar_volume': round(c * v)}
        if i % 10 == 0:
            print(f'  {i}/{len(pool)} …')
        time.sleep(0.3)

    if len(snap) < 2:
        raise SystemExit(f'FATAL: {date_str} 只取到 {len(snap)} 檔，放棄回填')

    os.makedirs(HIST, exist_ok=True)
    out = os.path.join(HIST, f'{date_str}.json')
    json.dump(snap, open(out, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    print(f'OK -> {out}（{len(snap)} 檔）')
    if miss:
        print('  無成交/取不到:', ', '.join(miss))


if __name__ == '__main__':
    main()
