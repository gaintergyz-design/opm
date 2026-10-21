#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
發帖到 X：圖片（v2 media upload）+ 文字（v2 tweet create）
  python post_x.py --image out/on-deck-20261020.png --type ondeck [--dry-run]
  python post_x.py --image out/the-close-20261020.png --type theclose --text "..."
費用提醒：pay-per-use，無連結帖子 $0.015/則（媒體上傳另計約 $0.005）
token 過期自動用 refresh_token 續期（offline.access scope）。
"""
import base64, hashlib, hmac, json, os, secrets, subprocess, sys, time
import urllib.parse, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE, 'data', '.x_tokens.json')
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.x')
API = 'https://api.x.com/2'
DRY = '--dry-run' in sys.argv


def env(k, d=''):
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding='utf-8'):
            if line.strip().startswith(k + '='):
                return line.strip().split('=', 1)[1]
    return os.environ.get(k, d)


def load_token():
    if not os.path.exists(TOKEN_FILE):
        print('未授權：先跑 python scripts/x_auth.py login'); sys.exit(1)
    return json.load(open(TOKEN_FILE))


def refresh(tok):
    data = {'grant_type': 'refresh_token', 'refresh_token': tok['refresh_token'],
            'client_id': env('X_CLIENT_ID')}
    req = urllib.request.Request('https://api.x.com/2/oauth2/token',
                                 data=urllib.parse.urlencode(data).encode(), method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req, timeout=30) as r:
        new = json.load(r)
    new['obtained_at'] = int(time.time())
    json.dump(new, open(TOKEN_FILE, 'w'), indent=2)
    os.chmod(TOKEN_FILE, 0o600)
    return new


def oauth1_ready():
    return all(env(k) for k in ('X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'))


def oauth1_header(method, url):
    """OAuth 1.0a 簽名（令牌不過期，適合雲端 CI 定時任務）"""
    p = {
        'oauth_consumer_key': env('X_API_KEY'),
        'oauth_nonce': secrets.token_hex(16),
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': env('X_ACCESS_TOKEN'),
        'oauth_version': '1.0',
    }
    enc = lambda s: urllib.parse.quote(str(s), safe='-._~')
    param_str = '&'.join(f'{enc(k)}={enc(v)}' for k, v in sorted(p.items()))
    base = f'{method}&{enc(url)}&{enc(param_str)}'
    key = f"{enc(env('X_API_SECRET'))}&{enc(env('X_ACCESS_SECRET'))}"
    p['oauth_signature'] = base64.b64encode(
        hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()).decode()
    return 'OAuth ' + ', '.join(f'{enc(k)}="{enc(v)}"' for k, v in sorted(p.items()))


def bearer():
    tok = load_token()
    exp = tok.get('expires_in', 7200)
    age = time.time() - tok.get('obtained_at', 0)
    if age > exp - 120 and tok.get('refresh_token'):
        tok = refresh(tok)
    return tok['access_token']


def upload_image(path, token):
    url = f'{API}/media/upload'
    auth = oauth1_header('POST', url) if token == 'oauth1' else f'Bearer {token}'
    out = subprocess.run([
        'curl', '-s', '-X', 'POST', url,
        '-H', f'Authorization: {auth}',
        '-F', f'media=@{path};type=image/png',
        '-F', 'media_category=tweet_image'], capture_output=True, text=True).stdout
    j = json.loads(out)
    if 'data' not in j:
        print('媒體上傳失敗:', out); sys.exit(1)
    return j['data']['id']


def create_post(text, media_id, token):
    url = f'{API}/tweets'
    body = {'text': text}
    if media_id:
        body['media'] = {'media_ids': [media_id]}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST')
    req.add_header('Authorization',
                   oauth1_header('POST', url) if token == 'oauth1' else f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print('發帖失敗', e.code, e.read().decode()); sys.exit(1)


# ---------- 自動文案 ----------
def caption_for(kind):
    p = os.path.join(BASE, 'data', 'pages.json')
    c = os.path.join(BASE, 'data', 'close.json')
    if kind == 'ondeck' and os.path.exists(p):
        o = json.load(open(p))['ondeck']
        e = o['earnings']
        pre = ', '.join(e['before'][:3]); post = ', '.join(e['after'][:3])
        ev = '; '.join(x['event'] for x in o['econ'][:3]) or 'no major US data'
        return (f"On Deck for today: {ev}. "
                f"{e['total']} companies report — {pre} before the open, "
                f"{post} after the close. 🧵")
    if kind == 'theclose' and os.path.exists(c):
        d = json.load(open(c))
        idx = ' · '.join(f"{i['label'].split(' (')[0]} {i['pct']:+.2f}%"
                         for i in d.get('indexes', []))
        top = (d.get('volume') or {}).get('rows', [])[:3]
        names = ', '.join(r['ticker'] for r in top)
        return (f"The Close: {idx}. Most traded: {names}. Breadth "
                f"{(d.get('breadth') or {}).get('adv_pct', '—')}% advancers. 🧵")
    return ''


def data_session():
    """當前數據對應的交易日（用來檢查文案與圖片是否同一天）"""
    import json as _j
    for f, key in (('close.json', None), ('pages.json', 'ondeck')):
        path = os.path.join(BASE, 'data', f)
        if not os.path.exists(path):
            continue
        try:
            d = _j.load(open(path))
        except Exception:
            continue
        if f == 'close.json' and d.get('session'):
            return d['session']
        if key and (d.get(key) or {}).get('session'):
            return d[key]['session']
    return None


def image_date(image):
    """the-close-20261020.png → 2026-10-20"""
    import re as _re
    m = _re.search(r'(\d{8})\d*(\.png)$', os.path.basename(image or ''))
    if not m:
        return None
    t = m.group(1)
    return f'{t[:4]}-{t[4:6]}-{t[6:]}'


def main():
    args = sys.argv[1:]
    def opt(name, d=None):
        return args[args.index(name) + 1] if name in args else d
    image = opt('--image')
    kind = opt('--type', '')
    text = opt('--text') or caption_for(kind)
    if not text:
        print('缺文案：--text 或 --type ondeck/theclose'); sys.exit(1)
    if len(text) > 280:
        text = text[:277] + '...'

    # 只出文案（手動發帖模式）：寫成 txt 供複製，不需要任何憑證
    if '--caption-only' in args:
        ds, idate = data_session(), image_date(image)
        if image and ds and idate and ds != idate:
            print(f'⚠️ 數據日期 {ds} 與圖片日期 {idate} 不符，跳過文案生成')
            return
        out_dir = os.path.join(BASE, 'out')
        os.makedirs(out_dir, exist_ok=True)
        stem = os.path.splitext(os.path.basename(image or kind))[0]
        path = os.path.join(out_dir, f'caption-{stem}.txt')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
        print('文案已存：', path)
        print('—' * 28)
        print(text)
        return

    print('將發帖：', text)
    if not image:
        print('（純文字帖）')
    if DRY:
        print('[dry-run] 未實際發送'); return

    # 有 OAuth1 憑證就用 OAuth1（不過期，CI 友好）；否則用 OAuth2 用戶令牌
    token = 'oauth1' if oauth1_ready() else bearer()
    mid = upload_image(image, token) if image else None
    r = create_post(text, mid, token)
    print('OK ->', json.dumps(r.get('data', r), ensure_ascii=False))


if __name__ == '__main__':
    main()
