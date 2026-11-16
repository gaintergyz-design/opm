/**
 * OPM 專題卡：US Data Centers by State · 1080×1350
 *
 * 來源：阿澤提供的中文圖（美國各州在建及規劃數據中心規模，2026-10，DCMap），
 *       數據見 data/dc-states-20261116.json；阿澤指示：不需要驗證，來源寫「public market data」。
 * 版式：大標 + 副標 + 琥珀規則線 → 兩色 legend → 20 條橫向 bar（按 GW 排序，
 *       顏色 = 州長黨派：Dem 藍 / Rep 紅）→ 口徑註 + 來源行 → 統一頁尾。
 *       🔴 不套「標題下三欄 chips」路徑依賴，整版留給 bar chart。
 * OPM 規格：全英文、右上 assets/opm-logo.png（無手柄 pill、無斜紋水印）、統一頁尾聲明。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_dcstates.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_dcstates.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'dc-states-20261116.json'), 'utf8'));
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF',
  ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', grid: '#D7DCE4',
  dem: '#2E7CF6', rep: '#F1541E',
  amber: '#BA7517',
};
const HANDLE = '@onepagemarket';

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
function approx(s, sz) {
  return [...String(s)].reduce((a, ch) =>
    a + (/[A-Z0-9$]/.test(ch) ? 0.62 : /[a-z]/.test(ch) ? 0.52 : ch === ' ' ? 0.28 : 0.55), 0) * sz;
}

const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 全產線禁用斜紋水印（2026-11-13 欽定） */

/* ---- 右上 OPM 字標（取代 @onepagemarket 手柄 pill）---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區 ---- */
{
  const TS = Math.min(64, Math.floor(64 * (W - M * 2 - 140) / approx(D.headline, 64)));
  svg.push(t(M, 146, D.headline, { size: TS, weight: 700, ls: -2 }));
  svg.push(t(M, 188, D.subhead, { size: 22, fill: C.gray }));
  svg.push(`<rect x="${M}" y="212" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 圖例（Dem / Rep）---- */
{
  const ly = 250;
  const items = [[C.dem, D.party.D], [C.rep, D.party.R]];
  let x = M;
  items.forEach(([col, label]) => {
    svg.push(rrect(x, ly - 16, 20, 20, 5, col));
    svg.push(t(x + 30, ly, label, { size: 18, fill: C.gray }));
    x += 30 + approx(label, 18) + 44;
  });
}

/* ---- 橫向 bar chart（20 州，按 GW 降序）---- */
const X0 = 272;                     // 0 GW 位置
const PXGW = 6.55;                  // px per GW（100 GW 滿軸，TX 值標籤留頭）
const GRID = [0, 25, 50, 75, 100];
const AXL_Y = 296;                  // 軸刻度基線
const ROW0 = 320, ROW_H = 41, BAR_H = 22;
const CHART_BOT = ROW0 + ROW_H * D.rows.length;   // 1140

GRID.forEach((g) => {
  const gx = X0 + g * PXGW;
  svg.push(`<line x1="${gx}" y1="${AXL_Y + 10}" x2="${gx}" y2="${CHART_BOT}" stroke="${C.grid}" stroke-width="1.2" stroke-dasharray="5 6"/>`);
  svg.push(t(gx, AXL_Y, g === 0 ? '0' : `${g} GW`, { size: 14, fill: C.dim, anchor: g === 0 ? 'start' : 'middle' }));
});

D.rows.forEach((r, i) => {
  const cy = ROW0 + i * ROW_H + ROW_H / 2;
  const col = r.party === 'D' ? C.dem : C.rep;
  /* 左側州名：縮寫粗體 + 全名灰 */
  svg.push(t(M, cy + 7, r.abbr, { size: 19, weight: 700, fill: C.ink }));
  svg.push(t(M + 52, cy + 7, r.name, { size: 18, fill: C.gray }));
  /* bar（首位德州加粗視覺：同色，值放大） */
  const bw = Math.max(6, r.gw * PXGW);
  svg.push(rrect(X0, cy - BAR_H / 2, bw, BAR_H, 4, col));
  const first = i === 0;
  svg.push(t(X0 + bw + 10, cy + (first ? 7 : 6), `${r.gw.toFixed(1)} GW`,
    { size: first ? 20 : 17, weight: first ? 700 : 500, fill: first ? C.ink : C.gray }));
});

/* ---- 口徑註 + 來源 ---- */
{
  const my = CHART_BOT + 30;
  svg.push(t(M, my, D.note1, { size: 14, fill: C.dim }));
  svg.push(t(M, my + 20, D.note2, { size: 14, fill: C.dim }));
  svg.push(t(M, my + 44, D.source, { size: 15, weight: 500, fill: C.amber }));
}

/* ---- OPM 統一頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, meta: 'US states · Oct 2026', handle: HANDLE });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = D.stem;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB, ${W}x${H} @2x)`);

/* gen-times（畫廊時間戳第一層；推送前另與遠端 union）*/
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案（疑問句開頭、簡短、活人感；單句 <=90、全文 <=280）*/
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
