/**
 * OPM 專題卡 · Nvidia Sell-Side Price Targets (Nov 9-11, 2026) · 1080×1350
 *
 * 🔴 OPM 是純英文號：卡片上不出現任何中文；ASCII 為主，避免子集字體缺字。
 * 版式（2026-11-10 阿澤欽定「圖形化優先」）：右上 OPM 標識 + 3 顆 KPI 膠囊 +
 *   主圖＝10 家機構「舊目標價淡尾 / 新目標價實條」橫向對比（圓形機構 logo 徽章），
 *   底部小字註解 + 統一免責聲明。純淺色底。
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
  line: '#E4E7EC', body: '#3A4453', hair: '#EDF0F4',
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
defs.push(`<pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="10" height="10" fill="#F2F4F7"/><rect width="4" height="10" fill="#D8DEE7"/></pattern>`);

const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.03">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6, fill: '#94A3B8' })}</g>`);
brandMark(a);

/* ---------------- 頁首 ---------------- */
a.push(t(M, 76, D.kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
const TS = 66, AVAIL_T = CW - 104;
a.push(t(M, 154, D.title, { size: fit(D.title, TS, AVAIL_T), weight: 700, ls: -1.6 }));
a.push(t(M, 198, D.subtitle, { size: fit(D.subtitle, 22, CW, 400), fill: C.gray }));
a.push(rr(M, 218, CW, 6, 3, 'url(#ruleG)'));

/* ---------------- KPI 膠囊 ×3 ---------------- */
{
  const KY = 244, KH = 64, KG = 14, KW = (CW - KG * 2) / 3;
  const accents = ['#00A98C', '#F08A00', '#D1400F'];
  D.kpis.forEach((k, i) => {
    const x = M + i * (KW + KG);
    a.push(rr(x, KY, KW, KH, 14, '#F5F8FC', 'stroke="#E7ECF3" stroke-width="1"'));
    a.push(rr(x, KY + 12, 4, KH - 24, 2, accents[i]));
    a.push(t(x + 20, KY + 32, k.value, { size: 27, weight: 700, fill: accents[i] }));
    a.push(t(x + 20, KY + 53, k.label, { size: fit(k.label, 14, KW - 34, 400), fill: C.gray }));
  });
}

/* ---------------- 圖例 ---------------- */
{
  const y = 344;
  let x = M;
  D.legend.forEach((it) => {
    a.push(rr(x, y - 13, 15, 15, 4, it.color));
    const sz = fit(it.label, 17, 190, 500);
    a.push(t(x + 23, y, it.label, { size: sz, weight: 500, fill: C.gray }));
    x += 23 + tw(it.label, sz, 500) + 28;
  });
  a.push(t(W - M, y, D.legend_right, { size: 15, fill: C.dim, anchor: 'end' }));
}

/* ---------------- 主圖：10 條「舊→新」橫向對比 ---------------- */
const ROW_Y0 = 380, ROW_H = 79, BH = 26;
const BX0 = M + 292, BX1 = W - M - 116, BW = BX1 - BX0;
const NAME_X = M + 58, NAME_W = BX0 - NAME_X - 16;
const SCALE = D.scale_max;

function badge(cx, cy, key, color) {
  const r = 22;
  a.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#E1E7EE" stroke-width="1.4"/>`);
  const uri = FIRM_LOGO[key];
  if (uri) {
    const s = 39;
    a.push(`<image x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" href="${uri}" image-rendering="optimizeQuality"/>`);
  } else {
    a.push(t(cx, cy + 7, key.slice(0, 2).toUpperCase(), { size: 15, weight: 700, fill: color, anchor: 'middle' }));
  }
}

D.firms.forEach((f, i) => {
  const y0 = ROW_Y0 + i * ROW_H;
  const cy = y0 + ROW_H / 2 - 2;
  const st = D.status[f.status];
  const oldW = f.old / SCALE * BW;
  const newW = f.new == null ? 0 : f.new / SCALE * BW;
  const by = cy - BH / 2;

  badge(M + 24, cy, f.key, st.color);
  a.push(t(NAME_X, cy - 3, f.name, { size: fit(f.name, 21, NAME_W, 700), weight: 700 }));
  a.push(t(NAME_X, cy + 17, `${f.date} / ${f.action}`,
    { size: fit(`${f.date} / ${f.action}`, 13.5, NAME_W, 400), fill: C.gray }));

  /* 舊目標價：淡尾（撤銷行改斜紋） */
  const ghostFill = f.status === 'withdrawn' ? 'url(#hatch)' : st.color;
  const ghostExtra = f.status === 'withdrawn' ? '' : `opacity="0.22"`;
  a.push(rr(BX0, by, oldW.toFixed(1), BH, 8, ghostFill, ghostExtra));
  /* 新目標價：實色條覆蓋 */
  if (f.new != null) a.push(rr(BX0, by, newW.toFixed(1), BH, 8, st.color));
  /* 舊價刻度：只有下調時才畫 */
  if (f.old > (f.new || 0)) {
    const gx = BX0 + oldW;
    a.push(`<line x1="${gx.toFixed(1)}" y1="${by - 4}" x2="${gx.toFixed(1)}" y2="${by + BH + 4}" stroke="${st.color}" stroke-width="2" opacity="0.7"/>`);
  }
  /* 大幅下調／撤銷：條上直接標字 */
  const tailW = oldW - newW;
  if (f.status === 'withdrawn') {
    a.push(t(BX0 + 18, cy + 6, 'TARGET WITHDRAWN', { size: 15, weight: 700, fill: st.ink, ls: 1.4 }));
  } else if (tailW >= 58) {
    a.push(t(BX0 + newW + tailW / 2, cy + 6, `-$${f.old - f.new}`,
      { size: 15, weight: 700, fill: st.ink, anchor: 'middle' }));
  }

  /* 右側：新目標價 + 變化 */
  a.push(t(W - M, cy + 9, f.new == null ? 'n/a' : `$${f.new}`,
    { size: 26, weight: 700, anchor: 'end' }));
  const delta = f.status === 'same' ? 'flat'
    : f.status === 'withdrawn' ? 'pulled'
      : `-$${f.old - f.new}`;
  a.push(t(W - M, cy + 27, delta, { size: 13.5, weight: 500, fill: st.ink, anchor: 'end' }));

  if (i < D.firms.length - 1) {
    a.push(`<line x1="${M}" y1="${y0 + ROW_H - 6}" x2="${W - M}" y2="${y0 + ROW_H - 6}" stroke="${C.hair}" stroke-width="1"/>`);
  }
});

/* ---------------- 註解 + 頁腳 ---------------- */
a.push(t(M, 1202, D.footnote, { size: 15, fill: C.dim }));
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
