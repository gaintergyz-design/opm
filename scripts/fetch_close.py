#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
The Close 數據抓取 → data/close.json

數據源（全部權威公開源，無需 API key，**不用東方財富**——
2026-10-26 阿澤欽定：OPM 全產線棄用東方財富數據）：
  · 交易日     Yahoo Finance 日 K（SPY → ^GSPC 逐級降級）：最後一根有收盤價的
               K 線日期 = 最新已收盤交易日（不依賴本機時鐘，避免未收盤/假日誤標）
  · 成交量榜   Yahoo Finance screener（POST /v1/finance/screener，cookie+crumb）：
               美股三大交易所（Nasdaq/NYSE/AMEX）+ 市值 > $20 億過濾，
               按當日成交量取前 100 檔，再按**官方收盤價 × 官方成交量**重排取 Top 20。
               與東方財富真實成交額核對過（MU/NVDA 偏差 <1%），排名口徑一致。
  · 指數       Yahoo chart → Yahoo spark → CNBC → Nasdaq 官方
               （逐級降級；全部取不到就中止出圖，絕不用自算值代替官方數據）
  · 英文名     Nasdaq screener（只取 name 作顯示，取不到不影響出圖）

⚠️ 歷史踩坑：
  · 2026-10-22：Nasdaq screener `download=true` 全市場快照會落後一個交易日，
    且價量是靜態快照 → 卡片與富途對不上。改用 screener 即時端點無此問題
    （regularMarketPrice/regularMarketVolume 為交易所官方即時口徑）。
  · 2026-10-23 08:37 UTC（北京 10-24 凌晨）起：東方財富接口在 GitHub Actions
    runner 上連續回空（本機正常）→ 判定為 runner IP 被擋，三天補跑均失敗，
    這是 The Close 連續缺卡的根因。2026-10-26 全線改 Yahoo，本文件不再有任何
    東方財富端點。

用法：
  python fetch_close.py
  python fetch_close.py --session 2026-10-23
