/**
 * OPM-專題卡：Stanley Druckenmiller Q3 2026 13F 持倉曝光（單張，1080×1350）
 *
 * 觸發：阿澤提供富途牛牛「聯儲局主席沃什恩師持倉曝光」參考圖（2026-11-20），
 *   要求轉 OPM 格式。版式：圖形化優先 — 上半部 Top 10 持倉橫向柱狀圖（按權重，
 *   帶 logo 圓徽章），下半部新建倉 / 清倉 TOP10 兩欄並排對比。
 *
 * 🔴 OPM 格式：全英文、白底、$B/$M 口徑、右上角 OPM 字標、無手柄 pill、
 *   無斜紋水印、統一頁尾聲明。
 *
 * 數據：data/druckenmiller-13f.json（源自參考圖，WhaleWisdom Q3 2026 13F，
 *   截至 Sep 30, 2026）。金額由「億」換算：$13.06億 = $1.31B、$3.15億 = $315M。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_druckenmiller_13f.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_druckenmiller_13f.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'druckenmiller-13f.json'), 'utf8'));
const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', sep: '#F2F4F7',
  up: '#00806B', upFill: '#00A98C', upTint: '#EAF7F4',
  down: '#D1400F', downFill: '#F1541E', downTint: '#FFF0EA',
  bar: '#00A98C', barTrack: '#EDF1F4'
};

/* 右上品牌標識 */
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

/* logo 快取 */
const logoCache = {};
function logoUri(tk) {
  if (!logoCache[tk]) {
    const p = path.join(BASE, 'assets', 'logos', `${tk}.png`);
    if (!fs.existsSync(p)) return null;
    logoCache[tk] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }
  return logoCache[tk];
}

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const fit = (s, size, max, weight = 700) =>
  textWidth(s, size, weight) > max ? Math.floor(size * max / textWidth(s, size, weight)) : size;

/* 圓形 logo 徽章：白底＋灰邊，內容居中留白 */
function badge(svg, defs, uid, tk, cx, cy, r, { border = true } = {}) {
  const uri = logoUri(tk);
  defs.push(`<clipPath id="c${uid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"${border ? ` stroke="${C.line}" stroke-width="1.2"` : ''}/>`);
  if (uri) {
    const box = +(r * 1.62).toFixed(1);
    svg.push(`<image x="${(cx - box / 2).toFixed(1)}" y="${(cy - box / 2).toFixed(1)}" width="${box}" height="${box}" href="${uri}" clip-path="url(#c${uid})" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/>`);
  } else {
    svg.push(t(cx, cy + 8, tk.slice(0, 2), { size: Math.round(r * 0.72), weight: 700, fill: C.gray, anchor: 'middle' }));
  }
}

/* ---- 版面 ---- */
let uid = 0;
const defs = [], svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);

/* 白底 */
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

/* 右上 OPM 字標，高 56 */
{
  const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
}

/* 標題（自適應縮字，不撞右上品牌標識） */
{
  const BRAND_MIN_X = W - M - 320;
  const avail = BRAND_MIN_X - M - 16;
  const TS = fit(D.title, 70, avail, 700);
  svg.push(t(M, 150, D.title, { size: TS, weight: 700, ls: -2 }));
  svg.push(t(M, 198, D.subtitle, { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="226" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 上半：Top 10 holdings 橫向柱狀圖 ---- */
const TOP_Y = 292, TOP_RH = 57;
svg.push(t(M, 278, 'TOP HOLDINGS', { size: 15, weight: 700, fill: C.dim, ls: 1.2 }));
svg.push(t(W - M, 278, '% OF BOOK', { size: 15, weight: 700, fill: C.dim, anchor: 'end', ls: 1.2 }));

const BAR_X = 380, BAR_W = 360, BAR_H = 22;
const VAL_X = 880, PCT_X = W - M;
const maxPct = Math.max(...D.holdings.map(r => parseFloat(r.pct)));

D.holdings.forEach((r, i) => {
  const y = TOP_Y + i * TOP_RH;
  if (i > 0) svg.push(`<rect x="${M}" y="${y}" width="${CW}" height="1" fill="${C.sep}"/>`);
  const cy = y + 32;

  /* logo 圓徽章 + ticker/name */
  badge(svg, defs, ++uid, r.tk, M + 26, cy, 23);
  svg.push(t(M + 60, cy - 1, r.tk, { size: 26, weight: 700, ls: -0.5 }));
  svg.push(t(M + 60, cy + 20, r.name, { size: 14, fill: C.gray }));

  /* 柱：灰色 track + teal 實條（條尾不加豎線刻度） */
  const pct = parseFloat(r.pct);
  const w = Math.max(6, Math.round(BAR_W * pct / maxPct));
  svg.push(rr(BAR_X, cy - BAR_H / 2, BAR_W, BAR_H, 6, C.barTrack));
  svg.push(rr(BAR_X, cy - BAR_H / 2, w, BAR_H, 6, C.bar));

  /* 市值與權重：同列大字（權重與市值錯位避免貼合） */
  svg.push(t(VAL_X, cy + 8, r.val, { size: 24, weight: 700, anchor: 'end' }));
  svg.push(t(PCT_X, cy + 8, r.pct, { size: 26, weight: 700, fill: C.ink, anchor: 'end' }));
});

/* ---- 下半：新建倉 / 清倉對比 ---- */
const LOW_Y = TOP_Y + D.holdings.length * TOP_RH + 22;   // 872
const COL_W = (CW - 28) / 2;
const COLS = [
  { x: M,            label: 'NEW POSITIONS', rows: D.added,  fill: C.upFill,  tint: C.upTint,  ink: C.up },
  { x: M + COL_W + 28, label: 'EXITED',       rows: D.exited, fill: C.downFill, tint: C.downTint, ink: C.down }
];

COLS.forEach((col, ci) => {
  /* 欄標題 pill */
  svg.push(rr(col.x, LOW_Y, COL_W, 44, 10, col.fill));
  svg.push(t(col.x + COL_W / 2, LOW_Y + 30, col.label, { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle', ls: 1 }));

  /* 10 檔 → 2 列 × 5 行 */
  const cellW = (COL_W - 10) / 2, cellH = 55;
  col.rows.forEach((r, i) => {
    const c = i % 2, ro = Math.floor(i / 2);
    const x = col.x + c * (cellW + 10), y = LOW_Y + 56 + ro * cellH;
    svg.push(rr(x, y, cellW, cellH - 6, 8, col.tint));
    badge(svg, defs, ++uid, r.tk, x + 26, y + (cellH - 6) / 2, 17, { border: false });
    const nmFit = fit(r.name, 14, cellW - 62, 400);
    svg.push(t(x + 50, y + 23, r.tk, { size: 19, weight: 700, fill: C.ink }));
    svg.push(t(x + 50, y + 40, r.name, { size: nmFit, fill: C.gray }));
  });
});

/* 頁尾 */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle: '@onepagemarket' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);

/* ---- 渲染輸出 ---- */
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'druckenmiller-13f-20261120';
const svgStr = svg.join('\n');
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map(f => FONT_DIRS.map(d => path.join(d, f)).find(p => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg
}).render().asPng();
fs.writeFileSync(path.join(outDir, `${stem}.png`), png);
console.log('PNG ->', path.join(outDir, `${stem}.png`), `(${(png.length / 1024).toFixed(0)} KB)`);

fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), D.caption);
console.log('caption chars:', D.caption.length, '(limit 280)');

const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));
