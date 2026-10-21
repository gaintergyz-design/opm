#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
X OAuth 2.0 (PKCE) 用戶上下文授權 → 存 token 到 data/.x_tokens.json
用法：
  1) python x_auth.py login          # 印出授權 URL，瀏覽器打開並授權
  2) 授權後瀏覽器跳轉到 callback（沒開 server 會顯示錯誤頁，正常）
  3) python x_auth.py callback "<貼上完整 callback URL>"
憑證來源（優先級）：環境變數 X_CLIENT_ID / X_CLIENT_SECRET 或 scripts/.env.x
"""
import base64, hashlib, json, os, secrets, sys, urllib.parse, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE, 'data', '.x_tokens.json')
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.x')
AUTH_URL = 'https://x.com/i/oauth2/authorize'
TOKEN_URL = 'https://api.x.com/2/oauth2/token'
SCOPES = 'tweet.read tweet.write users.read offline.access media.write'


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    env.setdefault('X_CLIENT_ID', os.environ.get('X_CLIENT_ID', ''))
    env.setdefault('X_CLIENT_SECRET', os.environ.get('X_CLIENT_SECRET', ''))
    env.setdefault('X_REDIRECT_URI', os.environ.get('X_REDIRECT_URI', 'http://localhost:8791/callback'))
    return env


def save(obj):
    with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=2)
    os.chmod(TOKEN_FILE, 0o600)


def http_post_form(url, data, auth=None):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(),
                                 method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    if auth:
        req.add_header('Authorization', 'Basic ' + base64.b64encode(
            f'{auth[0]}:{auth[1]}'.encode()).decode())
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print('ERROR', e.code, e.read().decode())
        sys.exit(1)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    env = load_env()
    if not env['X_CLIENT_ID']:
        print('缺少 X_CLIENT_ID：請先在 developer.x.com 建 App，'
              f'然後寫入 {ENV_FILE}（X_CLIENT_ID=... / X_CLIENT_SECRET=...）')
        sys.exit(1)

    if cmd == 'login':
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
        state = secrets.token_urlsafe(16)
        save({'verifier': verifier, 'state': state, 'pending': True})
        q = urllib.parse.urlencode({
            'response_type': 'code',
            'client_id': env['X_CLIENT_ID'],
            'redirect_uri': env['X_REDIRECT_URI'],
            'scope': SCOPES,
            'state': state,
            'code_challenge': challenge,
            'code_challenge_method': 'S256',
        })
        print('\n1. 瀏覽器打開：\n')
        print(f'{AUTH_URL}?{q}\n')
        print(f'2. 授權後，把跳轉的完整 URL 貼給：python x_auth.py callback "<URL>"\n')

    elif cmd == 'callback':
        url = sys.argv[2]
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        st = json.load(open(TOKEN_FILE))
        if q.get('state', [''])[0] != st.get('state'):
            print('state 不符，拒絕'); sys.exit(1)
        code = q.get('code', [''])[0]
        data = {'grant_type': 'authorization_code', 'code': code,
                'redirect_uri': env['X_REDIRECT_URI'],
                'code_verifier': st['verifier'],
                'client_id': env['X_CLIENT_ID']}
        auth = (env['X_CLIENT_ID'], env['X_CLIENT_SECRET']) if env['X_CLIENT_SECRET'] else None
        tok = http_post_form(TOKEN_URL, data, auth)
        tok['obtained_at'] = int(__import__('time').time())
        tok.pop('verifier', None); tok.pop('state', None); tok.pop('pending', None)
        save(tok)
        print('OK：token 已存到', TOKEN_FILE)

    else:
        print(__doc__)


if __name__ == '__main__':
    main()
