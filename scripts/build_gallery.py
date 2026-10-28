#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""掃描 out/*.png + out/caption-*.txt → docs/img/ + docs/index.html（手機畫廊）

畫廊按「一則貼文」分組（四條獨立產線）：
  · On Deck      每天 19:00 HKT      → on-deck 一張
  · The Close    每天 04:20 HKT      → the-close 一張
  · Winners & Losers 週六 08:30 HKT  → winners-losers 一張（週五收盤後）
  · Week Ahead   週一 08:30 HKT      → week-ahead 一張（本週前瞻）
  每則貼文自帶一則文案

顯示策略：
  · 最近 3 天（含最新一張圖那天）預設展開
  · 更早的整組折疊，圖片用 data-src 延遲載入（折疊時完全不佔流量與內存）
  · 點「查看更多」才展開並載入

⚠️ 不能改成「只渲染最近 N 天」：週末沒有產線，日期一跳空，週五及以前的卡就會
   整批從頁面上消失（2026-10-23 的 3-day window 就是這樣讓 10/19–10/23 的卡
   全部下線，圖還在 docs/img 但頁面看不到）。要控制頁面長度請用折疊閾值 --days。

用法：
  python3 scripts/build_gallery.py             # 預設：全部上頁（舊組折疊，點「查看更多」才載圖）
  python3 scripts/build_gallery.py --show 7    # 只上最近 N 天的貼文（僅影響渲染，不刪圖）
  python3 scripts/build_gallery.py --prune 90  # 額外刪掉 docs/img 中超過 90 天的圖（默認保留全部）
  python3 scripts/build_gallery.py --days 3    # 調整「預設展開」的天數（折疊閾值）

⚠️ 這個腳本會整份重寫 docs/index.html —— 任何想長期存在的頁面改動（圖標、
   刷新按鈕、顯示天數…）都必須寫進本文件的模板，直接改 index.html 會在
   下一次 GitHub Action 跑完產線後被覆蓋掉（Meta 文案就是這樣消失過的）。
