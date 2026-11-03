#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全量重建線上畫廊索引（本機 out/ 只是部分鏡像，直接跑 build_gallery 會刷掉舊卡）

問題：build_gallery.py 掃 out/*.png 全量重寫 docs/index.html。本機 out/ 只留
      當次渲染的一兩張卡，若直接在本機重建再推 index.html，畫廊上 70 多張舊卡
      會整批消失（2026-10-23 就是這樣掉過卡）。

做法：① 從遠端倉庫 out/ 補齊本機缺的 PNG 與 caption-*.txt（只抓缺的）
      ② 補齊 out/gen-times.json（遠端 ∪ 本地）
      ③ 跑 scripts/build_gallery.py
      ④ 推 docs/index.html + docs/img/ 下新增的 PNG

用法：
  python3 scripts/rebuild_gallery_remote.py            # 同步 + 重建 + 推送
  python3 scripts/rebuild_gallery_remote.py --no-push  # 只重建，不推
  python3 scripts/rebuild_gallery_remote.py --files out/earnings-x-20261102.png ...  # 只推指定 docs 檔

Token 來源同 push_local.py（GH_TOKEN 或鑰匙串 opm-gh-token）。
"""
import base64, json, os, subprocess, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OWNER, REPO, BRANCH = 'gaintergyz-design', 'opm', 'main'
API = 'https://api.github.com'


def token():
    t = os.environ.get('GH_TOKEN', '').strip()
    if t:
        return t
    r = subprocess.run(['security', 'find-generic-password', '-s', 'opm-gh-token', '-w'],
                       capture_output=True, text=True)
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip()
    sys.exit('FATAL: 找不到 GitHub token（GH_TOKEN 或鑰匙串 opm-gh-token）')


TOKEN = token()


def call(method, path, payload=None, raw=False):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    req.add_header('User-Agent', 'opm-gallery-sync')
    if data:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            b = r.read()
            return b if raw else json.loads(b.decode() or '{}')
    except urllib.error.HTTPError as e:
        sys.exit(f'FATAL: {method} {path} → HTTP {e.code}\n{e.read().decode()[:400]}')


def list_remote_out():
    items = call('GET', f'/repos/{OWNER}/{REPO}/contents/out')
    return [f for f in items if f['type'] == 'file']


def sync():
    items = list_remote_out()
    want = [f for f in items if f['name'].endswith('.png') or f['name'].startswith('caption-')]
    missing = [f for f in want if not os.path.exists(os.path.join(BASE, 'out', f['name']))]
    print(f'遠端 out/：{len(items)} 檔（{len(want)} 需同步）· 本機缺 {len(missing)}')

    os.makedirs(os.path.join(BASE, 'out'), exist_ok=True)

    def grab(f):
        blob = call('GET', f"/repos/{OWNER}/{REPO}/git/blobs/{f['sha']}", raw=True)
        data = base64.b64decode(json.loads(blob.decode())['content'])
        open(os.path.join(BASE, 'out', f['name']), 'wb').write(data)
        return f['name'], len(data)

    if missing:
        with ThreadPoolExecutor(max_workers=8) as ex:
            for i, (n, sz) in enumerate(ex.map(grab, missing), 1):
                print(f'  [{i}/{len(missing)}] {n} ({sz//1024} KB)')

    # gen-times.json：遠端 ∪ 本地（本地較新的覆蓋）
    gt = next((f for f in items if f['name'] == 'gen-times.json'), None)
    if gt:
        blob = json.loads(call('GET', f"/repos/{OWNER}/{REPO}/git/blobs/{gt['sha']}", raw=True).decode())
        remote = json.loads(base64.b64decode(blob['content']))
        p = os.path.join(BASE, 'out', 'gen-times.json')
        local = json.load(open(p)) if os.path.exists(p) else {}
        merged = dict(remote)
        merged.update(local)
        json.dump(merged, open(p, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
        print(f'gen-times：遠端 {len(remote)} ∪ 本地 {len(local)} → {len(merged)}')


def fetch_git_times():
    """用 GitHub REST API 取每張圖「最後一次提交時間」，寫 out/git-times.json。

    為什麼需要：build_gallery.py 原本靠 `git log`，本機 git 壞掉時取不到時間，
    會退回 mtime（＝本次下載時刻）→ 全頁時間一起錯。這張對照表讓本機重建
    也能拿到和 CI 一致的時間。
    """
    from datetime import datetime, timezone
    items = [f for f in list_remote_out() if f['name'].endswith('.png')]
    print(f'取提交時間：{len(items)} 張')

    def one(f):
        p = f"/repos/{OWNER}/{REPO}/commits?path=out/{f['name']}&per_page=1"
        cs = call('GET', p)
        if not cs:
            return None
        iso = cs[0]['commit']['committer']['date']
        ep = int(datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ')
                 .replace(tzinfo=timezone.utc).timestamp())
        local = os.path.join(BASE, 'out', f['name'])
        if os.path.exists(local):
            os.utime(local, (ep, ep))       # mtime 也對齊，避免二次誤判
        return f"out/{f['name']}", ep

    out = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for r in ex.map(one, items):
            if r:
                out[r[0]] = r[1]
    json.dump(out, open(os.path.join(BASE, 'out', 'git-times.json'), 'w'),
              ensure_ascii=False, indent=0, sort_keys=True)
    print(f'git-times.json：{len(out)} 筆')


def build():
    r = subprocess.run([sys.executable, os.path.join(BASE, 'scripts', 'build_gallery.py')],
                       cwd=BASE, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip()[-800:])
    if r.returncode != 0:
        sys.exit('FATAL: build_gallery.py 失敗')


def push_docs(extra=None):
    """推 docs/index.html + docs/img 下的新圖（走 git trees，單 commit）"""
    files = ['docs/index.html']
    imgdir = os.path.join(BASE, 'docs', 'img')
    if os.path.isdir(imgdir):
        remote = {f['name']: f for f in call('GET', f'/repos/{OWNER}/{REPO}/contents/docs/img')}
        for n in os.listdir(imgdir):
            if n.startswith('.') or not n.lower().endswith('.png'):
                continue
            if n not in remote:
                files.append('docs/img/' + n)
    files += extra or []

    ref = call('GET', f'/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}')
    parent = ref['object']['sha']
    base_tree = call('GET', f'/repos/{OWNER}/{REPO}/git/commits/{parent}')['tree']['sha']

    entries = []
    for p in files:
        full = os.path.join(BASE, p)
        if not os.path.isfile(full):
            print('  skip (missing):', p)
            continue
        blob = call('POST', f'/repos/{OWNER}/{REPO}/git/blobs', {
            'content': base64.b64encode(open(full, 'rb').read()).decode(),
            'encoding': 'base64'})
        entries.append({'path': p, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
        print('  blob', p)

    if not entries:
        print('nothing to push')
        return
    tree = call('POST', f'/repos/{OWNER}/{REPO}/git/trees', {'base_tree': base_tree, 'tree': entries})
    msg = 'gallery: rebuild index'
    commit = call('POST', f'/repos/{OWNER}/{REPO}/git/commits',
                  {'message': msg, 'tree': tree['sha'], 'parents': [parent]})
    call('PATCH', f'/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}', {'sha': commit['sha']})
    print(f'PUSHED {len(entries)} docs files → {commit["sha"][:7]} :: {msg}')


if __name__ == '__main__':
    argv = sys.argv[1:]
    extra = argv[argv.index('--files') + 1:] if '--files' in argv else None
    sync()
    if '--skip-times' not in argv:
        fetch_git_times()
    build()
    if '--no-push' not in argv:
        push_docs(extra)
