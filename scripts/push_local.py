#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本機 → GitHub 單 commit 推送（不依賴 git 二進位，走 REST API）

背景：本機 git 已損壞（xcrun/CommandLineTools 失效），且畫廊要推二進位 PNG，
      MCP 的文字型推送工具會破壞二進位。故直接用 REST API 建 blob → tree → commit → ref。

Token 來源（依序）：
  1. 環境變數 GH_TOKEN
  2. macOS 鑰匙串：security find-generic-password -s opm-gh-token -w
     寫入方式：security add-generic-password -s opm-gh-token -a "$USER" -w <TOKEN> -U

用法：
  python3 scripts/push_local.py out/xxx.png out/caption-xxx.txt data/xxx.json
  python3 scripts/push_local.py --dry-run
  python3 scripts/push_local.py --message "cards: 2026-11-02 earnings-pltr earnings-tsem"

🔴 只增不改原則（2026-11-12 阿澤欽定）：兩台電腦各自往畫廊加圖，不需要同步，
   只管添加圖片，彼此不要覆蓋。落地為三條硬規則：
   ① 禁推 docs/——畫廊索引只由 CI（gallery-sync）全量重建，本地 docs 是部分鏡像，
     推上去會把另一台機器/CI 產的歷史卡整批刷掉。
   ② 累積檔（out/gen-times.json、out/git-times.json、data/logos.json）推送前
     自動拉遠端做 dict union，絕不整檔覆蓋。
   ③ 其餘檔案若遠端已存在且內容不同（同名卡更新、腳本改動），逐項印出
     ⚠ 覆蓋提示——正常加圖不會出現這行，出現即代表動了共享檔。
"""
import base64, json, os, subprocess, sys, urllib.request, urllib.error

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OWNER, REPO, BRANCH = 'gaintergyz-design', 'opm', 'main'
API = 'https://api.github.com'

# 默認推送集：自動生成物（卡片 + 數據）。🔴 不含 docs/——見檔頭「只增不改原則」
DEFAULT_DIRS = ['out', 'data']

# 累積檔：推送前自動與遠端 dict-union（②號規則）
CUMULATIVE_JSON = {'out/gen-times.json', 'out/git-times.json', 'data/logos.json'}


def token():
    t = os.environ.get('GH_TOKEN', '').strip()
    if t:
        return t
    try:
        r = subprocess.run(['security', 'find-generic-password', '-s', 'opm-gh-token', '-w'],
                           capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    sys.exit('FATAL: 找不到 GitHub token（GH_TOKEN 或鑰匙串 opm-gh-token）\n'
             '  寫入鑰匙串：security add-generic-password -s opm-gh-token -a "$USER" -w <TOKEN> -U')


TOKEN = token()


def call(method, path, payload=None):
    url = API + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    req.add_header('User-Agent', 'opm-local-push')
    if data:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:400]
        sys.exit(f'FATAL: {method} {path} → HTTP {e.code}\n{body}')


def collect(args):
    if args:
        files = list(args)
    else:
        files = []
        for d in DEFAULT_DIRS:
            for root, _, names in os.walk(os.path.join(BASE, d)):
                for n in names:
                    if n.startswith('.') or n.endswith('.pyc'):
                        continue
                    files.append(os.path.relpath(os.path.join(root, n), BASE))
    # ①號規則：docs/ 一律拒推
    bad = [f for f in files if f == 'docs' or f.startswith('docs/')]
    if bad:
        sys.exit('FATAL: 禁推 docs/（畫廊索引只由 CI 全量重建，本地是部分鏡像，推了會刷掉別台的歷史卡）\n'
                 '  涉及：' + ', '.join(bad[:8]) + ('…' if len(bad) > 8 else ''))
    return files


def remote_tree_map(base_tree):
    """遠端 path → blob sha（用來標示「這次推送會覆蓋哪些共享檔」）。"""
    try:
        t = call('GET', f'/repos/{OWNER}/{REPO}/git/trees/{base_tree}?recursive=1')
        if t.get('truncated'):
            return None
        return {e['path']: e['sha'] for e in t.get('tree', []) if e.get('type') == 'blob'}
    except SystemExit:
        raise
    except Exception:
        return None


def union_cumulative(p, full):
    """②號規則：累積檔與遠端 dict-union 後再寫回本地，保證不蓋掉另一台的新條目。"""
    try:
        cur = call('GET', f'/repos/{OWNER}/{REPO}/contents/{p}?ref={BRANCH}')
        remote = json.loads(base64.b64decode(cur['content']).decode('utf-8'))
    except Exception:
        return 0
    if not isinstance(remote, dict):
        return 0
    try:
        local = json.load(open(full, encoding='utf-8'))
    except Exception:
        return 0
    merged = {**remote, **local}
    if merged != local:
        json.dump(merged, open(full, 'w', encoding='utf-8'))
    return len(merged) - len({k: 1 for k in local})


def main():
    argv = sys.argv[1:]
    dry = '--dry-run' in argv
    msg = None
    if '--message' in argv:
        i = argv.index('--message')
        msg = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    paths = [a for a in argv if not a.startswith('--')]
    files = collect(paths)

    ref = call('GET', f'/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}')
    parent = ref['object']['sha']
    base_tree = call('GET', f'/repos/{OWNER}/{REPO}/git/commits/{parent}')['tree']['sha']
    rmap = remote_tree_map(base_tree)

    entries, total, n_overwrite = [], 0, 0
    for p in files:
        full = os.path.join(BASE, p)
        if not os.path.isfile(full):
            print(f'  skip (missing): {p}')
            continue
        if p in CUMULATIVE_JSON:
            added = union_cumulative(p, full)
            if added:
                print(f'  union {p}: +{added} 條（合入遠端，未覆蓋）')
        blob = call('POST', f'/repos/{OWNER}/{REPO}/git/blobs', {
            'content': base64.b64encode(open(full, 'rb').read()).decode(),
            'encoding': 'base64'})
        if rmap and rmap.get(p) and rmap[p] != blob['sha'] and p not in CUMULATIVE_JSON:
            n_overwrite += 1
            print(f'  ⚠ 覆蓋遠端已有檔：{p}（共享檔被改動，請確認不是刷掉別台的內容）')
        entries.append({'path': p, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
        total += os.path.getsize(full)
        print(f'  blob {p}')

    if not entries:
        sys.exit('nothing to push')
    if n_overwrite:
        print(f'  ⚠ 本次推送覆蓋 {n_overwrite} 個遠端已有檔（加圖類推送應為 0）')
    if dry:
        print(f'[dry-run] {len(entries)} files, {total/1024:.0f} KB, parent {parent[:7]}')
        return

    tree = call('POST', f'/repos/{OWNER}/{REPO}/git/trees', {'base_tree': base_tree, 'tree': entries})
    message = msg or f'chore: sync local cards ({len(entries)} files)'
    commit = call('POST', f'/repos/{OWNER}/{REPO}/git/commits',
                  {'message': message, 'tree': tree['sha'], 'parents': [parent]})
    call('PATCH', f'/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}', {'sha': commit['sha']})
    print(f'PUSHED {len(entries)} files, {total/1024:.0f} KB → {commit["sha"][:7]} :: {message}')


if __name__ == '__main__':
    main()
