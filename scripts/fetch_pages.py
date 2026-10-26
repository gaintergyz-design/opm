#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
其餘四頁的數據裝配 → data/pages.json
  · On Deck      盤前：當日經濟數據 + 當日財報（盤前/盤後）
  · Winners & Losers  週牛熊榜（TradingView 全市場股票池 + Yahoo 官方收盤價直算，
                     不依賴本地歷史快照；數據取不到即 FATAL，絕不出 demo 假數據）
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
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
# ⚠️ Yahoo 按 UA 指紋限流（429）：帶 Chrome/124 的長 UA 已被拉黑（2026-10-26 實測），
#    短 UA 正常。遇 429 先換 UA，不要傻等。
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
    """已廢除（2026-10-26 阿澤欽定：週榜必須全市場權威數據，demo 假數據絕不上卡）。
    保留空殼只是為了 pages.json 結構兼容；非 winners 產線不會渲染它。"""
    return {'from': '', 'to': '', 'universe': 0, 'is_demo': True,
            'gainers': [], 'losers': []}


def curl_post(url, body, timeout=40):
    out = subprocess.run(['curl', '-s', '--max-time', str(timeout),
                          '-H', f'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                          '-H', 'Content-Type: application/json',
                          '--data-binary', body, url],
                         capture_output=True, text=True).stdout
    try:
        return json.loads(out) if out.strip().startswith('{') else {}
    except Exception:
        return {}


def tv_universe(min_cap=2_000_000_000, limit=5000):
    """TradingView 官方 scanner：美股三大交易所、type=stock、市值 > $2B 的全列表。
    （TV 的 Perf.W 字段有拆股污染不能用，但它的股票池/市值/收盤價可靠）"""
    body = json.dumps({
        'filter': [
            {'left': 'type', 'operation': 'equal', 'right': 'stock'},
            {'left': 'exchange', 'operation': 'in_range', 'right': ['NASDAQ', 'NYSE', 'AMEX']},
            {'left': 'market_cap_basic', 'operation': 'greater', 'right': min_cap},
        ],
        'options': {'lang': 'en'},
        'markets': ['america'],
        'symbols': {'query': {'types': []}, 'tickers': []},
        'columns': ['name', 'description', 'close'],
        'sort': {'sortBy': 'market_cap_basic', 'sortOrder': 'desc'},
        'range': [0, limit],
    })
    import time
    d = {}
    for attempt in range(4):
        d = curl_post('https://scanner.tradingview.com/america/scan', body)
        if d.get('data'):
            break
        print(f'    · TV scanner 空回應，重試 {attempt+1}/4 …')
        time.sleep(12)
    out = []
    for it in (d.get('data') or []):
        sym = (it.get('s') or '').split(':')[-1].strip().replace('.', '-')
        desc = ((it.get('d') or [None, None])[1]) or ''
        # 剔除權證/單位/優先股等非普通股（名稱含關鍵字）
        if any(k in desc for k in ('Warrant', 'Right', 'Unit', 'Preferred', 'Depositary')):
            continue
        if sym:
            out.append(sym)
    return out


def weekly_returns(symbols, start_day, end_day, batch=20):
    """Yahoo 官方日 K（spark 批量，**上限 20 檔/請求**，2026-10-26 實測）算週回報：
    窗口首個交易日收盤 → 末日收盤。失敗批次重試；連續 3 批失敗直接 FATAL。"""
    import time, urllib.parse
    s0 = datetime(start_day.year, start_day.month, start_day.day, 0, 0, tzinfo=ET).timestamp()
    s1 = datetime(end_day.year, end_day.month, end_day.day, 23, 59, tzinfo=ET).timestamp()
    out, failed = {}, 0
    for i in range(0, len(symbols), batch):
        chunk = symbols[i:i + batch]
        d = {}
        for attempt in range(3):
            q = urllib.parse.quote(','.join(chunk), safe=',.-')
            d = jget(f'https://query1.finance.yahoo.com/v8/finance/spark'
                     f'?symbols={q}&range=1mo&interval=1d', timeout=40)
            if d:
                break
            time.sleep(8)
        if not d:
            failed += 1
            print(f'    ⚠️ 第 {i//batch+1} 批（{len(chunk)} 檔）重試後仍失敗')
            if failed >= 3:
                raise SystemExit(f'FATAL: spark 已失敗 {failed} 批，中止——週榜不出殘缺數據')
            continue
        got_any = False
        for sym, v in d.items():
            if not isinstance(v, dict):
                continue
            ts, cl = v.get('timestamp') or [], v.get('close') or []
            pts = [(t, c) for t, c in zip(ts, cl) if c and s0 <= t <= s1]
            if len(pts) >= 2 and pts[0][1] > 0:
                out[sym] = round((pts[-1][1] / pts[0][1] - 1) * 100, 2)
                got_any = True
        if not got_any:
            # 回應非空但解析不出任何符號（限流 JSON 錯誤體、Bad Request 等）→ 記為失敗批次
            failed += 1
            print(f'    ⚠️ 第 {i//batch+1} 批（{len(chunk)} 檔）回應異常（解析 0 檔）')
            if failed >= 3:
                raise SystemExit(f'FATAL: spark 已失敗 {failed} 批，中止——週榜不出殘缺數據')
        time.sleep(0.8)
    return out