"""
import glob, json, os, re, shutil, subprocess, sys, datetime
from zoneinfo import ZoneInfo

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'out')
DOCS = os.path.join(BASE, 'docs')
IMG = os.path.join(DOCS, 'img')


def arg(name, d):
    a = sys.argv[1:]
    return int(a[a.index(name) + 1]) if name in a else d


OPEN_DAYS = arg('--days', 3)     # 最近 N 天預設展開
SHOW_DAYS = arg('--show', 0)     # 只渲染最近 N 天的貼文（0 = 全部，默認；舊組折疊不佔流量）
PRUNE_DAYS = arg('--prune', 0)   # >0 時，docs/img 超過 N 天的圖直接刪除

os.makedirs(IMG, exist_ok=True)

POST_OF = {
    'on-deck': 'ondeck',
    'winners-losers': 'winners',
    'week-ahead': 'weekahead',
    'the-close': 'theclose',
    'who-owns-nvda': 'who-owns-nvda',
    'who-owns-spcx': 'who-owns-spcx',
    'who-owns-meta': 'who-owns-meta',
    'who-owns-aapl': 'who-owns-aapl',
    'who-owns-msft': 'who-owns-msft',
    'etf-omah': 'etf-omah',
    'earnings-wdc': 'earnings-wdc',
}
POST_NAME = {'ondeck': 'On Deck', 'theclose': 'The Close',
             'winners': 'Winners & Losers', 'weekahead': 'Week Ahead',
             'who-owns-nvda': 'Who Owns NVDA?',
             'who-owns-spcx': 'Who Owns SpaceX?',
             'who-owns-meta': 'Who Owns Meta?',
             'who-owns-aapl': 'Who Owns Apple?',
             'who-owns-msft': 'Who Owns Microsoft?',
             'etf-omah': 'OMAH ETF · Top 10 Holdings',
             'anthropic-s1': 'Anthropic S-1 · 6 cards'}
ORDER = ['on-deck', 'winners-losers', 'week-ahead', 'the-close',
         'who-owns-nvda', 'who-owns-spcx', 'who-owns-meta', 'who-owns-aapl',
         'who-owns-msft', 'etf-omah', 'anthropic-s1']

# 總結型系列：多張卡（-p01..pNN）共用一則貼文 → 歸併成同一 kind、同一 post 組
def kind_alias(kind):
    m = re.match(r'^(anthropic-s1)-p\d+$', kind)
    return m.group(1) if m else kind


def post_name(post):
    """earnings-<ticker> 自動命名 → 新標的只丟 data/earnings-<t>.json 就夠，不用改這張表。"""
    if post in POST_NAME:
        return POST_NAME[post]
    if post.startswith('earnings-'):
        return f"{post.split('-', 1)[1].upper()} Earnings"
    return post


def order_key(kind):
    """同一則貼文裡多張圖的排序：財報卡統一緊跟 the-close（新卡排前）。"""
    if kind.startswith('earnings-') and kind not in ORDER:
        return ORDER.index('the-close') + 1
    return ORDER.index(kind) if kind in ORDER else 99


def parse(name):
    stem = name[:-4]
    m = re.match(r'^(.*?)-(\d{8})(?:-\w+)?$', stem)
    if not m:
        return (stem.rsplit('-', 1)[0] or 'other'), None
    kind, tag = m.group(1), m.group(2)
    try:
        d = datetime.datetime.strptime(tag, '%Y%m%d').date()
    except Exception:
        d = None
    return kind, d


def git_commit_times():
    """out/ 下每個檔案「最後一次被提交」的時間（epoch）。
    不能用 mtime：git pull/checkout 會把 mtime 重置成拉取時刻。"""
    times = {}
    try:
        raw = subprocess.run(['git', '-C', BASE, 'log', '--format=@%ct', '--name-only', '--', 'out'],
                             capture_output=True, text=True).stdout
        cur = None
        for line in raw.splitlines():
            if line.startswith('@'):
                cur = int(line[1:])
            elif line.strip() and cur:
                f = line.strip()
                if f not in times:
                    times[f] = cur           # git log 由新到舊 → 首次出現即最新
    except Exception:
        pass
    return times


GIT_TIMES = git_commit_times()
SH = ZoneInfo('Asia/Shanghai')


def gen_times():
    """產線出圖時寫入的生成時刻（最準）。"""
    try:
        with open(os.path.join(OUT, 'gen-times.json'), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


GEN_TIMES = gen_times()


def stamp_of(p, name):
    """圖片生成時刻：① 產線記錄 gen-times ② min(git 提交時間, mtime)
       —— git 拉取只會把 mtime 推後、批量提交只會把 git 時間推後，取較早者最接近真實生成時刻。"""
    ep = GEN_TIMES.get(name)
    if not ep:
        git_ep = GIT_TIMES.get(f'out/{name}')
        mtime = os.stat(p).st_mtime
        ep = min(git_ep, mtime) if git_ep else mtime
    return ep, datetime.datetime.fromtimestamp(ep, SH).strftime('%Y-%m-%d %H:%M')


items = []
for p in sorted(glob.glob(os.path.join(OUT, '*.png'))):
    name = os.path.basename(p)
    kind, d = parse(name)
    kind = kind_alias(kind)
    if d is None:
        continue
    shutil.copy2(p, os.path.join(IMG, name))
    cap_file = os.path.join(OUT, f'caption-{name[:-4]}.txt')
    caption = open(cap_file, encoding='utf-8').read().strip() if os.path.exists(cap_file) else ''
    mt, ts = stamp_of(p, name)
    items.append({'img': f'img/{name}', 'name': name, 'kind': kind, 'date': d,
                  'post': POST_OF.get(kind, kind), 'caption': caption,
                  'mtime': mt, 'time': ts})

# 本輪 out/ 裡有的圖（會被複製進 docs/img）
keep = {i['name'] for i in items}

# 可選：清掉超過 PRUNE_DAYS 天的圖（默認 0 = 全留）
if PRUNE_DAYS > 0:
    cutoff = datetime.date.today() - datetime.timedelta(days=PRUNE_DAYS)
    keep = {i['name'] for i in items if i['date'] >= cutoff}
    items = [i for i in items if i['date'] >= cutoff]

# 清掉 docs/img 裡已不在 out/ 的舊檔。
# 但「已入 git 的歷史圖」不刪：某次 runner checkout 就算少帶幾張 out/*.png，
# 也不能把它們從 docs/img 連根拔掉（否則頁面與 repo 一起永久少圖）。
try:
    tracked = {os.path.basename(f) for f in subprocess.run(
        ['git', '-C', BASE, 'ls-files', 'docs/img'],
        capture_output=True, text=True).stdout.split()}
except Exception:
    tracked = set()

for f in os.listdir(IMG):
    if f in keep:
        continue
    if f in tracked and PRUNE_DAYS == 0:   # 只有顯式 --prune 才允許刪已入庫的歷史圖
        continue
    os.remove(os.path.join(IMG, f))

# 只渲染最近 SHOW_DAYS 天（以「最新一張圖的日期」為基準，避免週末沒產線時整頁空白；
# 圖仍留在 docs/img，只是不上頁面）
if SHOW_DAYS > 0 and items:
    newest = max(i['date'] for i in items)
    show_cutoff = newest - datetime.timedelta(days=SHOW_DAYS - 1)
    items = [i for i in items if i['date'] >= show_cutoff]
    print(f'顯示範圍：{show_cutoff} ~ {newest}（最近 {SHOW_DAYS} 天）')

# 按貼文分組；同日內按「組內最新圖的生成時間」倒序（新出的卡種排最前）
groups = {}
for it in items:
    groups.setdefault((it['post'], it['date']), []).append(it)
for g in groups.values():
    g.sort(key=lambda x: order_key(x['kind']))

glatest = {k: max(i['mtime'] for i in v) for k, v in groups.items()}
ordered = sorted(groups.items(),
                 key=lambda kv: (kv[0][1], glatest[kv[0]]),
                 reverse=True)

# 以「最新一張圖的日期」為錨，不用 today：runner 是 UTC，且週末無產線時 today 會
# 把最近幾組全折起來，頁面一開就是空的。
anchor_day = max((k[1] for k, _ in ordered), default=datetime.date.today())
cutoff_open = anchor_day - datetime.timedelta(days=OPEN_DAYS - 1)
n_open = sum(1 for k, _ in ordered if k[1] >= cutoff_open)
n_open = max(n_open, min(3, len(ordered)))   # 至少展開最新 3 則（週末跳空也不會只剩 1 則）


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;'))


# 預計下一張圖：按 GitHub Actions 排程（ET）算下一次運行，換算北京時間顯示
def next_post():
    try:
        et, cn = ZoneInfo('America/New_York'), ZoneInfo('Asia/Shanghai')
        now_et = datetime.datetime.now(et)
        sched = [('On Deck', (0, 1, 2, 3, 4), 8, 30),
                 ('The Close', (0, 1, 2, 3, 4), 16, 15),
                 ('Winners & Losers', (4,), 16, 30),
                 ('Week Ahead', (0,), 7, 0)]
        best = None
        for i in range(9):
            d = (now_et + datetime.timedelta(days=i)).date()
            for name, wds, h, m in sched:
                if d.weekday() not in wds:
                    continue
                t = datetime.datetime.combine(d, datetime.time(h, m), tzinfo=et)
                if t > now_et and (best is None or t < best[0]):
                    best = (t, name)
        if not best:
            return ''
        t, name = best[0].astimezone(cn), best[1]
        when = t.strftime('今天 %H:%M') if t.date() == datetime.datetime.now(cn).date() \
            else t.strftime('%m/%d %H:%M')
        return f'預計下一張圖：{name} · {when}（北京時間）'
    except Exception:
        return ''


NEXT_POST = next_post()


def group_html(key, imgs, idx):
    post, d = key
    live = idx < n_open          # 展開組才載圖
    caption = next((i['caption'] for i in imgs if i['caption']), '')
    # 生成時刻移到組標題（原本掛在每張圖下方）：一組多圖時取最新那張
    # 2026-10-27 阿澤：標題後面只留「日期 時:分」，去掉秒與「N 張」——那個數字沒人看，
    # 還會讓標題變長、在手機上折行。
    stamp = max(imgs, key=lambda i: i['mtime'])['time']
    head = (f'<div class="ghead"><b>{esc(post_name(post))}</b>'
            f'<span class="day">{stamp}</span></div>')
    if caption:
        block = (f'<div class="tweet"><button class="copy" data-t="{esc(caption)}">複製文案</button>'
                 f'<p>{esc(caption)}</p><span class="len">{len(caption)} 字</span></div>')
    else:
        block = '<div class="tweet empty"><p>（這則還沒生成文案）</p></div>'
    shots = []
    for i in imgs:
        src = f'src="{i["img"]}"' if live else 'data-src="' + i['img'] + '"'
        shots.append(
            f'<div class="shot">'
            f'<button class="dl" type="button" data-img="{i["img"]}" data-name="{i["name"]}">下載圖片</button>'
            f'<img {src} loading="lazy" alt="{i["name"]}"></div>')
    cls = 'sec' if live else 'sec late'
    hid = '' if live else ' hidden'
    return f'<section class="{cls}"{hid}>{head}{block}<div class="shots">{"".join(shots)}</div></section>'


body = ''.join(group_html(k, v, idx) for idx, (k, v) in enumerate(ordered))
n_hidden = len(ordered) - n_open
more = ''
if n_hidden > 0:
    more = (f'<div class="morebar"><button id="more">查看更多（{n_hidden} 則更早）</button></div>')

GALLERY_JS = r"""
// 下載圖片：手機走系統分享面板（網頁唯一能存進「相簿」的路徑），桌面直接下載
// 不使用自製確認框，完成後只彈 toast
var toastEl = document.getElementById('toast'), toastTimer = 0;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
}
function fileDownload(blob, name) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}
// 預取：pointerdown 就先把 blob 抓好，click 時才能「同步」呼叫 share
// （iOS Safari 只認同一個手勢任務內的 navigator.share，await 之後再呼叫會被拒）
var dlBlob = {}, dlPend = {};
function grab(url) {
  if (dlBlob[url]) return Promise.resolve(dlBlob[url]);
  if (dlPend[url]) return dlPend[url];
  dlPend[url] = fetch(url, { cache: 'force-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then(function (b) { dlBlob[url] = b; delete dlPend[url]; return b; });
  dlPend[url].catch(function () { delete dlPend[url]; });
  return dlPend[url];
}
var isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
function shareFile(blob, name) {
  if (!isTouch || !navigator.canShare) return null;
  var f = new File([blob], name, { type: blob.type || 'image/png' });
  if (!navigator.canShare({ files: [f] })) return null;
  return navigator.share({ files: [f] });
}
function runShare(blob, name) {
  // 回傳 Promise<Boolean>：true = 存好了、false = 用戶自己取消（不該標成已下載）
  var p = shareFile(blob, name);
  if (!p) { fileDownload(blob, name); return Promise.resolve(true); }
  return p.then(function () { return true; }, function (err) {
    if (err && err.name === 'AbortError') return false;   // 用戶關掉分享面板，不提示也不改字
    fileDownload(blob, name); return true;
  });
}
// 「已下載／已複製」是**常駐狀態**，不是 1.6 秒後復原的提示：
// 按鈕仍然可點，再點就再下一次／再複一次，只補一個縮放動畫當回饋
// 且寫進 localStorage 永久保存——刷新／重開瀏覽器／改天再來，仍是「已複製／已下載」
var DONE_KEY = 'opm-done-v1';
function doneMap() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch (e) { return {}; }
}
function saveDone(key) {
  try {
    var m = doneMap();
    if (!m[key]) { m[key] = 1; localStorage.setItem(DONE_KEY, JSON.stringify(m)); }
  } catch (e) {}
}
function hash32(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
function flash(btn) {
  btn.classList.remove('flash');
  void btn.offsetWidth;                 // 強制重排，讓同一個動畫能重新播放
  btn.classList.add('flash');
}
function markDone(btn, text) {
  btn.textContent = text;
  btn.classList.remove('busy');
  btn.classList.add('done');
  flash(btn);
}
function saveImage(btn) {
  var url = btn.getAttribute('data-img'), name = btn.getAttribute('data-name') || 'card.png';
  var settle = function (ok) {
    if (ok) { markDone(btn, '已下載'); saveDone('d:' + url); toast('已下載'); }
    else { btn.textContent = '下載圖片'; btn.classList.remove('busy', 'done'); }
  };
  if (dlBlob[url]) { runShare(dlBlob[url], name).then(settle); return; }   // 快路徑：手勢內同步
  var fallback = btn.classList.contains('done') ? '已下載' : '下載圖片';
  btn.textContent = '處理中'; btn.classList.add('busy');
  grab(url)
    .then(function (blob) { return runShare(blob, name); })
    .then(settle, function () {
      toast('下載失敗'); btn.textContent = fallback; btn.classList.remove('busy');
    });
}
document.querySelectorAll('.dl').forEach(function (b) {
  b.addEventListener('pointerdown', function () { grab(b.getAttribute('data-img')); }, { passive: true });
  b.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation(); saveImage(b);
  });
});

