/**
 * OPM 專題卡 · Nvidia Sell-Side Price Targets (Nov 9-11, 2026) · 1080×1350
 *
 * 🔴 OPM 是純英文號：卡片上不出現任何中文；ASCII 為主，避免子集字體缺字。
 * 版式（2026-11-12 阿澤改版指定）：
 *   - 標題下不放三顆並列 KPI 膠囊（「毫無必要」）。
 *   - 排版參考富途原圖：每列一個加粗大色條，條內左＝舊目標價、右＝新目標價、
 *     中間箭頭，右側獨立欄放評級動作＋調整日期，一眼看出「舊→新」。
 *   - 條高為初版 2 倍（26 → 52）；條長仍按新目標價縮放，露出的淡尾＝舊價多出的部分。
 *   - 條尾不畫任何豎線刻度。字號全面放大。
 *
 * 數據：data/nvda-targets.json（轉譯自阿澤提供的富途牛牛機構目標價整理圖，
 *       原圖標註 Reuters / MarketBeat / Stock Analysis，2026-11-09 ~ 11-11）。
 * Logo：assets/firms/*.png（自原圖逐枚去背；原圖「摩根士丹利」誤用 J.P.Morgan
 *       字標，已改為自繪 Morgan Stanley 字標）。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_nvda_targets.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'nvda-targets.json'), 'utf8'));

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
/** 非 ASCII 一律 0.6em（全英文卡用不到，但避免意外中文字被算太窄） */
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

/* 機構圓徽：白底 + 細灰邊 + 去背 logo */
const FIRM_LOGO = {};
for (const f of D.firms) {
  const p = path.join(BASE, 'assets', 'firms', `${f.key}.png`);
  if (fs.existsSync(p)) FIRM_LOGO[f.key] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

let defs = [];
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#00A98C"/><stop offset="0.45" stop-color="#FFB01C"/>
  <stop offset="0.72" stop-color="#FF8A1E"/><stop offset="1" stop-color="#D1400F"/></linearGradient>`);
defs.push(`<pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="12" height="12" fill="#F2F4F7"/><rect width="5" height="12" fill="#D8DEE7"/></pattern>`);

const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6, fill: '#94A3B8' })}</g>`);
brandMark(a);

/* ---------------- 頁首（無 KPI 膠囊） ---------------- */
a.push(t(M, 72, D.kicker, { size: 17, weight: 500, fill: '#8B95A5', ls: 3 }));
const TS = 76, AVAIL_T = CW - 104;
a.push(t(M, 152, D.title, { size: fit(D.title, TS, AVAIL_T), weight: 700, ls: -1.6 }));
a.push(t(M, 200, D.subtitle, { size: fit(D.subtitle, 26, CW, 400), fill: C.gray }));
a.push(rr(M, 218, CW, 6, 3, 'url(#ruleG)'));

/* ---------------- 圖例 ---------------- */
{
  const y = 258;
  let x = M;
  D.legend.forEach((it) => {
    a.push(rr(x, y - 14, 17, 17, 4, it.color));
    const sz = fit(it.label, 19, 200, 500);
    a.push(t(x + 25, y, it.label, { size: sz, weight: 500, fill: C.gray }));
    x += 25 + tw(it.label, sz, 500) + 30;
  });
  a.push(t(W - M, y, D.legend_right, { size: 16, fill: C.dim, anchor: 'end' }));
}

/* ---------------- 表頭（富途式分欄） ---------------- */
const ROW_Y0 = 334, ROW_H = 83, BH = 52;          // BH = 初版 26 的 2 倍
const BX0 = M + 250, BX1 = W - M - 196, BW = BX1 - BX0;
const NAME_X = M + 64, NAME_W = BX0 - NAME_X - 14;
const ACT_X = BX1 + 14, ACT_W = W - M - ACT_X;
const SCALE = D.scale_max;
a.push(rr(M, 286, CW, 36, 8, '#F1F4F8'));
a.push(t(M + 12, 310, D.table_head[0], { size: 16, weight: 500, fill: '#667085', ls: 1.2 }));
a.push(t(BX0 + 4, 310, D.table_head[1], { size: 16, weight: 500, fill: '#667085', ls: 1.2 }));
a.push(t(ACT_X, 310, D.table_head[2], { size: 16, weight: 500, fill: '#667085', ls: 1.2 }));

