#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""市值 Top 10 抓取 → data/top10-cap.json
Yahoo screener（cookie+crumb，同 fetch_close.py 口徑）：
三大交易所 + intradaymarketcap 降序；合併同股雙類（GOOG/GOOGL、BRK-A/BRK-B）。
"""
import json, os, subprocess, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'top10-cap.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
JAR = '/tmp/.opm_yh_cookie'
HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']
EXCH = ['NMS', 'NYQ', 'ASE']


def curl_post(url, body, timeout=40):
    cmd = ['curl', '-s', '-S', '--max-time', str(timeout), '-H', f'User-Agent: {UA}',
           '-H', 'Accept: application/json', '-H', 'Content-Type: application/json',
           '--data-binary', body]
    if os.path.exists(JAR):
        cmd[1:1] = ['-b', JAR]
    r = subprocess.run(cmd + [url], capture_output=True, text=True)
    if r.returncode != 0:
        print('  curl err', r.returncode, (r.stderr or '')[:200])
    return r.stdout


def yh_crumb(retries=4):
    for i in range(retries):
        try:
            os.remove(JAR)
        except OSError:
            pass
        subprocess.run(['curl', '-s', '--max-time', '15', '-c', JAR, '-A', UA,
                        'https://fc.yahoo.com'], capture_output=True, text=True)
        jar = ''
        try:
            open(JAR, encoding='utf-8', errors='replace').read()
        except OSError:
            pass
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
        if crumb and len(crumb) < 64 and all(ch.isalnum() or ch in '~_-.' for ch in crumb):
            return crumb
        time.sleep(3)
    return None


def screener_top(size=60):
    body = json.dumps({
        'size': size, 'offset': 0, 'sortField': 'intradaymarketcap', 'sortType': 'DESC',
        'quoteType': 'equity',
        'query': {'operator': 'and', 'operands': [
            {'operator': 'or', 'operands': [
                {'operator': 'eq', 'operands': ['exchange', ex]} for ex in EXCH]},
            {'operator': 'gt', 'operands': ['intradaymarketcap', 100_000_000_000]}]},
        'userId': '', 'userIdType': 'guid'})
    for attempt in range(3):
        crumb = yh_crumb()
        if not crumb:
            time.sleep(5)
            continue
        for host in HOSTS:
            t = curl_post(f'https://{host}/v1/finance/screener?crumb={crumb}&formatted=false',
                          body).strip()
            print(f'  [{host}] resp len={len(t)} head={t[:120]!r}')
            if t.startswith('{'):
                d = json.loads(t)
                rows = ((d.get('finance') or {}).get('result') or [{}])[0].get('quotes') or []
                if rows:
                    return rows
        time.sleep(5)
    return []


rows = screener_top()
if not rows:
    raise SystemExit('FATAL: screener 全線失敗')

# 同股雙類合併：取同前綴（GOOG/GOOGL、BRK-A/BRK-B）市值較高的那檔
seen, out = {}, []
for r in rows:
    s = r.get('symbol') or ''
    cap = r.get('marketCap') or r.get('intradaymarketcap') or 0
    name = r.get('shortName') or s
    if not cap or not s:
        continue
    base = s.rstrip('AB-').rstrip('-') if s.endswith(('A', 'B')) else s
    # GOOGL/GOOG、BRK-B/BRK-A：同一公司保留市值較大條目
    group = {'GOOGL': 'GOOGL', 'GOOG': 'GOOGL', 'BRK-B': 'BRK', 'BRK-A': 'BRK'}.get(s, s)
    if group in seen:
        continue
    seen[group] = True
    out.append({'ticker': s, 'name': name, 'mcap': cap})
    if len(out) >= 12:
        break

for i, r in enumerate(out, 1):
    print(f"{i:2}. {r['ticker']:6} {r['name']:22} ${r['mcap']/1e12:.3f}T")

json.dump({'rows': out}, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('saved ->', OUT)