def compute_week_winners(start_day, end_day):
    """週牛熊榜：全市場（市值>$2B）官方收盤價直算，不再依賴本地歷史快照。"""
    print('[winners] 股票池（TradingView：三大交易所、市值>$2B）...')
    universe = tv_universe()
    if len(universe) < 100:
        raise SystemExit(f'FATAL: 股票池只取到 {len(universe)} 檔，中止')
    print(f'    {len(universe)} 檔')
    print('[winners] 週回報（Yahoo 官方日 K 收盤）...')
    rets = weekly_returns(universe, start_day, end_day)
    if len(rets) < 100:
        raise SystemExit(f'FATAL: 週回報只算出 {len(rets)} 檔，中止')
    rows = sorted(rets.items(), key=lambda kv: kv[1], reverse=True)
    print(f'    有效 {len(rets)} 檔 | 領漲 {rows[0][0]} {rows[0][1]:+.2f}% '
          f'| 領跌 {rows[-1][0]} {rows[-1][1]:+.2f}%')
    return {
        'from': start_day.strftime('%Y-%m-%d'), 'to': end_day.strftime('%Y-%m-%d'),
        'universe': len(rets), 'is_demo': False,
        'gainers': [{'ticker': t, 'pct': p} for t, p in rows[:10]],
        'losers': [{'ticker': t, 'pct': p} for t, p in rows[-10:][::-1]],
    }


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
    ap.add_argument('--target', choices=['week', 'next'], default='next',
                    help='Week Ahead 覆蓋週：week=本週（週一早上發）/ next=下週（預設）')
    ap.add_argument('--strict-winners', action='store_true',
                    help='winners 產線用：歷史快照不足時直接 FATAL，絕不出 demo 假數據（2026-10-26 阿澤欽定）')
    args = ap.parse_args()

    start = (datetime.strptime(args.week_start, '%Y-%m-%d') if args.week_start
             else datetime.now())
    start = start - timedelta(days=start.weekday())          # 對齊本週一
    days = weekdays(start)
    nxt = weekdays(days[-1] + timedelta(days=3))

    # Week Ahead 覆蓋哪一週：--target week（週一早上發「本週前瞻」）/ next（預設，下週）
    wa_days = days if getattr(args, 'target', 'next') == 'week' else nxt
    # On Deck = 今天（ET 未收盤）或下一個交易日（ET 收盤後 / 週末）
    nd = on_deck_session()
    on_deck_earn = earnings_of(nd.strftime('%Y-%m-%d'))
    on_deck_econ = econ_of(nd.strftime('%Y-%m-%d'))
    next_days = []
    seen_econ = set()                       # GDPNow 等每日重複指標跨日去重
    for d in wa_days:
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
    week = None
    if getattr(args, 'strict_winners', False):
        # winners 產線：全市場權威數據直算（TradingView 股票池 + Yahoo 官方收盤價）
        week = compute_week_winners(days[0], days[-1])
    else:
        # 其他產線不渲染週榜：沿用上一份真實數據，絕不再生成 demo 假數據
        week = _demo_winners()
        if os.path.exists(OUT):
            try:
                prev = (json.load(open(OUT)) or {}).get('winners') or {}
                if prev.get('gainers'):
                    week = prev
            except Exception:
                pass

    data = {
        'handle': '@onepagemarket',
        'disclaimer': ('For informational purposes only. Not investment advice. The relevant data and content '
                       'are obtained from public sources and for reference only. All third-party trademarks, '
                       'brand names and logos displayed are for identification purposes only and remain the '
                       'property of their respective owners.'),
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
        'week_ahead': {'days': next_days,
                       'scope': 'this week' if getattr(args, 'target', 'next') == 'week' else 'next week'},
    }

    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('OK ->', OUT)
    print('  week ahead scope:', data['week_ahead']['scope'], '|',
          '  econ events:', sum(len(d['econ']) for d in next_days))
    print('  winners demo?', data['winners']['is_demo'])


if __name__ == '__main__':
    main()
