/**
 * OPM 專題卡：ANT 上市破發 · 多日蠟燭走勢 · 1080×1350
 *
 * 阿澤 2026-11-25 二改（參考圖欽定）：走勢圖改成參考截圖樣式——
 *  - 多日 5m 蠟燭（卡面用 15m 聚合 95 根，視頻版用 5m 285 根）；
 *  - Open $111.50 綠虛線（11/19 11:45 開盤）＋ IPO $83 橘虛線；
 *  - 紅色橢圓圈出 11/24 破發下探＋反抽區；
 *  - 蠟燭色：漲 #00A98C／跌 #F1541E（OPM 色板）。
 * 數據：data/ant-break-20261124.json（candles15/candles，Yahoo，禁止手改數字）。
 * 卡面全英文、右上 OPM 字標、統一頁尾（lib/disclaimer）。
 * 佈局：圖 x0=116→x1=742，右欄 Dario 頭像＋兩數據塊；低點/收盤數字改為
 *       軸下統計行（軸下空間乾淨，避免壓蠟燭）。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_ant_break.js
 *       PREVIEW=1 NODE_PATH=./node_modules node scripts/build_ant_break.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ant-break-20261124.json'), 'utf8'));
const P = D.candles15;

const OPM_LOGO_URI = 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png')).toString('base64');
const ANT_LOGO_URI = 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'logos', 'ANT.png')).toString('base64');
const DARIO_URI = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'founders', 'dario.jpg')).toString('base64');

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC',
  red: '#F1541E', redDeep: '#D1400F', redTint: '#FFF1E8',
  green: '#00A98C', goldInk: '#C35C06',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
function approx(s, sz) {
  return [...String(s)].reduce((a, ch) => {
    if (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch)) return a + 1.0 * sz;
    if (/[A-Z0-9]/.test(ch)) return a + 0.62 * sz;
    if (/[a-z]/.test(ch)) return a + 0.52 * sz;
    if (ch === ' ') return a + 0.28 * sz;
    return a + 0.55 * sz;
  }, 0);
}
function fit(s, base, maxW) {
  const w = approx(s, base);
  return w <= maxW ? base : Math.max(14, Math.floor(base * (maxW - 6) / w));
}

/* ---- 蠟燭圖座標 ---- */
const CH = { x0: 116, x1: 742, y0: 450, y1: 940 };
const YMIN = 74.5, YMAX = 116.5;
const X = (i) => CH.x0 + (CH.x1 - CH.x0) * ((i + 0.5) / P.length);
const Y = (v) => CH.y1 - (CH.y1 - CH.y0) * ((v - YMIN) / (YMAX - YMIN));
const UP = C.green, DOWN = C.red;
const OPEN_PX = 111.5, IPO_PX = 83.0;

const dayIdx = {};                                       // 每個交易日首根 index
P.forEach((b, i) => { if (!(b.d in dayIdx)) dayIdx[b.d] = i; });
const iLo = P.findIndex((b) => b.l === Math.min(...P.map((x) => x.l)));
const iEnd = P.length - 1;

const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

/* ---- 靜態頭部 ---- */
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
{
  const lh = 56, lw = Math.round(lh * 2.2);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}
{
  const cy = 91, r = 34, cx = M + r;
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.2"/>`);
  svg.push(`<image x="${cx - r + 7}" y="${cy - r + 7}" width="${(r - 7) * 2}" height="${(r - 7) * 2}" href="${ANT_LOGO_URI}" image-rendering="optimizeQuality"/>`);
  svg.push(t(M + 84, 84, 'Anthropic', { size: 36, weight: 700, fill: C.ink }));
  svg.push(t(M + 84, 114, 'ANT · Nasdaq · Nov 19\u201324, 2026', { size: 19, fill: C.gray, ls: 0.5 }));
}
const TITLE_L1 = 'Anthropic breaks IPO price, plunges 14%!';
const TITLE_L2 = 'Founders cash out over $560M next day';
const TITLE_L3 = 'Jensen Huang\u2019s return escalates AI route fight';
svg.push(t(M, 216, TITLE_L1, { size: fit(TITLE_L1, 58, CW), weight: 700, fill: C.red, ls: -1 }));
svg.push(t(M, 274, TITLE_L2, { size: fit(TITLE_L2, 38, CW), weight: 700, fill: C.ink, ls: -0.5 }));
svg.push(t(M, 324, TITLE_L3, { size: fit(TITLE_L3, 38, CW), weight: 700, fill: C.ink, ls: -0.5 }));

svg.push(t(M, 432, '15-min candles · Nov 19\u201324', { size: 19, weight: 600, fill: C.gray, ls: 1 }));
svg.push(t(CH.x1, 432, 'USD', { size: 17, fill: C.dim, anchor: 'end' }));

/* ---- 網格＋Y 軸 ---- */
[80, 85, 90, 95, 100, 105, 110, 115].forEach((v) => {
  svg.push(`<line x1="${CH.x0}" y1="${Y(v)}" x2="${CH.x1}" y2="${Y(v)}" stroke="${C.line}" stroke-width="1"/>`);
  svg.push(t(CH.x0 - 12, Y(v) + 5, '$' + v, { size: 15, fill: C.dim, anchor: 'end' }));
});

