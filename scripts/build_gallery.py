#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""掃描 out/*.png + out/caption-*.txt → docs/img/ + docs/index.html（手機畫廊）

畫廊按「一則貼文」分組，不是按圖分組：
  · On Deck 帖 = on-deck + winners-losers + earnings-week + week-ahead 四張圖，共用一則文案
  · The Close 帖 = the-close 一張圖，自帶一則文案
每組頂部顯示貼文文案（附複製按鈕），下面才是該帖的圖。
"""
import glob, os, re, shutil, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'out')
DOCS = os.path.join(BASE, 'docs')
IMG = os.path.join(DOCS, 'img')

os.makedirs(IMG, exist_ok=True)

# 圖名前綴 → 所屬貼文（同一則貼文共用一則文案）
POST_OF = {
    'on-deck': 'ondeck',
    'winners-losers': 'ondeck',
    'earnings-week': 'ondeck',
    'week-ahead': 'ondeck',
    'the-close': 'theclose',
}
POST_NAME = {'ondeck': 'On Deck', 'theclose': 'The Close'}
KIND_NAME = {
    'on-deck': 'On Deck', 'winners-losers': 'Winners & Losers',
    'earnings-week': 'Earnings Week', 'week-ahead': 'Week Ahead',
    'the-close': 'The Close',
}
ORDER = ['on-deck', 'winners-losers', 'earnings-week', 'week-ahead', 'the-close']


def parse(name):
    """on-deck-20261021.png → ('on-deck', date)"""
    stem = name[:-4]
    m = re.match(r'^(.*?)-(\d{8})(?:-\w+)?$', stem)
    if not m:
        return stem.rsplit('-', 1)[0] or 'other', None
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
    caption = ''
    if os.path.exists(cap_file):
        caption = open(cap_file, encoding='utf-8').read().strip()
    items.append({'img': f'img/{name}', 'name': name, 'kind': kind, 'date': d,
                  'post': POST_OF.get(kind, kind), 'caption': caption})

# 清掉 docs/img 裡已不在 out/ 的舊檔（避免畫廊出現幽靈條目）
keep = {i['name'] for i in items}
for f in os.listdir(IMG):
    if f not in keep:
        os.remove(os.path.join(IMG, f))

# 按「貼文」分組：(post, date)
groups = {}
for it in items:
    groups.setdefault((it['post'], it['date']), []).append(it)
for g in groups.values():
    g.sort(key=lambda x: ORDER.index(x['kind']) if x['kind'] in ORDER else 99)

ordered = sorted(groups.items(),
                 key=lambda kv: (kv[0][1], 0 if kv[0][0] == 'theclose' else 1),
                 reverse=True)


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;'))


def group_html(key, imgs):
    post, d = key
    caption = next((i['caption'] for i in imgs if i['caption']), '')
    day = d.strftime('%a, %b %-d')
    head = (f'<div class="ghead"><b>{POST_NAME.get(post, post)}</b>'
            f'<span class="day">{day} · {len(imgs)} image{"s" if len(imgs) > 1 else ""}</span></div>')
    if caption:
        block = (f'<div class="tweet"><button class="copy" data-t="{esc(caption)}">複製文案</button>'
                 f'<p>{esc(caption)}</p><span class="len">{len(caption)} 字</span></div>')
    else:
        block = '<div class="tweet empty"><p>（這則還沒生成文案）</p></div>'
    figs = ''.join(
        f'<a class="shot" href="{i["img"]}" target="_blank">'
        f'<img src="{i["img"]}" loading="lazy" alt="{i["name"]}">'
        f'<span class="tag">{KIND_NAME.get(i["kind"], i["kind"])}</span></a>'
        for i in imgs)
    return f'<section>{head}{block}<div class="shots">{figs}</div></section>'


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
  section {{ padding:20px 0 6px; border-bottom:1px solid var(--line); }}
  section:last-child {{ border-bottom:0; }}
  .ghead {{ display:flex; align-items:baseline; gap:8px; margin-bottom:10px; }}
  .ghead b {{ font-size:17px; }}
  .ghead .day {{ font-size:12.5px; color:var(--dim); }}
  .tweet {{ position:relative; background:var(--soft); border:1px solid var(--line);
    border-left:3px solid var(--amber); border-radius:0 10px 10px 0;
    padding:12px 12px 10px; margin-bottom:14px; }}
  .tweet p {{ margin:0; font-size:14px; line-height:1.6; white-space:pre-wrap;
    user-select:text; -webkit-user-select:text; padding-right:4px; }}
  .tweet.empty p {{ color:var(--dim); }}
  .len {{ display:block; margin-top:6px; font-size:11px; color:var(--dim); }}
  .copy {{ position:absolute; top:-11px; right:10px; font-size:11.5px; padding:4px 10px;
    border:1px solid var(--line); background:#fff; border-radius:20px; color:var(--gray);
    box-shadow:0 1px 2px rgba(11,18,32,.06); }}
  .copy:active {{ background:#F2F4F7; }}
  .copy.done {{ color:#12A263; border-color:#BFE9D5; background:#F1FBF6; }}
  .shots {{ display:flex; flex-direction:column; gap:12px; }}
  .shot {{ display:block; text-decoration:none; color:inherit; position:relative; }}
  .shot img {{ width:100%; height:auto; border-radius:12px; border:1px solid var(--line); display:block; }}
  .tag {{ position:absolute; left:10px; top:10px; font-size:11px; padding:3px 9px;
    background:rgba(255,255,255,.94); border:1px solid var(--line); border-radius:20px; color:var(--gray); }}
  .hint {{ font-size:12px; color:var(--dim); text-align:center; margin:18px 0 0; }}
</style></head>
<body>
<header><h1>@onepagemarket</h1>
<div class="sub">每日行情卡片 · 更新於 {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</div></header>
<div class="rule"></div>
<main>
{''.join(group_html(k, v) for k, v in ordered)}
<p class="hint">點圖看原尺寸 · 長按可保存</p>
</main>
<script>
document.querySelectorAll('.copy').forEach(function (b) {{
  b.addEventListener('click', function (e) {{
    e.preventDefault();
    var t = b.getAttribute('data-t') || '';
    var done = function () {{
      b.textContent = '已複製';
      b.classList.add('done');
      setTimeout(function () {{ b.textContent = '複製文案'; b.classList.remove('done'); }}, 1600);
    }};
    if (navigator.clipboard && window.isSecureContext) {{
      navigator.clipboard.writeText(t).then(done, function () {{ fallback(t, done); }});
    }} else {{ fallback(t, done); }}
  }});
}});
function fallback(t, done) {{
  var ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try {{ document.execCommand('copy'); done(); }} catch (e) {{}}
  document.body.removeChild(ta);
}}
</script>
</body></html>'''

open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(html)
print(f'gallery: {len(ordered)} posts / {len(items)} images -> docs/index.html')
for k, v in ordered:
    cap = next((i['caption'] for i in v if i['caption']), '')
    print(f"  {k[0]:8s} {k[1]}  {len(v)} img  {'有文案' if cap else '無文案'}")