function badge(cx, cy, key, color) {
  const r = 26;
  a.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#E1E7EE" stroke-width="1.4"/>`);
  const uri = FIRM_LOGO[key];
  if (uri) {
    const s = 45;
    a.push(`<image x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" href="${uri}" image-rendering="optimizeQuality"/>`);
  } else {
    a.push(t(cx, cy + 8, key.slice(0, 2).toUpperCase(), { size: 17, weight: 700, fill: color, anchor: 'middle' }));
  }
}

/* 條內「舊價 → 新價」箭頭（純 SVG，不靠字體符號） */
function arrow(x1, x2, cy, color, size) {
  if (x2 - x1 >= 18) {
    a.push(`<line x1="${x1.toFixed(1)}" y1="${cy}" x2="${(x2 - 9).toFixed(1)}" y2="${cy}" stroke="${color}" stroke-width="2.4" opacity="0.8"/>`);
    a.push(`<polygon points="${(x2 - 9).toFixed(1)},${cy - 5} ${x2.toFixed(1)},${cy} ${(x2 - 9).toFixed(1)},${cy + 5}" fill="${color}" opacity="0.9"/>`);
  } else {
    a.push(t((x1 + x2) / 2, cy + 9, '>', { size, weight: 700, fill: color, anchor: 'middle' }));
  }
}

D.firms.forEach((f, i) => {
  const y0 = ROW_Y0 + i * ROW_H;
  const cy = y0 + ROW_H / 2;
  const st = D.status[f.status];
  const oldW = f.old / SCALE * BW;
  const newW = f.new == null ? 0 : f.new / SCALE * BW;
  const by = cy - BH / 2;
  const pulled = f.status === 'withdrawn';

  /* 左：圓徽 + 機構名（大字，單行） */
  badge(M + 26, cy, f.key, st.color);
  a.push(t(NAME_X, cy + 9, f.name, { size: fit(f.name, 25, NAME_W, 700), weight: 700 }));

  /* 中：舊價淡尾 + 新價實條（加粗 2 倍），條尾不畫任何豎線 */
  a.push(rr(BX0, by, oldW.toFixed(1), BH, 12, pulled ? 'url(#hatch)' : st.color,
    pulled ? '' : 'opacity="0.22"'));
  const barW = pulled ? oldW : newW;
  if (!pulled) a.push(rr(BX0, by, barW.toFixed(1), BH, 12, st.color));

  /* 條內數字：左舊價、右新價、中間箭頭 */
  const ink = pulled ? st.ink : '#FFFFFF';
  const oldStr = `$${f.old}`;
  const newStr = pulled ? 'PULLED' : `$${f.new}`;
  const narrow = barW < 240 && !pulled;   // 最窄的條略縮字級，讓箭頭仍能完整畫出
  const nSize = pulled ? 24 : (narrow ? 26 : 30);
  const oSize = narrow ? 22 : 25;
  const nFit = fit(newStr, nSize, barW - 130, 700);
  a.push(t(BX0 + 16, cy + 9, oldStr, { size: oSize, weight: 500, fill: ink, op: pulled ? 1 : 0.92 }));
  a.push(t(BX0 + barW - 16, cy + 10, newStr,
    { size: nFit, weight: 700, fill: ink, anchor: 'end' }));
  arrow(
    BX0 + 16 + tw(oldStr, oSize, 500) + 12,
    BX0 + barW - 16 - tw(newStr, nFit, 700) - 12,
    cy, ink, 22,
  );

  /* 淡尾上的降幅：只在夠寬時標，強化「變化」 */
  const tailW = oldW - barW;
  if (!pulled && tailW >= 62) {
    a.push(t(BX0 + barW + tailW / 2, cy + 7, `-$${f.old - f.new}`,
      { size: 18, weight: 700, fill: st.ink, anchor: 'middle' }));
  }

  /* 右：評級／動作 + 調整日期（富途式獨立欄） */
  a.push(t(ACT_X, cy - 2, f.action,
    { size: fit(f.action, 16, ACT_W, 500), weight: 500, fill: C.body }));
  a.push(t(ACT_X, cy + 20, f.date, { size: 15, fill: C.dim }));

  if (i < D.firms.length - 1) {
    a.push(`<line x1="${M}" y1="${y0 + ROW_H - 5}" x2="${W - M}" y2="${y0 + ROW_H - 5}" stroke="${C.hair}" stroke-width="1"/>`);
  }
});

/* ---------------- 註解 + 頁腳 ---------------- */
a.push(t(M, 1200, D.footnote, { size: 16, fill: C.dim }));
pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.asof, handle });

a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = `nvda-targets-${D.stamp}`;
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