"""
import json, os, subprocess, argparse, time
import urllib.parse
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'close.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
# ⚠️ Yahoo 按 User-Agent 指紋限流（429）：長 UA（帶 Chrome/124 字樣）2026-10-26 被拉黑，
#    短 UA 正常。若再遇 429，優先換 UA 而不是加等待。
JAR = '/tmp/.opm_yh_cookie'

TOP_N = 20
# OPM 卡統一聲明（2026-10-23 阿澤定稿）——與 scripts/lib/disclaimer.js 保持一字不差
DISCLAIMER = (
    'For informational purposes only. Not investment advice. The relevant data and content '
    'are obtained from public sources and for reference only. All third-party trademarks, '
    'brand names and logos displayed are for identification purposes only and remain the '
    'property of their respective owners.'
)
NASDAQ = 'https://api.nasdaq.com/api'
YH_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']

# Yahoo screener 過濾條件：美股三大交易所 + 市值 > $2B（殺掉 OTC/仙股噪聲）
YH_EXCHANGES = ['NMS', 'NYQ', 'ASE']          # Nasdaq / NYSE / AMEX(NYSE American)
YH_MIN_MCAP = 2_000_000_000

# 排除 ETF / ETN / 基金 / 信託（卡片只講個股）
EXCLUDE_KEYS = ['ETF', 'ETN', 'Fund', 'Trust', 'Index Fund']

INDEX_LIST = [('^GSPC', 'S&P 500'), ('^IXIC', 'Nasdaq'), ('^RUT', 'Russell 2000')]


def curl(url, timeout=25, accept_json=True):
    cmd = ['curl', '-s', '--max-time', str(timeout), '-H', f'User-Agent: {UA}']
    if accept_json:
        cmd += ['-H', 'Accept: application/json']
    cmd.append(url)
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def curl_post(url, body, timeout=40, accept_json=True):
    cmd = ['curl', '-s', '--max-time', str(timeout), '-H', f'User-Agent: {UA}']
    if accept_json:
        cmd += ['-H', 'Accept: application/json']
    cmd += ['-H', 'Content-Type: application/json', '--data-binary', body, url]
    # 必須帶 cookie：crumb 與 cookie 綁定，缺 cookie 必報 Invalid Crumb
    if os.path.exists(JAR):
        cmd[1:1] = ['-b', JAR]
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


def jpost(url, body, retries=3, **kw):
    wait = 4
    for i in range(retries + 1):
        t = (curl_post(url, body, **kw) or '').strip()
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


# ---------------- 交易日（Yahoo 日 K：SPY → ^GSPC） ----------------
def latest_session():
    """最後一根有收盤價的日 K 日期 = 最新已收盤交易日。
    比本機時鐘可靠：ET 16:00 前跑、或假日跑，時鐘日期都會標錯。"""
    for sym in ('SPY', '^GSPC'):
        for host in YH_HOSTS:
            d = jget(f'https://{host}/v8/finance/chart/{urllib.parse.quote(sym)}'
                     '?range=5d&interval=1d', retries=1, timeout=25)
            res = (d.get('chart') or {}).get('result') or []
            if not res:
                continue
            r = res[0]
            ts = r.get('timestamp') or []
            cl = ((r.get('indicators') or {}).get('quote') or [{}])[0].get('close') or []
            pts = [t for t, c in zip(ts, cl) if isinstance(c, (int, float))]
            if pts:
                return datetime.fromtimestamp(pts[-1], ZoneInfo('America/New_York')) \
                    .strftime('%Y-%m-%d')
    return None


def session_from_clock():
    """日 K 取不到時的備援：ET 16:00 前算前一交易日"""
    now_et = datetime.now(ZoneInfo('America/New_York'))
    d = now_et.date()
    if now_et.hour < 16:
        d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.strftime('%Y-%m-%d')


# ---------------- 成交量榜（Yahoo screener，cookie + crumb） ----------------
def yh_crumb(retries=4):
    """Yahoo 新版 screener 需 cookie + crumb；fc.yahoo.com 發 cookie（404 屬正常）。
    crumb 與 cookie 綁定——fc.yahoo.com 偶發不下發 cookie 時 getcrumb 仍會回串，
    但 POST 會報 Invalid Crumb，所以這裡校驗 jar 裡必須有 A1/A3 cookie。"""
    for i in range(retries):
        try:
            os.remove(JAR)
        except OSError:
            pass
        subprocess.run(['curl', '-s', '--max-time', '15', '-c', JAR, '-A', UA,
                        'https://fc.yahoo.com'], capture_output=True, text=True)
        jar = ''
        try:
            jar = open(JAR, encoding='utf-8', errors='replace').read()
        except OSError:
            pass
        if 'A1' not in jar and 'A3' not in jar:
            time.sleep(3)
            continue
        r = subprocess.run(['curl', '-s', '--max-time', '15', '-b', JAR, '-c', JAR,
                            '-A', UA, 'https://query1.finance.yahoo.com/v1/test/getcrumb'],
                           capture_output=True, text=True)
        crumb = (r.stdout or '').strip()
        # crumb 是短 alphanumeric 串；拿到 HTML/錯誤頁就直接重試
        if crumb and len(crumb) < 64 and all(ch.isalnum() or ch in '~_-.' for ch in crumb):
            return crumb
        time.sleep(3)
    return None


def yh_rank(size=100):
    """三大交易所 + 市值過濾，按當日成交量取前 size 檔。
    回傳 quote 列表（symbol/shortName/regularMarketPrice/regularMarketVolume/
    regularMarketChangePercent），價量為 Yahoo（交易所官方）口徑。
    Invalid Crumb / 空結果 → 重取 cookie+crumb 整套重試。"""
    body = json.dumps({
        'size': size, 'offset': 0, 'sortField': 'dayvolume', 'sortType': 'DESC',
        'quoteType': 'equity',
        'query': {'operator': 'and', 'operands': [
            {'operator': 'or', 'operands': [
                {'operator': 'eq', 'operands': ['exchange', ex]} for ex in YH_EXCHANGES]},
            {'operator': 'gt', 'operands': ['intradaymarketcap', YH_MIN_MCAP]}]},
        'userId': '', 'userIdType': 'guid'})
    for attempt in range(3):
        crumb = yh_crumb()
        if not crumb:
            print('    · 取不到 crumb，重試…')
            continue
        got_any = False
        for host in YH_HOSTS:
            url = f'https://{host}/v1/finance/screener?crumb={urllib.parse.quote(crumb)}'
            d = jpost(url, body, retries=2, timeout=40)
            q = ((d.get('finance') or {}).get('result') or [])
            err = ((d.get('finance') or {}).get('error') or {}).get('description')
            rows = (q[0].get('quotes') or []) if q else []
            if rows:
                return rows
            if err:
                print(f'    · {host}: {err}')
            else:
                print(f'    · {host} screener 為空')
            got_any = got_any or bool(err)
        # Invalid Crumb → 換一套 cookie+crumb 整套重來；真限流也靠外層重試緩衝
        if got_any or attempt < 2:
            time.sleep(3)
    return []


def build_top(yh_rows):
    """按官方價 × 官方成交量（≈成交額）重排取 Top 20。
    排除 ETF/信託；停牌/缺價量的直接跳過，不補 0。"""
    cand, seen = [], set()
    for r in yh_rows:
        sym = str(r.get('symbol') or '').strip().upper()
        last = r.get('regularMarketPrice')
        vol = r.get('regularMarketVolume')
        pct = r.get('regularMarketChangePercent')
        if not sym or sym in seen:
            continue
        if not all(isinstance(v, (int, float)) for v in (last, vol, pct)):
            continue
        if last <= 0 or vol <= 0:
            continue
        name = (r.get('shortName') or r.get('longName') or '').strip()
        if any(k.lower() in name.lower() for k in EXCLUDE_KEYS):
            continue
        seen.add(sym)
        cand.append({
            'ticker': sym,
            'name': name,
            'last': round(float(last), 2),
            'pct': round(float(pct), 2),
            'dollar_volume': round(float(last) * float(vol)),
            'volume': int(vol),
        })
    cand.sort(key=lambda x: x['dollar_volume'], reverse=True)
    return cand[:TOP_N]


# ---------------- 英文名（Nasdaq screener，可缺） ----------------
def fetch_names():
    """只取 symbol → 英文公司名（優先於 Yahoo shortName 顯示）。
    這份快照的價量會落後一個交易日，所以**只用 name**（名稱是靜態資料）。"""
    j = jget(f'{NASDAQ}/screener/stocks?tableonly=true&limit=10000&offset=0&download=true',
             retries=1, timeout=40)
    out = {}
    for r in ((j.get('data') or {}).get('rows') or []):
        s = r.get('symbol')
        if s:
            out[s] = r.get('name') or ''
    return out


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
        raise SystemExit(f'FATAL: {label} 所有數據源均取不到（已試：'
                         f'Yahoo-chart → Yahoo-spark → CNBC → Nasdaq-official），'
                         f'中止出圖，不使用估算值。請稍後重跑。')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', default='')
    args = ap.parse_args()

    print('[1/4] 最新交易日（Yahoo 日 K：SPY → ^GSPC）...')
    session = args.session or latest_session()
    if not session:
        session = session_from_clock()
        print(f'    ⚠️ 日 K 取不到，退回本機時鐘推算：{session}')
    else:
        print(f'    {session}')

    print('[2/4] 成交量榜（Yahoo screener：三大交易所 + 市值>$2B，價×量重排）...')
    yh_rows = yh_rank()
    if not yh_rows:
        raise SystemExit('FATAL: Yahoo 成交量榜為空，中止（不覆蓋既有 close.json）')
    print(f'    取回 {len(yh_rows)} 檔')

    print('[3/4] 英文名對照（Nasdaq screener，僅取 name）...')
    names = fetch_names()
    print(f'    {len(names)} 檔' if names else '    ⚠️ 取不到，改用 Yahoo shortName 顯示')

    print('[4/4] 指數...')
    idx = fetch_indexes()

    top = build_top(yh_rows)
    for r in top:
        en = (names.get(r['ticker']) or '').strip()
        if en:
            r['name'] = en
    if len(top) < TOP_N:
        print(f'    ⚠️ 只湊到 {len(top)} 個非 ETF 個股（目標 {TOP_N}）——榜單可能不足')

    data = {
        'session': session,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'timezone': 'ET',
        'source': 'Yahoo Finance · Nasdaq',
        'indexes': idx,
        'volume': {
            'metric': 'close_x_volume',
            'metric_note': 'official close price × official volume (Yahoo Finance), '
                           'cross-checked against real traded value (±1%)',
            'currency': 'USD',
            'ranked_within': f'top {len(yh_rows)} most-traded stocks on '
                             'Nasdaq/NYSE/AMEX (market cap > $2B)',
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
