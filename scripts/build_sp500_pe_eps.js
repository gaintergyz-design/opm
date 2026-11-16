/**
 * OPM-專題卡：S&P 500 Forward P/E vs Forward EPS (YoY) · 1080×1350
 *
 * 觸發：阿澤提供 MacroMicro 圖（US - S&P 500 - Forward PE Ratio & EPS, 3y），
 *       重製為 OPM 格式（2026-11-16）。阿澤欽定「不需要驗證數據」——
 *       序列按原圖形態逐月抄錄，內嵌於 DATA。
 *
 * 🔴 遵守：全英文、右上 assets/opm-logo.png、統一頁尾聲明、無斜紋水印、
 *   不做「標題 → 三欄 chips」路徑依賴、無高亮條／橫線堆砌、留白充足、字級放大。
 * 配色（§5）：teal #00A98C（P/E 線）、橙 #F1541E（EPS 線），零線加重。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_sp500_pe_eps.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_sp500_pe_eps.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7',
  pe: '#00A98C',   // Forward P/E (YoY) — teal
  eps: '#F1541E',  // Forward EPS (YoY) — orange
};

/* 🔴 右上角品牌標識＝OPM 字標圖片（resvg 只認 data URI）*/
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

/* ---- 數據：按 MacroMicro 原圖（3y）逐月抄錄，YoY %，2024-01 → 2026-11 ---- */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const START_YEAR = 2024;
const PE  = [10, 13, 14, 15, 19, 14, 13, 12, 12, 20, 22, 20,
             17, 12,  5, -2, -5,  2,  3,  8,  7,  5,  1,  0,
              1,  0, -1,  0,  5,  2, -1, -5,-10,-13,-15,-20];
const EPS = [ 5,  8, 10, 11, 12, 13, 13, 13, 12, 13, 13, 13,
             13, 12, 12, 12, 11, 10,  9,  8,  9, 10, 12, 14,
             16, 19, 22, 25, 28, 30, 32, 33, 35, 36, 37, 38];
const N = PE.length;                       // 35 個月點
const LAST_PE = PE[N - 1], LAST_EPS = EPS[N - 1];

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* 標題自適應縮字（右上留 logo 寬度） */
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fitTitle = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 畫布 ---- */
const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區：只兩行，不加 chips ---- */
const TITLE = 'S&P 500: the multiple is shrinking';
svg.push(t(M, 156, TITLE, { size: fitTitle(TITLE, 64, CW - 170), weight: 700, ls: -1.5 }));
svg.push(t(M, 206, 'Forward P/E vs forward EPS, year-over-year % growth · 3-year view',
  { size: 24, fill: C.gray }));

/* ---- 圖表區 ---- */
const PLOT = { x: M + 64, y: 300, w: CW - 64 - 130, h: 640 };
const Y_MAX = 50, Y_MIN = -25;
const xAt = (i) => PLOT.x + (PLOT.w * i) / (N - 1);
const yAt = (v) => PLOT.y + (PLOT.h * (Y_MAX - v)) / (Y_MAX - Y_MIN);

/* 橫向網格 + Y 軸刻度（-25 / 0 / 25 / 50） */
[-25, 0, 25, 50].forEach((v) => {
  const y = yAt(v);
  if (v === 0) {
    svg.push(`<line x1="${PLOT.x}" y1="${y}" x2="${PLOT.x + PLOT.w}" y2="${y}" stroke="${C.ink}" stroke-width="2.5" opacity="0.55"/>`);
  } else {
    svg.push(`<line x1="${PLOT.x}" y1="${y}" x2="${PLOT.x + PLOT.w}" y2="${y}" stroke="${C.line}" stroke-width="1.5"/>`);
  }
  svg.push(t(PLOT.x - 14, y + 8, String(v), { size: 21, fill: C.dim, anchor: 'end' }));
});
svg.push(t(PLOT.x - 14, PLOT.y - 22, '%', { size: 19, fill: C.dim, anchor: 'end' }));

/* X 軸年份刻度（每年 1 月） */
[0, 12, 24].forEach((i, k) => {
  svg.push(t(xAt(i), PLOT.y + PLOT.h + 44, String(START_YEAR + k), { size: 23, fill: C.gray, anchor: 'middle' }));
});

/* 兩條折線（EPS 先畫，P/E 壓上層） */
const pathOf = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
svg.push(`<path d="${pathOf(EPS)}" fill="none" stroke="${C.eps}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>`);
svg.push(`<path d="${pathOf(PE)}" fill="none" stroke="${C.pe}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>`);

/* 端點 + 端值大字 */
{
  const ex = xAt(N - 1), yEps = yAt(LAST_EPS), yPe = yAt(LAST_PE);
  svg.push(`<circle cx="${ex}" cy="${yEps}" r="10" fill="${C.eps}"/>`);
  svg.push(`<circle cx="${ex}" cy="${yPe}" r="10" fill="${C.pe}"/>`);
  const lbl = (y, v, color) => {
    const s = (v < 0 ? '-' : '+') + Math.abs(v) + '%';
    svg.push(t(ex + 20, y + 9, s, { size: 34, weight: 700, fill: color }));
  };
  lbl(yEps, LAST_EPS, C.eps);
  lbl(yPe, LAST_PE, C.pe);
}

/* ---- 圖例（放圖表正下方，大號清晰）---- */
{
  const ly = PLOT.y + PLOT.h + 108;
  const item = (x, color, label) => {
    svg.push(rrect(x, ly - 15, 34, 10, 5, color));
    svg.push(t(x + 48, ly, label, { size: 26, weight: 500, fill: C.ink }));
  };
  item(M, C.pe, 'Forward P/E ratio (YoY)');
  item(M + 460, C.eps, 'Forward EPS (YoY)');
}

/* ---- 收尾大註腳：兩個關鍵數字各一行，字級放大 ---- */
{
  const fy = ly2();  // 圖例下方
  function ly2() { return PLOT.y + PLOT.h + 178; }
  svg.push(t(M, fy,
    'Nov 2026: forward EPS growth ' + '+' + LAST_EPS + '%',
    { size: 30, weight: 700, fill: C.eps }));
  svg.push(t(M, fy + 46,
    'Forward P/E growth ' + (LAST_PE < 0 ? '-' : '+') + Math.abs(LAST_PE) + '% and falling',
    { size: 30, weight: 700, fill: C.pe }));
}

/* ---- 頁尾（統一聲明）---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'S&P 500 · forward estimates · YoY %' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('\n')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'sp500-pe-eps-20261116';
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
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);

/* gen-times（畫廊時間戳第一層） */
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案（疑問句開頭、簡短、活人感、≤280） */
const CAPTION =
  `When was the last time earnings grew this fast while the multiple shrank this hard?\n` +
  `S&P 500 forward EPS growth is running +38% YoY — forward P/E growth just hit -20%.\n` +
  `One page ↓`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
