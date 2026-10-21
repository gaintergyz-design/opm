#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
The Close 數據抓取 → data/close.json

數據源（全部權威公開源，無需 API key）：
  · 成交量榜 + 市場寬度   Nasdaq 官方 screener 全市場快照（單次請求 ~7000 檔）
  · 指數                  Yahoo chart（query2→query1）→ Yahoo spark → CNBC restQuote
                          → Nasdaq 官方（逐級降級，任一線路故障自動換下一條）
                          ⚠️ 全部取不到時中止出圖（絕不用自算/估算值代替官方數據）
  · 財報日曆              Nasdaq 官方 earnings calendar
  · S&P 500 成分股        公開清單，快取 7 天

用法：
  python fetch_close.py
  python fetch_close.py --session 2026-10-20 --earnings-date 2026-10-21
"""
import json, os, csv, subprocess, argparse, time
import urllib.parse
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'close.json')
SP500_CACHE = os.path.join(BASE, 'data', 'sp500.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

TOP_N = 20
SP500_CSV = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv'
NASDAQ = 'https://api.nasdaq.com/api'

INDEX_LIST = [('^GSPC', 'S&P 500'), ('^IXIC', 'Nasdaq'), ('^RUT', 'Russell 2000')]
YH_HOSTS = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']

EXCLUDE_KEYS = ['ETF', 'ETN', 'Fund', 'Trust', 'Index Fund']


def curl(url, timeout=25, accept_json=True):
    cmd = ['curl', '-s', '--max-time', str(timeout), '-H', f'User-Agent: {UA}']
    if accept_json:
        cmd += ['-H', 'Accept: application/json']
    cmd.append(url)
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def jget(url, retries=4, **kw):
    wait = 4
    for i in range(retries + 1):
        t = (curl(url, **kw) or '').strip()
        if t.startswith('{'):
            try:
                return json.loads(t)
            except Exception:
                pass
        if i < retries:
            print(f'    · 空回應/限流，等待 {wait}s 重試…')
            time.sleep(wait)
            wait = min(wait * 2, 25)
    return {}


def money(s):
    """'$172.97' / '1,234' / '' → float"""
    try:
        return float(str(s).replace('$', '').replace(',', '').replace('%', '').strip())
    except Exception:
        return None


# ---------------- 全市場快照（Nasdaq） ----------------
def fetch_snapshot():
    j = jget(f'{NASDAQ}/screener/stocks?tableonly=true&limit=10000&offset=0&download=true', timeout=40)
    rows = ((j.get('data') or {}).get('rows') or [])
    snap = {}
    for r in rows:
        price = money(r.get('lastsale'))
        vol = money(r.get('volume'))
        if not price or not vol:
            continue
        snap[r.get('symbol')] = {
            'symbol': r.get('symbol'),
            'name': r.get('name') or '',
            'last': price,
            'pct': money(r.get('pctchange')),
            'volume': vol,
            'marketCap': money(r.get('marketCap')),
            'dollar_volume': round(price * vol),
        }
    return snap


# ---------------- 成交量榜 ----------------
def build_top(snap):
    rows = [r for r in snap.values() if not any(k.lower() in r['name'].lower() for k in EXCLUDE_KEYS)]
    rows.sort(key=lambda r: r['dollar_volume'], reverse=True)
    return [{
        'ticker': r['symbol'],
        'name': r['name'],
        'last': round(r['last'], 2),
        'pct': round(r['pct'], 2) if r['pct'] is not None else None,
        'dollar_volume': r['dollar_volume'],
    } for r in rows[:TOP_N]]


# ---------------- 市場寬度（S&P 500） ----------------
def sp500_symbols():
    fresh = (os.path.exists(SP500_CACHE)
             and time.time() - os.path.getmtime(SP500_CACHE) < 7 * 86400)
    if not fresh:
        txt = curl(SP500_CSV, timeout=20, accept_json=False)
        if txt.startswith('Symbol,'):
            syms = [r['Symbol'].strip() for r in csv.DictReader(txt.splitlines()) if r.get('Symbol')]
            json.dump(syms, open(SP500_CACHE, 'w'))
            return syms
    try:
        return json.load(open(SP500_CACHE))
    except Exception:
        return []


def build_breadth(snap):
    syms = sp500_symbols()
    up = down = flat = 0
    matched = 0
    for s in syms:
        r = snap.get(s) or snap.get(s.replace('.', '-')) or snap.get(s.replace('-', '.'))
        if not r:
            continue
        matched += 1
        p = r['pct']
        if p is None:
            flat += 1
        elif p > 0:
            up += 1
        elif p < 0:
            down += 1
        else:
            flat += 1
    total = up + down + flat
    return {
        'pool': total,
        'pool_rule': 'S&P 500 constituents',
        'matched': matched,
        'up': up, 'down': down, 'flat': flat,
        'adv_pct': round(up / total * 100) if total else None,
    }


# ---------------- 指數 ----------------
def nasdaq_index(sym):
    d = jget(f'{NASDAQ}/quote/{sym}/info?assetclass=index', retries=1, timeout=15)
    pd_ = ((d.get('data') or {}).get('primaryData') or {})
    last = money(pd_.get('lastSalePrice'))
    chg = money(pd_.get('percentageChange'))
    if last is None or chg is None:
        return None
    prev = round(last / (1 + chg / 100), 2)
    return {'last': last, 'prev_close': prev, 'pct': round(chg, 2)}


def sp500_capweighted(snap):
    """（已棄用，保留參考）S&P 500 市值加權自算值偏差大（+0.50% vs 官方 +0.28%），
    2026-10-21 起不再作為指數備援——官方數據取不到就中止出圖，不估算。"""
    raise NotImplementedError('sp500_capweighted 已棄用：絕不用自算值代替官方指數數據')


def spark_indexes(symbols):
    """Yahoo spark 端點（限流獨立，chart 端點被限流時常仍可用）。
    回傳 {sym: (last, pct)}，取最後兩個交易日收盤算日漲跌。"""
    q = urllib.parse.quote(','.join(symbols), safe=',')
    d = jget(f'https://query1.finance.yahoo.com/v8/finance/spark?symbols={q}&range=5d&interval=1d',
             retries=0)
    out = {}
    for sym, v in (d or {}).items():
        cl = [c for c in (v.get('close') or []) if c]
        if len(cl) >= 2:
            out[sym] = (round(cl[-1], 2), round((cl[-1] / cl[-2] - 1) * 100, 2))
    return out


# 備援源 3：Nasdaq 官方指數報價（僅 Composite 有；SPX/RUT 該端點不提供）
NDAQ_INDEX = {'^IXIC': 'COMP'}
# 備援源 4：CNBC restQuote（Comstock 資料源，與 Yahoo/Nasdaq 完全獨立，三檔指數齊全）
CNBC_MAP = {'^GSPC': '.SPX', '^IXIC': '.IXIC', '^RUT': '.RUT'}
_CNBC_CACHE = {}


def cnbc_quotes():
    """CNBC 一次抓全部指數（含前收，故可算真實漲跌幅）"""
    global _CNBC_CACHE
    if _CNBC_CACHE:
        return _CNBC_CACHE
    syms = urllib.parse.quote('|'.join(CNBC_MAP.values()), safe='|.')
    url = ('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?'
           f'symbols={syms}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json')
    d = jget(url, retries=1, timeout=20)
    for q in ((d.get('FormattedQuoteResult') or {}).get('FormattedQuote') or []):
        last, pct = money(q.get('last')), money(q.get('change_pct'))
        if last is None or pct is None:
            continue
        # 前收一律由 last + 漲跌幅反推：CNBC 部分指數（如 .RUT）的 previous_day_closing
        # 會等於 last，直接採用會出現「前收 == 現價但漲 1.65%」的矛盾
        prev = round(last / (1 + pct / 100), 2) if pct != -100 else None
        _CNBC_CACHE[q.get('symbol')] = {'last': round(last, 2), 'prev_close': prev,
                                        'pct': round(pct, 2)}
    return _CNBC_CACHE


def fetch_indexes(snap=None):
    out = []
    for sym, label in INDEX_LIST:
        got = None
        # 線 1/2：Yahoo chart（雙主機輪替）
        for host in YH_HOSTS:
            d = jget(f'https://{host}/v8/finance/chart/{sym}?range=1d&interval=1d', retries=1)
            res = ((d.get('chart') or {}).get('result') or [])
            if res:
                meta = res[0].get('meta') or {}
                last = meta.get('regularMarketPrice')
                prev = meta.get('chartPreviousClose') or meta.get('previousClose')
                if last and prev:
                    got = {'label': label, 'last': round(last, 2), 'prev_close': round(prev, 2),
                           'pct': round((last - prev) / prev * 100, 2), 'src': 'yahoo-chart'}
                    break
        if got:
            out.append(got)
            continue
        # 線 3：Yahoo spark（限流獨立的 Yahoo 端點）
        sp = spark_indexes([sym]).get(sym)
        if sp:
            last, pct = sp
            out.append({'label': label, 'last': last, 'prev_close': None, 'pct': pct,
                        'src': 'yahoo-spark'})
            continue
        # 線 4：CNBC restQuote（獨立資料源，三檔齊全）
        c = cnbc_quotes().get(CNBC_MAP.get(sym))
        if c:
            out.append({'label': label, **c, 'src': 'cnbc'})
            continue
        # 線 5：Nasdaq 官方指數報價
        nd = NDAQ_INDEX.get(sym)
        if nd:
            n = nasdaq_index(nd)
            if n:
                out.append({'label': label, **n, 'src': 'nasdaq'})
                continue
        # 全部線路失敗：中止產圖——只用官方數據，絕不自己估算（2026-10-21 阿澤欽定）
        tried = ' → '.join(['Yahoo-chart', 'Yahoo-spark', 'CNBC'] +
                           (['Nasdaq-official'] if NDAQ_INDEX.get(sym) else []))
        raise SystemExit(f'FATAL: {label} 所有數據源均取不到（已試：{tried}），'
                         f'中止出圖，不使用估算值。請稍後重跑。')
    return out


# ---------------- 財報日曆（Nasdaq） ----------------
def next_weekday(d):
    d += timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


def fetch_earnings(date_str):
    j = jget(f'{NASDAQ}/calendar/earnings?date={date_str}', timeout=25)
    rows = ((j.get('data') or {}).get('rows') or [])

    def mcap(r):
        try:
            return int(str(r.get('marketCap', '0')).replace('$', '').replace(',', '') or 0)
        except Exception:
            return 0

    before = sorted([r for r in rows if r.get('time') == 'time-pre-market'], key=mcap, reverse=True)
    after = sorted([r for r in rows if r.get('time') == 'time-after-hours'], key=mcap, reverse=True)
    out = []
    if before:
        out.append({'session': 'Before open', 'tickers': ' · '.join(r['symbol'] for r in before[:3])})
    if after:
        out.append({'session': 'After close', 'tickers': ' · '.join(r['symbol'] for r in after[:3])})
    return out, len(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', default='')
    ap.add_argument('--earnings-date', default='')
    args = ap.parse_args()

    # session 一律以 ET（美東）日期為準：HKT 凌晨跑時本機日期會比 ET 快一天
    from zoneinfo import ZoneInfo
    now_et = datetime.now(ZoneInfo('America/New_York'))
    session = args.session or now_et.strftime('%Y-%m-%d')
    e_date = args.earnings_date or next_weekday(
        datetime.strptime(session, '%Y-%m-%d')).strftime('%Y-%m-%d')

    print('[1/3] 全市場快照（Nasdaq screener）...')
    snap = fetch_snapshot()
    if not snap:
        raise SystemExit('FATAL: 全市場快照為空，中止（不覆蓋既有 close.json）')
    print(f'    {len(snap)} 檔')

    print('[2/3] 指數（Yahoo）...')
    idx = fetch_indexes(snap)

    print('[3/3] 財報（Nasdaq calendar）...')
    earn, earn_n = fetch_earnings(e_date)

    top = build_top(snap)
    breadth = build_breadth(snap)

    data = {
        'session': session,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'timezone': 'ET',
        'source': 'Nasdaq · Yahoo Finance · CNBC',
        'indexes': idx,
        'volume': {
            'metric': 'dollar volume',
            'currency': 'USD',
            'ranked_within': f'all {len(snap)} Nasdaq/NYSE/AMEX listed stocks',
            'rows': top,
        },
        'breadth': breadth,
        'earnings': {'date': e_date, 'rows': earn, 'total': earn_n},
        'handle': '@onepagemarket',
        'disclaimer': 'For informational purposes only. Not investment advice.',
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('OK ->', OUT)
    print(f'  indexes {len(idx)} | volume {len(top)} | breadth {breadth["adv_pct"]}% '
          f'of {breadth["pool"]} (matched {breadth["matched"]}) | earnings {earn_n} filers')


if __name__ == '__main__':
    main()