/* ---- Open / IPO 虛線 ---- */
svg.push(`<line x1="${CH.x0}" y1="${Y(OPEN_PX)}" x2="${CH.x1}" y2="${Y(OPEN_PX)}" stroke="${C.green}" stroke-width="2" stroke-dasharray="9 7"/>`);
svg.push(t(CH.x1 - 8, Y(OPEN_PX) - 10, 'Open $111.50', { size: 20, weight: 700, fill: C.green, anchor: 'end' }));
svg.push(`<line x1="${CH.x0}" y1="${Y(IPO_PX)}" x2="${CH.x1}" y2="${Y(IPO_PX)}" stroke="${C.goldInk}" stroke-width="2" stroke-dasharray="9 7"/>`);
svg.push(t(CH.x0 + 8, Y(IPO_PX) - 10, 'IPO $83', { size: 20, weight: 700, fill: C.goldInk }));

/* ---- 蠟燭 ---- */
const barW = (CH.x1 - CH.x0) / P.length;
const bodyW = Math.max(2.4, barW * 0.62), wickW = 1.4;
P.forEach((b, i) => {
  const up = b.c >= b.o, col = up ? UP : DOWN;
  const x = X(i), bh = Math.max(1, Math.abs(Y(b.o) - Y(b.c)));
  const byTop = Y(Math.max(b.o, b.c));
  svg.push(`<line x1="${x}" y1="${Y(b.h)}" x2="${x}" y2="${Y(b.l)}" stroke="${col}" stroke-width="${wickW}"/>`);
  svg.push(rrect(x - bodyW / 2, byTop, bodyW, bh, 0.8, col));
});

/* ---- X 軸＋日期標籤 ---- */
svg.push(`<line x1="${CH.x0}" y1="${CH.y1}" x2="${CH.x1}" y2="${CH.y1}" stroke="${C.line}" stroke-width="1.4"/>`);
const dateNames = { '2026-11-19': '11/19', '2026-11-20': '11/20', '2026-11-23': '11/23', '2026-11-24': '11/24' };
Object.entries(dayIdx).forEach(([d, i]) => {
  svg.push(t(X(i), CH.y1 + 24, dateNames[d], { size: 15, weight: 600, fill: C.gray, anchor: 'middle' }));
});
P.forEach((b, i) => {
  if (b.t === '13:00' && Math.abs(X(i) - X(dayIdx[b.d])) > 70)
    svg.push(t(X(i), CH.y1 + 24, '13:00', { size: 14, fill: C.dim, anchor: 'middle' }));
});

/* ---- 紅圈（已移除：阿澤 2026-11-25 欽定去掉）---- */

/* ---- 軸下統計行 ---- */
svg.push(t(M, 1002, 'Nov 24:  ', { size: 19, weight: 600, fill: C.gray }));
svg.push(t(M + 90, 1002, 'low $75.61 (-13.7%)', { size: 19, weight: 700, fill: C.redDeep }));
svg.push(t(M + 344, 1002, '·  close $81.90 (-6.55%)', { size: 19, weight: 700, fill: C.red }));

/* ---- 右欄：Dario 頭像＋身份＋數據 ---- */
{
  const PX = 778, PW = W - M - PX;
  const cx = PX + PW / 2, acy = 540, ar = 100;
  defs.push(`<clipPath id="avClip"><circle cx="${cx}" cy="${acy}" r="${ar - 5}"/></clipPath>`);
  svg.push(`<circle cx="${cx}" cy="${acy}" r="${ar}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.5"/>`);
  svg.push(`<image x="${cx - ar + 5}" y="${acy - ar + 5}" width="${(ar - 5) * 2}" height="${(ar - 5) * 2}"
    preserveAspectRatio="xMidYMid slice" clip-path="url(#avClip)" href="${DARIO_URI}" image-rendering="optimizeQuality"/>`);
  svg.push(t(cx, acy + ar + 40, 'Dario Amodei', { size: 27, weight: 700, fill: C.ink, anchor: 'middle' }));
  svg.push(t(cx, acy + ar + 68, 'Anthropic co-founder · CEO', { size: 16, fill: C.gray, anchor: 'middle' }));

  const b1y = acy + ar + 100, bh = 118;
  svg.push(rrect(PX, b1y, PW, bh, 14, C.redTint, `stroke="#F8C6A8" stroke-width="1.2"`));
  svg.push(t(cx, b1y + 34, 'Sold next day after IPO', { size: 16, weight: 600, fill: C.gray, anchor: 'middle' }));
  svg.push(t(cx, b1y + 72, '>$560M', { size: 34, weight: 700, fill: C.redDeep, anchor: 'middle' }));
  svg.push(t(cx, b1y + 100, 'combined with sister Daniela', { size: 15, fill: C.gray, anchor: 'middle' }));

  const b2y = b1y + bh + 16, bh2 = 92;
  svg.push(rrect(PX, b2y, PW, bh2, 14, '#F4F6FA', `stroke="${C.line}" stroke-width="1.2"`));
  svg.push(t(cx, b2y + 32, 'Market cap briefly', { size: 16, weight: 600, fill: C.gray, anchor: 'middle' }));
  svg.push(t(cx, b2y + 70, 'fell below $1T', { size: 26, weight: 700, fill: C.ink, anchor: 'middle' }));
}

/* ---- OPM 統一頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, meta: 'As of Nov 24, 2026 · ET', handle: '@onepagemarket' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = D.stem;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const LIB = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => path.join(LIB, f))
  .filter((p) => fs.existsSync(p));

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB, ${W}x${H} @2x)`);

const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

const CAPTION = [
  'Anthropic below its $83 IPO price already? Low $75.61, closed $81.90 (-6.55%).',
  'Founders Dario & Daniela Amodei sold $560M+ the day after listing.',
  'And Jensen Huang \u2014 pro open models, anti new AI rules \u2014 is back running Nvidia.',
].join('\n');
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
