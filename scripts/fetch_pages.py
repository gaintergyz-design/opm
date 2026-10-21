#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
其餘四頁的數據裝配 → data/pages.json
  · On Deck      盤前：當日經濟數據 + 當日財報（盤前/盤後）
  · Winners & Losers  週牛熊榜（需本地歷史累積，未滿 5 個交易日時標記 demo）
  · Earnings Week    本週財報日曆（週一~週五，逐日家數 + 市值前三）
  · Week Ahead       下週日程（經濟數據 + 財報家數 + 期權到期）

數據源：Nasdaq 官方 calendar / screener（無 key）
用法：python fetch_pages.py [--week-start 2026-10-20]
"""
import json, os, subprocess, argparse
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'pages.json')
HIST = os.path.join(BASE, 'data', 'history')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
NASDAQ = 'https://api.nasdaq.com/api'


def jget(url, timeout=25):
    out = subprocess.run(['curl', '-s', '--max-time', str(timeout),
                          '-H', f'User-Agent: {UA}', '-H', 'Accept: application/json', url],
                         capture_output=True, text=True).stdout
    try:
        return json.loads(out) if out.strip().startswith('{') else {}
    except Exception:
        return {}


def mcap(r):
    try:
        return int(str(r.get('marketCap', '0')).replace('$', '').replace(',', '') or 0)
    except Exception:
        return 0


def weekdays(start):
    d, out = start, []
    while len(out) < 5:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


ET = ZoneInfo('America/New_York')
# 美股假日（只列近期，逐年補；缺了只會多發一天空圖，不會錯數據）
US_HOLIDAYS = {'2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
               '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
               '2027-01-01', '2027-01-18'}


def is_trading_day(d):
    return d.weekday() < 5 and d.strftime('%Y-%m-%d') not in US_HOLIDAYS


def on_deck_session():
    """On Deck 對應的交易時段：
    ET 16:00 前（盤前/盤中）→ 當天；ET 收盤後 → 下一個交易日。"""
    now = datetime.now(ET)
    d = now.date()
    if is_trading_day(d) and now.hour < 16:
        return datetime(d.year, d.month, d.day)
    d = d + timedelta(days=1)
    while not is_trading_day(d):
        d += timedelta(days=1)
    return datetime(d.year, d.month, d.day)


def earnings_of(date_str):
    j = jget(f'{NASDAQ}/calendar/earnings?date={date_str}')
    rows = ((j.get('data') or {}).get('rows') or [])
    before = sorted([r for r in rows if r.get('time') == 'time-pre-market'], key=mcap, reverse=True)
    after = sorted([r for r in rows if r.get('time') == 'time-after-hours'], key=mcap, reverse=True)
    return {
        'total': len(rows),
        'before': [r['symbol'] for r in before],
        'after': [r['symbol'] for r in after],
        'before_n': len(before),
        'after_n': len(after),
        'notable': [r['symbol'] for r in sorted(rows, key=mcap, reverse=True)[:3]],
    }


MAJOR = ['FOMC', 'Fed', 'CPI', 'PCE', 'GDP', 'Nonfarm', 'Payroll', 'Unemployment',
         'Retail Sales', 'ISM', 'Consumer Confidence', 'Jobless', 'PPI', 'Durable',
         'Housing Starts', 'Existing Home', 'GDP', 'Trade Balance', 'Michigan']


def econ_score(e):
    n = e['event']
    sc = 0
    for k in MAJOR:
        if k.lower() in n.lower():
            sc += 3
    if e.get('consensus'):
        sc += 1
    return sc


def econ_of(date_str):
    j = jget(f'{NASDAQ}/calendar/economicevents?date={date_str}')
    rows = ((j.get('data') or {}).get('rows') or [])
    us = [r for r in rows if 'United States' in (r.get('country') or '')]
    keep = []
    for r in us:
        name = (r.get('eventName') or '').replace('&nbsp;', '').strip()
        if not name:
            continue
        keep.append({
            'time': (r.get('gmt') or '').strip(),
            'event': name,
            'consensus': (r.get('consensus') or '').replace('&nbsp;', '').strip(),
            'previous': (r.get('previous') or '').replace('&nbsp;', '').strip(),
        })
    seen, uniq = set(), []
    for e in keep:
        k = e['event'].lower()
        if k in seen:
            continue
        # 包含式去重：「Pending Home Sales Index」=「Pending Home Sales」
        # 短於 10 字元的鍵不參與（避免 GDP 誤傷 GDPNow）
        if any(len(s) >= 10 and (s in k or k in s) for s in seen):
            continue
        seen.add(k)
        uniq.append(e)
    uniq.sort(key=econ_score, reverse=True)
    return uniq


def _demo_winners():
    g = [('ASTS', 38.4), ('RKLB', 29.1), ('SOFI', 23.7), ('HOOD', 19.2), ('PLTR', 16.8),
         ('COIN', 14.1), ('SMCI', 12.6), ('IONQ', 11.3), ('MARA', 9.8), ('AFRM', 8.4)]
    l = [('LULU', -28.6), ('DG', -24.3), ('MRNA', -21.7), ('PFE', -18.9), ('NKE', -16.2),
         ('TGT', -14.5), ('BA', -12.8), ('INTC', -11.4), ('WBA', -9.7), ('F', -8.1)]
    return {'from': 'Oct 13', 'to': 'Oct 17', 'universe': 503, 'is_demo': True,
            'gainers': [{'ticker': t, 'pct': v} for t, v in g],
            'losers': [{'ticker': t, 'pct': v} for t, v in l]}


def load_history(since=None):
    """讀本地每日快照，計算週報酬（需 ≥2 個交易日）
       since='YYYY-MM-DD'：只取該日期（本週一）之後的快照，避免跨週累積成「雙週榜」"""
    if not os.path.isdir(HIST):
        return None
    files = sorted(f for f in os.listdir(HIST) if f.endswith('.json'))
    if since:
        files = [f for f in files if f[:10] >= since]
    if len(files) < 2:
        return None
    first = json.load(open(os.path.join(HIST, files[0])))
    last = json.load(open(os.path.join(HIST, files[-1])))
    rows = []
    for sym, cur in last.items():
        old = first.get(sym)
        if not old or not old.get('last'):
            continue
        pct = (cur['last'] - old['last']) / old['last'] * 100
        rows.append({'ticker': sym, 'name': cur.get('name', ''), 'pct': round(pct, 2),
                     'last': cur['last'], 'dollar_volume': cur.get('dollar_volume', 0)})
    rows.sort(key=lambda r: r['pct'], reverse=True)
    return {'from': files[0][:-5], 'to': files[-1][:-5],
            'universe': len(rows),
            'gainers': rows[:10], 'losers': rows[-10:][::-1], 'is_demo': False}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--week-start', default='')
    args = ap.parse_args()

    start = (datetime.strptime(args.week_start, '%Y-%m-%d') if args.week_start
             else datetime.now())
    start = start - timedelta(days=start.weekday())          # 對齊本週一
    days = weekdays(start)
    nxt = weekdays(days[-1] + timedelta(days=3))

    # Earnings Week 頁已移除（阿澤 2026-10-21 拍板），只保留 next week + on deck
    # days 仍作為「本週」錨點，用來推導下週 nxt

    print('[2/2] next week + on deck ...')
    # On Deck = 今天（ET 未收盤）或下一個交易日（ET 收盤後 / 週末）
    nd = on_deck_session()
    on_deck_earn = earnings_of(nd.strftime('%Y-%m-%d'))
    on_deck_econ = econ_of(nd.strftime('%Y-%m-%d'))
    next_days = []
    seen_econ = set()                       # GDPNow 等每日重複指標跨日去重
    for d in nxt:
        e = earnings_of(d.strftime('%Y-%m-%d'))
        ev = [x for x in econ_of(d.strftime('%Y-%m-%d')) if x['event'] not in seen_econ]
        for x in ev[:4]:
            seen_econ.add(x['event'])
        next_days.append({
            'day': d.strftime('%a'), 'date': d.strftime('%b %d'),
            'count': e['total'],
            'econ': [x['event'] for x in ev[:4]],
            'before': e['before'][:8], 'after': e['after'][:8],
        })

    daily = json.load(open(os.path.join(BASE, 'data', 'close.json'), encoding='utf-8'))

    # 每日快照落地，供週牛熊榜累積計算（需 ≥2 個交易日）
    if daily.get('volume', {}).get('rows'):
        os.makedirs(HIST, exist_ok=True)
        snap = {r['ticker']: {'last': r['last'], 'name': r['name'],
                              'dollar_volume': r['dollar_volume']}
                for r in daily['volume']['rows']}
        json.dump(snap, open(os.path.join(HIST, f"{daily['session']}.json"), 'w'))
    week = load_history(days[0].strftime('%Y-%m-%d'))

    data = {
        'handle': '@onepagemarket',
        'disclaimer': 'For informational purposes only. Not investment advice.',
        'source': 'Nasdaq official calendar & screener',
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'week_label': f"{days[0].strftime('%b %d')} – {days[-1].strftime('%b %d')}",
        'ondeck': {
            'session': nd.strftime('%Y-%m-%d'),
            'slot': 'pre-market' if nd.date() == datetime.now(ET).date() else 'next session',
            'prev_close': [{'label': i['label'], 'pct': i['pct']} for i in daily.get('indexes', [])],
            'econ': on_deck_econ[:10],
        'econ_all': len(on_deck_econ),
            'earnings': {'before': on_deck_earn['before'][:8], 'after': on_deck_earn['after'][:8],
                         'before_n': on_deck_earn['before_n'], 'after_n': on_deck_earn['after_n'],
                         'total': on_deck_earn['total']},
        },
        'winners': week or _demo_winners(),
        'week_ahead': {'days': next_days},
    }

    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('OK ->', OUT)
    print('  econ events next week:', sum(len(d['econ']) for d in next_days))
    print('  winners demo?', data['winners']['is_demo'])


if __name__ == '__main__':
    main()