// 頂部吸附：滾動時補一層陰影，讓固定在頂部的 header 與內容分層
var topBar = document.getElementById('top');
function onScroll() { if (topBar) topBar.classList.toggle('scrolled', window.scrollY > 4); }
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
"""

html = f'''<!DOCTYPE html>
<html lang="zh"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>@onepagemarket</title>
<meta name="theme-color" content="#FFFFFF">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="OPM">
<style>
  :root {{ --ink:#0B1220; --gray:#5C6675; --dim:#98A2B3; --amber:#BA7517;
          --line:#E4E7EC; --soft:#FAFAFA; --bg:#FFFFFF; }}
  * {{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }}
  html, body {{ overscroll-behavior-y:contain; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.55 -apple-system,"PingFang SC","Helvetica Neue",Arial,sans-serif; }}
  header {{ padding:calc(20px + env(safe-area-inset-top)) 16px 10px; max-width:620px;
    margin:0 auto; display:flex; align-items:flex-start; gap:12px; }}
  /* 頂部吸附：滑動時 header + 品牌色線固定，內容從下面滑過 */
  .top {{ position:sticky; top:0; z-index:30; background:rgba(255,255,255,.94);
    -webkit-backdrop-filter:saturate(180%) blur(12px); backdrop-filter:saturate(180%) blur(12px);
    transition:box-shadow .18s ease; }}
  .top.scrolled {{ box-shadow:0 6px 16px rgba(11,18,32,.07); }}
  .hinfo {{ flex:1; min-width:0; }}
  h1 {{ margin:0; font-size:25px; letter-spacing:-.5px; }}
  .sub {{ color:var(--dim); font-size:12.5px; margin-top:3px; }}
  .rf {{ flex:none; width:38px; height:38px; margin-top:2px; padding:0; border:1px solid var(--line);
    background:#fff; border-radius:12px; color:var(--gray); display:grid; place-items:center;
    box-shadow:0 1px 2px rgba(11,18,32,.06); }}
  .rf:active {{ background:#F2F4F7; }}
  .rf svg {{ width:18px; height:18px; display:block; }}
  .rf.spin svg {{ animation:spin .7s linear infinite; }}
  @keyframes spin {{ to {{ transform:rotate(360deg); }} }}
  /* 下拉刷新：只在「加到主畫面」的獨立視窗啟用（瀏覽器本身已有自己的刷新） */
  #ptr {{ position:fixed; top:0; left:0; right:0; height:56px; z-index:50;
    display:flex; align-items:center; justify-content:center; gap:8px;
    font-size:13px; color:var(--dim); pointer-events:none;
    transform:translateY(-56px); transition:transform .18s ease; }}
  #ptr .dot {{ width:17px; height:17px; border-radius:50%; border:2px solid var(--line);
    border-top-color:var(--amber); }}
  #ptr.armed {{ color:var(--amber); }}
  #ptr.armed .dot {{ border-color:var(--amber); }}
  #ptr.loading .dot {{ animation:spin .7s linear infinite; }}
  .rule {{ height:4px; background:var(--amber); }}
  main {{ padding:6px 16px 48px; max-width:620px; margin:0 auto; }}
  section {{ padding:20px 0 8px; border-bottom:1px solid var(--line); }}
  section:last-of-type {{ border-bottom:0; }}
  .ghead {{ display:flex; align-items:baseline; gap:8px; margin-bottom:10px; }}
  .ghead b {{ font-size:17px; }}
  .ghead .day {{ font-size:12.5px; color:var(--dim); font-variant-numeric:tabular-nums;
    letter-spacing:.2px; }}
  .tweet {{ position:relative; background:var(--soft); border:1px solid var(--line);
    border-left:3px solid var(--amber); border-radius:0 10px 10px 0;
    padding:12px 12px 10px; margin-bottom:16px; }}
  .tweet p {{ margin:0; font-size:14px; line-height:1.6; white-space:pre-wrap;
    user-select:text; -webkit-user-select:text; }}
  .tweet.empty p {{ color:var(--dim); }}
  .len {{ display:block; margin-top:6px; font-size:11px; color:var(--dim); }}
  .copy {{ position:absolute; top:-11px; right:10px; font-size:11.5px; padding:4px 10px;
    border:1px solid var(--line); background:#fff; border-radius:20px; color:var(--gray);
    box-shadow:0 1px 2px rgba(11,18,32,.06); }}
  .copy:active {{ background:#F2F4F7; }}
  .copy.done {{ color:#12A263; border-color:#BFE9D5; background:#F1FBF6; }}
  /* 「已下載」用跟「已複製」同一套完成態配色；.flash 給再點一次的回饋 */
  .shot .dl.done {{ color:#12A263; border-color:#BFE9D5; background:#F1FBF6; }}
  @keyframes pop {{ 0% {{ transform:scale(1); }} 45% {{ transform:scale(1.07); }} 100% {{ transform:scale(1); }} }}
  .flash {{ animation:pop .34s ease; }}
  .shots {{ display:flex; flex-direction:column; gap:14px; }}
  .shot {{ position:relative; }}
  .shot img {{ width:100%; height:auto; border-radius:12px; border:1px solid var(--line); display:block; }}
  /* 下載膠囊：與「複製文案」同一套視覺，浮在圖片右上角 */
  .shot .dl {{ position:absolute; top:10px; right:10px; z-index:2; font-size:11.5px; padding:5px 11px;
    border:1px solid var(--line); background:rgba(255,255,255,.94); border-radius:20px;
    color:var(--gray); box-shadow:0 1px 4px rgba(11,18,32,.14);
    -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }}
  .shot .dl:active {{ background:#F2F4F7; }}
  .shot .dl.busy {{ color:var(--dim); }}
  .link {{ display:block; text-decoration:none; }}
  .morebar {{ padding:22px 0 4px; text-align:center; }}
  .morebar button {{ width:100%; padding:14px; font-size:14.5px; color:var(--gray);
    background:#fff; border:1px solid var(--line); border-radius:12px; }}
  .morebar button:active {{ background:#F7F8FA; }}
  #toast {{ position:fixed; left:50%; bottom:calc(30px + env(safe-area-inset-bottom)); z-index:80;
    transform:translateX(-50%) translateY(10px); opacity:0; pointer-events:none;
    background:rgba(11,18,32,.9); color:#fff; font-size:13px; letter-spacing:.2px;
    padding:9px 18px; border-radius:20px; box-shadow:0 6px 20px rgba(11,18,32,.24);
    transition:opacity .18s ease, transform .18s ease; }}
  #toast.show {{ opacity:1; transform:translateX(-50%) translateY(0); }}
</style></head>
<body>
<div id="ptr"><span class="dot"></span><span id="ptxt">下拉重新整理</span></div>
<div class="top" id="top">
<header><div class="hinfo"><h1>@onepagemarket</h1>
<div class="sub">{NEXT_POST or '每日行情卡片'}</div></div><button class="rf" id="rf" type="button" aria-label="重新整理"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button></header>
<div class="rule"></div>
</div>
<div id="toast"></div>
<main>
{body}
{more}
</main>
<script>
function copyText(t, btn) {{
  // 同「下載圖片」：按一次就常駐「已複製」（localStorage 永久保存），再點仍然複製，只補縮放動畫
  var done = function () {{
    btn.textContent = '已複製';
    btn.classList.add('done');
    saveDone('c:' + hash32(t));
    btn.classList.remove('flash');
    void btn.offsetWidth;
    btn.classList.add('flash');
  }};
  if (navigator.clipboard && window.isSecureContext) {{
    navigator.clipboard.writeText(t).then(done, function () {{ legacyCopy(t, done); }});
  }} else {{ legacyCopy(t, done); }}
}}
function legacyCopy(t, done) {{
  var ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try {{ document.execCommand('copy'); done(); }} catch (e) {{}}
  document.body.removeChild(ta);
}}
document.querySelectorAll('.copy').forEach(function (b) {{
  b.addEventListener('click', function (e) {{
    e.preventDefault(); copyText(b.getAttribute('data-t') || '', b);
  }});
}});
{GALLERY_JS}

// 載入時恢復永久完成態：點過「複製／下載」的按鈕，刷新／重開後直接顯示「已複製／已下載」
// （按鈕本來就在 DOM 裡，只有圖片是懶載入，不需等展開）
(function () {{
  var m = doneMap();
  document.querySelectorAll('.copy').forEach(function (b) {{
    if (m['c:' + hash32(b.getAttribute('data-t') || '')]) {{
      b.textContent = '已複製'; b.classList.add('done');
    }}
  }});
  document.querySelectorAll('.dl').forEach(function (b) {{
    if (m['d:' + (b.getAttribute('data-img') || '')]) {{
      b.textContent = '已下載'; b.classList.add('done');
    }}
  }});
}})();

// 查看更多：展開折疊組並延遲載入圖片
var moreBtn = document.getElementById('more');
if (moreBtn) {{
  moreBtn.addEventListener('click', function () {{
    document.querySelectorAll('section.late').forEach(function (s) {{
      s.hidden = false;
      s.querySelectorAll('img[data-src]').forEach(function (im) {{
        if (!im.getAttribute('src')) im.setAttribute('src', im.getAttribute('data-src'));
      }});
    }});
    moreBtn.parentElement.remove();
  }});
}}

// 重新整理：加時間戳避開 HTML 快取（GitHub Pages 的 HTML 有 10 分鐘快取）
function doRefresh() {{
  location.replace(location.pathname + '?r=' + Date.now());
}}
var rfBtn = document.getElementById('rf');
if (rfBtn) {{
  rfBtn.addEventListener('click', function () {{
    rfBtn.classList.add('spin');
    setTimeout(doRefresh, 220);
  }});
}}

// 下拉刷新：只在「加到主畫面」的獨立視窗啟用（瀏覽器自帶刷新，避免雙重行為）
(function () {{
  var standalone = (window.navigator.standalone === true) ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!standalone) return;
  var ptr = document.getElementById('ptr'), ptxt = document.getElementById('ptxt');
  var TH = 64, start = 0, dy = 0, pulling = false, ready = false;
  var setY = function (v) {{ ptr.style.transform = 'translateY(' + v + 'px)'; }};
  window.addEventListener('touchstart', function (e) {{
    if (window.scrollY > 0 || e.touches.length !== 1) return;
    start = e.touches[0].clientY; pulling = true; dy = 0; ready = false;
    ptr.style.transition = 'none';
  }}, {{ passive: true }});
  window.addEventListener('touchmove', function (e) {{
    if (!pulling) return;
    dy = e.touches[0].clientY - start;
    if (dy <= 0) {{ setY(-56); ptr.classList.remove('armed'); ready = false; return; }}
    var d = Math.min(dy * 0.55, 96);
    setY(d - 56);
    var arm = d >= TH * 0.55;
    if (arm !== ready) {{
      ready = arm; ptr.classList.toggle('armed', arm);
      ptxt.textContent = arm ? '鬆手重新整理' : '下拉重新整理';
    }}
    if (e.cancelable) e.preventDefault();
  }}, {{ passive: false }});
  window.addEventListener('touchend', function () {{
    if (!pulling) return;
    pulling = false;
    ptr.style.transition = '';
    if (ready) {{
      ptr.classList.add('loading'); ptxt.textContent = '重新整理中…'; setY(0);
      setTimeout(doRefresh, 260);
    }} else {{ setY(-56); }}
  }});
}})();
</script>
</body></html>'''

open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(html)
print(f'gallery: {len(ordered)} posts / {len(items)} images（展開 {n_open} 則，折疊 {n_hidden} 則）-> docs/index.html')
