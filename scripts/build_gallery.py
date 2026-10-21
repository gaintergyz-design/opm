#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""掃描 out/*.png → 複製到 docs/img/ 並生成手機友好的畫廊 docs/index.html"""
import glob, os, shutil, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'out')
DOCS = os.path.join(BASE, 'docs')
IMG = os.path.join(DOCS, 'img')

os.makedirs(IMG, exist_ok=True)

items = []
for p in glob.glob(os.path.join(OUT, '*.png')):
    name = os.path.basename(p)
    kind = ('the-close' if name.startswith('the-close') else
            'on-deck' if name.startswith('on-deck') else
            'earnings-week' if name.startswith('earnings-week') else
            'week-ahead' if name.startswith('week-ahead') else
            'winners-losers' if name.startswith('winners-losers') else 'other')
    tag = name.rsplit('-', 1)[-1].replace('.png', '')
    try:
        d = datetime.datetime.strptime(tag, '%Y%m%d').date()
    except Exception:
        d = datetime.date(1970, 1, 1)
    shutil.copy2(p, os.path.join(IMG, name))
    # 貼文文案（若有）一併帶上，方便手機複製
    stem = name[:-4]
    cap_src = os.path.join(OUT, f'caption-{stem}.txt')
    caption = ''
    if os.path.exists(cap_src):
        caption = open(cap_src, encoding='utf-8').read().strip()
        shutil.copy2(cap_src, os.path.join(IMG, f'caption-{stem}.txt'))
    items.append({'src': f'img/{name}', 'kind': kind, 'date': d.isoformat(),
                  'name': name, 'caption': caption})

items.sort(key=lambda x: (x['date'], x['kind']), reverse=True)
LATEST = items[:4]

# 清掉 docs/img 裡已不在 out/ 的舊圖（避免畫廊出現幽靈條目）
keep = {i['name'] for i in items}
for f in os.listdir(IMG):
    if f not in keep:
        os.remove(os.path.join(IMG, f))

def card(it, big=False):
    cap = ''
    if it['caption']:
        cap = (f'<div class="tweet"><button class="copy" data-t="{it["caption"]}">複製文案</button>'
               f'<p>{it["caption"]}</p></div>')
    return (f'<div class="item"><a class="card" href="{it["src"]}" target="_blank">'
            f'<img src="{it["src"]}" loading="lazy" alt="{it["name"]}">'
            f'<span class="cap"><b>{it["kind"]}</b> · {it["date"]}</span></a>{cap}</div>')

html = f'''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>@onepagemarket</title>
<style>
  :root {{ --ink:#0B1220; --dim:#98A2B3; --amber:#BA7517; --bg:#FFFFFF; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.5 -apple-system,"PingFang SC","Helvetica Neue",Arial,sans-serif; }}
  header {{ padding:22px 18px 10px; }}
  h1 {{ margin:0; font-size:26px; letter-spacing:-.5px; }}
  .sub {{ color:var(--dim); font-size:13px; margin-top:4px; }}
  .rule {{ height:4px; background:var(--amber); margin:14px 0 0; }}
  main {{ padding:16px 18px 40px; max-width:760px; margin:0 auto; }}
  .item {{ margin-bottom:20px; }}
  .card {{ display:block; text-decoration:none; color:inherit; }}
  .card img {{ width:100%; height:auto; border-radius:12px; border:1px solid #E4E7EC; display:block; }}
  .cap {{ display:block; font-size:13px; color:var(--dim); margin-top:6px; }}
  .cap b {{ color:var(--ink); }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }}
  .grid .item {{ margin:0; }}
  .grid .tweet {{ display:none; }}
  .grid .cap {{ font-size:12px; }}
  .tweet {{ position:relative; margin:-8px 0 22px; padding:10px 12px; background:#FAFAFA;
    border:1px solid #E4E7EC; border-left:3px solid var(--amber); border-radius:0 8px 8px 0; }}
  .tweet p {{ margin:0; font-size:13px; line-height:1.5; color:var(--ink); user-select:text;
    -webkit-user-select:text; }}
  .copy {{ position:absolute; top:8px; right:8px; font-size:11px; padding:3px 8px;
    border:1px solid #E4E7EC; background:#fff; border-radius:6px; color:var(--dim); }}
  .copy:active {{ background:#F2F4F7; }}
  h2 {{ font-size:15px; color:var(--dim); font-weight:500; margin:26px 0 12px; }}
</style></head>
<body>
<header><h1>@onepagemarket</h1>
<div class="sub">Market cards · auto-published daily · {datetime.date.today().isoformat()}</div></header>
<div class="rule"></div>
<main>
  <h2>Latest</h2>
  {''.join(card(i, True) for i in LATEST[:2])}
  <h2>Archive</h2>
  <div class="grid">{''.join(card(i) for i in items[2:])}</div>
</main>
<script>
document.querySelectorAll('.copy').forEach(function (b) {{
  b.addEventListener('click', function (e) {{
    e.preventDefault();
    var t = b.getAttribute('data-t');
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    b.textContent = '已複製';
    setTimeout(function () {{ b.textContent = '複製文案'; }}, 1500);
  }});
}});
</script>
</body></html>'''

open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(html)
print(f'gallery: {len(items)} images -> docs/index.html')
