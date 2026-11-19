/**
 * OPM 專題卡 · Nvidia Credit Ratings · Big Three · 1080×1350
 *
 * 🔴 OPM 純英文號：卡片上不出現任何中文。
 * 版式（2026-11-12 阿澤欽定「图形化优先、旧→新一眼看出、字大、條粗」）：
 *   - 主圖＝2026 三次評級動作時間軸，每列「舊等級 → 新等級」膠囊對比。
 *   - 升級 teal / 展望下调 橙红（阿澤欽定配色），右欄動作＋日期。
 *   - 標題下不放 KPI 膠囊；條尾不畫豎線刻度；禁用斜紋水印。
 *
 * 數據：data/nvda-ratings.json（來源見檔內 source_note）。
 * 機構 logo：assets/logos/MCO.png / SPGI.png；Fitch 無素材→字首降級徽章。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_nvda_ratings.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'nvda-ratings.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', body: '#3A4453', hair: '#EFF2F6',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, op = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}
const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
function cw(s, size, weight = 400) {
  let w = 0;
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c >= 0x2E80 && c <= 0xFFEF) w += 100;
    else if (c >= 32 && c <= 126) w += textWidth(ch, 100, weight);
    else w += 60;
  }
  return w * size / 100;
}
const fit = (s, size, max, weight = 700) =>
  cw(s, size, weight) > max ? Math.floor(size * max / cw(s, size, weight)) : size;

/* 機構 logo：白底圓徽（寬字標 SPGI 用 contain 不裁切） */
const AGENCY_LOGO = {};
for (const g of D.agencies) {
  if (!g.logo) continue;
  const p = path.join(BASE, 'assets', 'logos', g.logo);
  if (fs.existsSync(p)) AGENCY_LOGO[g.key] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}
function agencyBadge(a, cx, cy, g, r = 22, wide = false) {
  a.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#E1E7EE" stroke-width="1.4"/>`);
  // S&P 官方檔是「上黑線＋S&P Global」寬字標，塞進小圓徽會被縮成一條線 → 自繪紅色 S&P 字標
  if (g.key === 'sp') {
    a.push(t(cx, cy + r * 0.34, 'S&P', { size: r * 0.68, weight: 700, fill: '#D50032', anchor: 'middle' }));
    return;
  }
  const uri = AGENCY_LOGO[g.key];
  if (uri) {
    const s = wide ? r * 1.05 : r * 1.55;
    a.push(`<image x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" href="${uri}" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/>`);
  } else {
    a.push(t(cx, cy + r * 0.36, g.key.slice(0, 1).toUpperCase(), { size: r * 0.95, weight: 700, fill: '#6B7280', anchor: 'middle' }));
  }
}

let defs = [];
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#00A98C"/><stop offset="0.5" stop-color="#FFB01C"/>
  <stop offset="0.75" stop-color="#FF8A1E"/><stop offset="1" stop-color="#F1541E"/></linearGradient>`);

const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6, fill: '#94A3B8' })}</g>`);
brandMark(a);

/* ---------------- 頁首 ---------------- */
a.push(t(M, 72, D.kicker, { size: 17, weight: 500, fill: '#8B95A5', ls: 3 }));
const TS = 72, AVAIL_T = CW - 104;
a.push(t(M, 140, D.title, { size: fit(D.title, TS, AVAIL_T), weight: 700, ls: -1.6 }));
a.push(t(M, 188, D.subtitle, { size: fit(D.subtitle, 25, CW, 400), fill: C.gray }));
a.push(rr(M, 206, CW, 6, 3, 'url(#ruleG)'));

/* ---------------- Big Three 列 ---------------- */
{
  const y = 246;
  a.push(t(M, y + 22, D.big3_label, { size: 15, weight: 700, fill: '#8B95A5', ls: 2 }));
  let x = M + 158;
  D.agencies.forEach((g) => {
    agencyBadge(a, x + 18, y + 18, g, 18, g.key === 'sp');
    a.push(t(x + 44, y + 25, g.name, { size: 20, weight: 700, fill: C.body }));
    x += 44 + tw(g.name, 20, 700) + 40;
  });
  a.push(t(W - M, y + 22, D.big3_note, { size: 14, fill: C.dim, anchor: 'end' }));
}

/* ---------------- 圖例 ---------------- */
{
  const y = 312;
  let x = M;
  D.legend.forEach((it) => {
    a.push(rr(x, y - 14, 17, 17, 4, it.color));
    const sz = fit(it.label, 19, 200, 500);
    a.push(t(x + 25, y, it.label, { size: sz, weight: 500, fill: C.gray }));
    x += 25 + tw(it.label, sz, 500) + 30;
  });
  a.push(t(W - M, y, D.legend_right, { size: 16, fill: C.dim, anchor: 'end' }));
}

