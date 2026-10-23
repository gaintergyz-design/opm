#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
The Close 數據抓取 → data/close.json

數據源（全部權威公開源，無需 API key）：
  · 成交額榜   東方財富美股榜（push2 clist，fid=f6 排序）
               f6 = 當日**真實成交額**（Σ 每筆成交價 × 股數，即 volume × VWAP），
               不是 price × 收盤價 的估算值。已與 Nasdaq 官方歷史（收盤 × 成交量）
               及富途盤後成交額榜三方核對，數字一致。
  · 交易日     東方財富 SPY 日 K 最後一根的日期（不依賴本機時鐘，避免未收盤 / 假日誤標）
  · 指數       東方財富 → Yahoo chart → Yahoo spark → CNBC → Nasdaq 官方
               （逐級降級；全部取不到就中止出圖，絕不用自算值代替官方數據）
  · 英文名     Nasdaq screener（只取 name 作顯示與 ETF 排除，取不到不影響出圖）

⚠️ 2026-10-22 踩坑：Nasdaq screener 的 `download=true` 全市場快照會**落後一個交易日**
   （回 10-21 的價量，卻被 session=now 標成 10-22），再加上 `price × volume` 是估算，
   兩個錯誤疊加 → 卡片與富途完全對不上（SPCX 顯示 159.31 / +7.79%，實際 144.75 / −9.14%）。
   現已全面改用東方財富真實成交額 + SPY 日 K 定交易日。

用法：
  python fetch_close.py
  python fetch_close.py --session 2026-10-22
