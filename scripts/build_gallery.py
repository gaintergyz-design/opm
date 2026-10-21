#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""掃描 out/*.png + out/caption-*.txt → docs/img/ + docs/index.html（手機畫廊）

畫廊按「一則貼文」分組：
  · On Deck 帖 = on-deck + winners-losers + earnings-week + week-ahead 四張圖，共用一則文案
  · The Close 帖 = the-close 一張圖，自帶一則文案

顯示策略：
  · 最近 7 天（含今天）預設展開
  · 更早的整組折疊，圖片用 data-src 延遲載入（折疊時完全不佔流量與內存）
  · 點「查看更多」才展開並載入

用法：
  python3 scripts/build_gallery.py             # 預設
  python3 scripts/build_gallery.py --prune 90  # 額外刪掉 docs/img 中超過 90 天的圖（默認保留全部）
  python3 scripts/build_gallery.py --days 7    # 調整展開天數
"""
import glob, os, re, shutil, sys, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'out')
DOCS = os.path.join(BASE, 'docs')
IMG = os.path.join(DOCS, 'img')


def arg(name, d):
    a = sys.argv[1:]
    return int(a[a.index(name) + 1]) if name in a else d


OPEN_DAYS = arg('--days', 7)     # 最近 N 天預設展開
PRUNE_DAYS = arg('--prune', 0)   # >0 時，docs/img 超過 N 天的圖直接刪除

os.makedirs(IMG, exist_ok=True)

POST_OF = {
    'on-deck': 'ondeck',
    'winners-losers': 'ondeck',
    'earnings-week': 'ondeck',
    'week-ahead': 'ondeck',
    'the-close': 'theclose',
}
POST_NAME = {'ondeck': 'On Deck', 'theclose': 'The Close'}
ORDER = ['on-deck', 'winners-losers', 'earnings-week', 'week-ahead', 'the-close']


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


items = []
for p in sorted(glob.glob(os.path.join(OUT, '*.png'))):
    name = os.path.basename(p)
    kind, d = parse(name)
    if d is None:
        continue
    shutil.copy2(p, os.path.join(IMG, name))
    cap_file = os.path.join(OUT, f'caption-{name[:-4]}.txt')
    caption = open(cap_file, encoding='utf-8').read().strip() if os.path.exists(cap_file) else ''
    items.append({'img': f'img/{name}', 'name': name, 'kind': kind, 'date': d,
                  'post': POST_OF.get(kind, kind), 'caption': caption})

# 清掉 docs/img 裡已不在 out/ 的舊檔
keep = {i['name'] for i in items}

# 可選：清掉超過 PRUNE_DAYS 天的圖（默認 0 = 全留）
if PRUNE_DAYS > 0:
    cutoff = datetime.date.today() - datetime.timedelta(days=PRUNE_DAYS)
    keep = {i['name'] for i in items if i['date'] >= cutoff}
    items = [i for i in items if i['date'] >= cutoff]

for f in os.listdir(IMG):
    if f not in keep:
        os.remove(os.path.join(IMG, f))

# 按貼文分組
groups = {}
for it in items:
    groups.setdefault((it['post'], it['date']), []).append(it)
for g in groups.values():
    g.sort(key=lambda x: ORDER.index(x['kind']) if x['kind'] in ORDER else 99)

ordered = sorted(groups.items(),
                 key=lambda kv: (kv[0][1], 0 if kv[0][0] == 'theclose' else 1),
                 reverse=True)

cutoff_open = datetime.date.today() - datetime.timedelta(days=OPEN_DAYS - 1)
n_open = sum(1 for k, _ in ordered if k[1] >= cutoff_open)
n_open = max(n_open, 1)          # 最新一組一定展開


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;'))


def group_html(key, imgs, idx):
    post, d = key
    live = idx < n_open          # 展開組才載圖
    caption = next((i['caption'] for i in imgs if i['caption']), '')
    day = d.strftime('%a, %b %-d')
    head = (f'<div class="ghead"><b>{POST_NAME.get(post, post)}</b>'
            f'<span class="day">{day} · {len(imgs)} 張</span></div>')
    if caption:
        block = (f'<div class="tweet"><button class="copy" data-t="{esc(caption)}">複製文案</button>'
                 f'<p>{esc(caption)}</p><span class="len">{len(caption)} 字</span></div>')
    else:
        block = '<div class="tweet empty"><p>（這則還沒生成文案）</p></div>'
    shots = []
    for i in imgs:
        src = f'src="{i["img"]}"' if live else 'data-src="' + i['img'] + '"'
        shots.append(
            f'<div class="shot"><a class="link" href="{i["img"]}" target="_blank">'
            f'<img {src} loading="lazy" alt="{i["name"]}"></a></div>')
    cls = 'sec' if live else 'sec late'
    hid = '' if live else ' hidden'
    return f'<section class="{cls}"{hid}>{head}{block}<div class="shots">{"".join(shots)}</div></section>'


body = ''.join(group_html(k, v, idx) for idx, (k, v) in enumerate(ordered))
n_hidden = len(ordered) - n_open
more = ''
if n_hidden > 0:
    more = (f'<div class="morebar"><button id="more">查看更多（{n_hidden} 則更早）</button></div>')

html = f'''<!DOCTYPE html>
<html lang="zh"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>@onepagemarket</title>
<style>
  :root {{ --ink:#0B1220; --gray:#5C6675; --dim:#98A2B3; --amber:#BA7517;
          --line:#E4E7EC; --soft:#FAFAFA; --bg:#FFFFFF; }}
  * {{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.55 -apple-system,"PingFang SC","Helvetica Neue",Arial,sans-serif; }}
  header {{ padding:20px 16px 10px; }}
  h1 {{ margin:0; font-size:25px; letter-spacing:-.5px; }}
  .sub {{ color:var(--dim); font-size:12.5px; margin-top:3px; }}
  .rule {{ height:4px; background:var(--amber); }}
  main {{ padding:6px 16px 48px; max-width:620px; margin:0 auto; }}
  section {{ padding:20px 0 8px; border-bottom:1px solid var(--line); }}
  section:last-of-type {{ border-bottom:0; }}
  .ghead {{ display:flex; align-items:baseline; gap:8px; margin-bottom:10px; }}
  .ghead b {{ font-size:17px; }}
  .ghead .day {{ font-size:12.5px; color:var(--dim); }}
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
  .shots {{ display:flex; flex-direction:column; gap:14px; }}
  .shot {{ position:relative; }}
  .shot img {{ width:100%; height:auto; border-radius:12px; border:1px solid var(--line); display:block; }}
  .link {{ display:block; text-decoration:none; }}
  .morebar {{ padding:22px 0 4px; text-align:center; }}
  .morebar button {{ width:100%; padding:14px; font-size:14.5px; color:var(--gray);
    background:#fff; border:1px solid var(--line); border-radius:12px; }}
  .morebar button:active {{ background:#F7F8FA; }}
  .hint {{ font-size:12px; color:var(--dim); text-align:center; margin:18px 0 0; }}
</style></head>
<body>
<header><h1>@onepagemarket</h1>
<div class="sub">每日行情卡片 · 更新於 {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</div></header>
<div class="rule"></div>
<main>
{body}
{more}
<p class="hint">點圖開原尺寸 · 長按可直接複製或存圖</p>
</main>
<script>
function copyText(t, btn) {{
  var done = function () {{
    btn.textContent = '已複製'; btn.classList.add('done');
    setTimeout(function () {{ btn.textContent = '複製文案'; btn.classList.remove('done'); }}, 1600);
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
</script>
</body></html>'''

open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(html)
print(f'gallery: {len(ordered)} posts / {len(items)} images（展開 {n_open} 則，折疊 {n_hidden} 則）-> docs/index.html')