/* ---------------- 表頭 ---------------- */
const ROW_Y0 = 344, ROW_H = 168, CAP_H = 66;
const AGX = M + 6, AGW = 250;
const BX0 = M + 264, BX1 = W - M - 224;
const ACT_X = BX1 + 18, ACT_W = W - M - ACT_X;
a.push(rr(M, 334, CW, 34, 8, '#F1F4F8'));
a.push(t(M + 12, 357, D.table_head[0], { size: 15, weight: 500, fill: '#667085', ls: 1.2 }));
a.push(t(BX0 + 4, 357, D.table_head[1], { size: 15, weight: 500, fill: '#667085', ls: 1.2 }));
a.push(t(ACT_X, 357, D.table_head[2], { size: 15, weight: 500, fill: '#667085', ls: 1.2 }));

/* 舊→新 膠囊（純 SVG 箭頭） */
function moveArrow(x1, x2, cy, color) {
  const gap = x2 - x1;
  a.push(`<line x1="${x1.toFixed(1)}" y1="${cy}" x2="${(x2 - 8).toFixed(1)}" y2="${cy}" stroke="${color}" stroke-width="2.6" opacity="0.85"/>`);
  a.push(`<polygon points="${(x2 - 8).toFixed(1)},${cy - 5.5} ${x2.toFixed(1)},${cy} ${(x2 - 8).toFixed(1)},${cy + 5.5}" fill="${color}" opacity="0.95"/>`);
}

D.moves.forEach((mv, i) => {
  const y0 = ROW_Y0 + i * ROW_H;
  const cy = y0 + ROW_H / 2 - 6;
  const st = D.status[mv.status];
  const g = D.agencies.find((g) => g.key === mv.key) || D.agencies[0];

  /* 左：機構徽章＋名＋說明 */
  agencyBadge(a, AGX + 22, cy, g, 22, g.key === 'sp');
  a.push(t(AGX + 56, cy - 4, mv.agency, { size: fit(mv.agency, 23, AGW - 56, 700), weight: 700 }));
  a.push(t(AGX + 56, cy + 22, mv.detail, { size: fit(mv.detail, 13.5, AGW - 52, 400), fill: C.dim }));

  /* 中：舊膠囊（淡）→ 新膠囊（實色，粗） */
  const oldW = 168, capY = cy - CAP_H / 2;
  const oldStr = mv.old, newStr = mv.new;
  a.push(rr(BX0, capY, oldW, CAP_H, 12, '#F1F4F8'));
  a.push(t(BX0 + oldW / 2, cy + 12, oldStr,
    { size: fit(oldStr, 32, oldW - 24, 600), weight: 600, fill: '#8B95A5', anchor: 'middle' }));
  const newX = BX0 + oldW + 76;
  const newW = BX1 - newX;
  a.push(rr(newX, capY, newW, CAP_H, 12, st.color));
  a.push(t(newX + newW / 2, cy + 13, newStr,
    { size: fit(newStr, 36, newW - 28, 700), weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  moveArrow(BX0 + oldW + 12, newX - 12, cy, st.ink);

  /* 右：動作＋日期 */
  a.push(rr(ACT_X, cy - 26, fit(mv.action, 19, ACT_W, 700) + 26, 34, 8, st.tint));
  a.push(t(ACT_X + 13, cy - 3, mv.action, { size: fit(mv.action, 19, ACT_W, 700), weight: 700, fill: st.ink }));
  a.push(t(ACT_X, cy + 30, mv.date, { size: 15, fill: C.dim }));

  if (i < D.moves.length - 1) {
    a.push(`<line x1="${M}" y1="${y0 + ROW_H - 8}" x2="${W - M}" y2="${y0 + ROW_H - 8}" stroke="${C.hair}" stroke-width="1"/>`);
  }
});

/* ---------------- Callout + 註解 ---------------- */
const callY = ROW_Y0 + D.moves.length * ROW_H + 6;
a.push(rr(M, callY, CW, 52, 10, '#0B1220'));
a.push(t(M + 20, callY + 34, D.callout, { size: fit(D.callout, 23, CW - 40, 700), weight: 700, fill: '#FFFFFF' }));

let fy = callY + 84;
D.footnote.split(' ').reduce((lines, word) => {
  const last = lines[lines.length - 1];
  if (tw(last + ' ' + word, 16, 400) <= CW) lines[lines.length - 1] = last + ' ' + word;
  else lines.push(word);
  return lines;
}, ['']).forEach((ln) => {
  a.push(t(M, fy, ln, { size: 16, fill: C.gray }));
  fy += 22;
});
a.push(t(M, fy + 4, D.source_note, { size: 13, fill: C.dim }));

/* ---------------- 頁腳 ---------------- */
pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.asof, handle });

a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = `nvda-ratings-${D.stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const sub = path.join(BASE, 'assets', 'fonts');
const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => [path.join(sub, f), path.join(full, f)].find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