"""
import json, os, subprocess, argparse, time
import urllib.parse
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'close.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

TOP_N = 20
# OPM 卡統一聲明（2026-10-23 阿澤定稿）——與 scripts/lib/disclaimer.js 保持一字不差
DISCLAIMER = (
    'For informational purposes only. Not investment advice. The relevant data and content '
    'are obtained from public sources and for reference only. All third-party trademarks, '
    'brand names and logos displayed are for identification purposes only and remain the '
    'property of their respective owners.'
)
NASDAQ = 'https://api.nasdaq.com/api'
EM_UT = 'fa5fd1943c7b386f172d6893dbfba10b'
EM_CLIST = 'https://push2.eastmoney.com/api/qt/clist/get'
EM_KLINE = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'
EM_GET = 'https://push2.eastmoney.com/api/qt/stock/get'

# 美股全市場（105 納斯達克 / 106 NYSE / 107 AMEX-Arca）
EM_FS = 'm:105,m:106,m:107'

INDEX_LIST = [('^GSPC', 'S&P 500'), ('^IXIC', 'Nasdaq'), ('^RUT', 'Russell 2000')]
YH_HOSTS = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']

# 排除 ETF / ETN / 基金 / 信託（卡片只講個股）
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


# ---------------- 交易日（東方財富 SPY 日 K） ----------------
def latest_session():
    """SPY 日 K 最後一根的日期 = 最新已收盤交易日。
    比本機時鐘可靠：ET 16:00 前跑、或假日跑，時鐘日期都會標錯。"""
    j = jget(f'{EM_KLINE}?secid=107.SPY&ut={EM_UT}&klt=101&fqt=1&lmt=1'
             f'&end=20500101&fields1=f1&fields2=f51,f53', retries=2, timeout=25)
    kl = ((j.get('data') or {}).get('klines') or [])
    if kl:
        return kl[-1].split(',')[0]
    return None


def session_from_clock():
    """日 K 取不到時的備援：ET 16:00 前算前一交易日"""
    from zoneinfo import ZoneInfo
    now_et = datetime.now(ZoneInfo('America/New_York'))
    d = now_et.date()
    if now_et.hour < 16:
        d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.strftime('%Y-%m-%d')


# ---------------- 成交額榜（東方財富真實成交額） ----------------
def em_rank(max_pages=3, page_size=100):
    """回傳 (rows, total)。rows 已按 f6 由大到小排。
    f2 現價 / f3 漲跌幅 / f5 成交量 / f6 成交額 / f12 代碼 / f13 市場 / f14 中文名"""
    out, total = [], 0
    for pn in range(1, max_pages + 1):
        url = (f'{EM_CLIST}?pn={pn}&pz={page_size}&po=1&np=1&ut={EM_UT}'
               f'&fltt=2&invt=2&fid=f6&fs={EM_FS}'
               '&fields=f2,f3,f5,f6,f12,f13,f14')
        d = jget(url, retries=2, timeout=30)
        data = d.get('data') or {}
        diff = data.get('diff') or []
        total = data.get('total') or total
        if not diff:
            break
        out += diff
        if len(out) >= min(total, TOP_N * 6):
            break
    return out, total


def build_top(em_rows, names):
    """按真實成交額排出 Top 20 個股（同名字典只作英文顯示 + ETF 排除）"""
    rows, seen = [], set()
    for r in em_rows:
        sym = str(r.get('f12') or '').strip().upper()
        amt, last, pct = r.get('f6'), r.get('f2'), r.get('f3')
        if not sym or sym in seen:
            continue
        # 停牌 / 無報價時 f2/f3 會回 '-'（字串），直接跳過，不補 0
        if not all(isinstance(v, (int, float)) for v in (amt, last, pct)):
            continue
        if amt <= 0:
            continue
        en = (names.get(sym) or '').strip()
        cn = (r.get('f14') or '').strip()
        if any(k.lower() in en.lower() for k in EXCLUDE_KEYS):
            continue
        if any(k in cn.upper() for k in ('ETF', 'ETN')):
            continue
        seen.add(sym)
        rows.append({
            'ticker': sym,
            'name': en or cn,
            'last': round(float(last), 2),
            'pct': round(float(pct), 2),
            'dollar_volume': round(float(amt)),
            'volume': int(r['f5']) if isinstance(r.get('f5'), (int, float)) else None,
        })
        if len(rows) >= TOP_N:
            break
    return rows


# ---------------- 英文名（Nasdaq screener，可缺） ----------------
def fetch_names():
    """只取 symbol → 英文公司名。這份快照的價量會落後一個交易日，
    所以**只用 name**（名稱是靜態資料），價量一律用東方財富。"""
    j = jget(f'{NASDAQ}/screener/stocks?tableonly=true&limit=10000&offset=0&download=true',
             retries=1, timeout=40)
    out = {}
    for r in ((j.get('data') or {}).get('rows') or []):
        s = r.get('symbol')
        if s:
            out[s] = r.get('name') or ''
    return out


# ---------------- 指數 ----------------
EM_INDEX = {'^GSPC': '100.SPX', '^IXIC': '100.NDX'}   # Russell 2000 東財沒有


def em_index(sym):
    sec = EM_INDEX.get(sym)
    if not sec:
        return None
    d = jget(f'{EM_GET}?secid={sec}&ut={EM_UT}&fltt=2&invt=2'
             '&fields=f43,f58,f60,f170', retries=1, timeout=20)
    data = d.get('data') or {}
    last, prev, pct = data.get('f43'), data.get('f60'), data.get('f170')
    if not all(isinstance(v, (int, float)) for v in (last, prev, pct)):
        return None
    return {'last': round(last, 2), 'prev_close': round(prev, 2), 'pct': round(pct, 2)}


def nasdaq_index(sym):
    d = jget(f'{NASDAQ}/quote/{sym}/info?assetclass=index', retries=1, timeout=15)
    pd_ = ((d.get('data') or {}).get('primaryData') or {})
    last = money(pd_.get('lastSalePrice'))
    chg = money(pd_.get('percentageChange'))
    if last is None or chg is None:
        return None
    prev = round(last / (1 + chg / 100), 2)
    return {'last': last, 'prev_close': prev, 'pct': round(chg, 2)}


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


# 備援源：Nasdaq 官方指數報價（僅 Composite 有；SPX/RUT 該端點不提供）
NDAQ_INDEX = {'^IXIC': 'COMP'}
# 備援源：CNBC restQuote（Comstock 資料源，與 Yahoo/Nasdaq 完全獨立）
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
        # 線 1：東方財富（與成交額榜同一數據源，口徑最一致）
        e = em_index(sym)
        if e:
            out.append({'label': label, **e, 'src': 'eastmoney'})
            continue
        # 線 2/3：Yahoo chart（雙主機輪替）
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
        # 線 4：Yahoo spark（限流獨立的 Yahoo 端點）
        sp = spark_indexes([sym]).get(sym)
        if sp:
            last, pct = sp
            out.append({'label': label, 'last': last, 'prev_close': None, 'pct': pct,
                        'src': 'yahoo-spark'})
            continue
        # 線 5：CNBC restQuote（獨立資料源，三檔齊全）
        c = cnbc_quotes().get(CNBC_MAP.get(sym))
        if c:
            out.append({'label': label, **c, 'src': 'cnbc'})
            continue
        # 線 6：Nasdaq 官方指數報價
        nd = NDAQ_INDEX.get(sym)
        if nd:
            n = nasdaq_index(nd)
            if n:
                out.append({'label': label, **n, 'src': 'nasdaq'})
                continue
        # 全部線路失敗：中止產圖——只用官方數據，絕不自己估算（2026-10-21 阿澤欽定）
        tried = ' → '.join(['東方財富', 'Yahoo-chart', 'Yahoo-spark', 'CNBC'] +
                           (['Nasdaq-official'] if NDAQ_INDEX.get(sym) else []))
        raise SystemExit(f'FATAL: {label} 所有數據源均取不到（已試：{tried}），'
                         f'中止出圖，不使用估算值。請稍後重跑。')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', default='')
    args = ap.parse_args()

    print('[1/4] 最新交易日（東方財富 SPY 日 K）...')
    session = args.session or latest_session()
    if not session:
        session = session_from_clock()
        print(f'    ⚠️ 日 K 取不到，退回本機時鐘推算：{session}')
    else:
        print(f'    {session}')

    print('[2/4] 成交額榜（東方財富真實成交額）...')
    em_rows, total = em_rank()
    if not em_rows:
        raise SystemExit('FATAL: 東方財富成交額榜為空，中止（不覆蓋既有 close.json）')
    print(f'    取回 {len(em_rows)} 檔 / 全市場 {total} 檔')

    print('[3/4] 英文名對照（Nasdaq screener，僅取 name）...')
    names = fetch_names()
    print(f'    {len(names)} 檔' if names else '    ⚠️ 取不到，改用中文名顯示')

    print('[4/4] 指數...')
    idx = fetch_indexes()

    top = build_top(em_rows, names)
    if len(top) < TOP_N:
        print(f'    ⚠️ 只湊到 {len(top)} 個非 ETF 個股（目標 {TOP_N}）——成交額榜頁數可能不足')

    data = {
        'session': session,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'timezone': 'ET',
        'source': '東方財富 · Nasdaq',
        'indexes': idx,
        'volume': {
            'metric': 'turnover',
            'metric_note': 'actual traded value (Σ price × shares), not price × volume',
            'currency': 'USD',
            'ranked_within': f'all {total:,} US-listed stocks (Nasdaq/NYSE/AMEX)',
            'rows': top,
        },
        'handle': '@onepagemarket',
        'disclaimer': DISCLAIMER,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('OK ->', OUT)
    print(f'  session {session} | indexes {len(idx)} | rows {len(top)} '
          f'| #1 {top[0]["ticker"]} {top[0]["dollar_volume"]/1e9:.1f}B {top[0]["pct"]:+.2f}%'
          if top else f'session {session} | rows 0')


if __name__ == '__main__':
    main()
