/**
 * OPM 視頻卡：ANT 破發走勢動畫（多日蠟燭版）· 1080×1350 mp4
 *
 * 阿澤 2026-11-25 二改（參考圖欽定，與圖片版同步）：
 *  - 走勢圖改為 11/19–24 多日 5m 蠟燭（285 根），無右欄、左右貫通（x0=116→x1=964）；
 *  - Open $111.50 綠虛線＋IPO $83 橘虛線；紅色橢圓在跌破低點後淡入；
 *  - 頭像縮小（r=46），始終騎在當前蠟燭收盤價上方跟隨；
 *    上漲＝笑臉 dario_happy.jpg／下跌＝哭臉 dario_sad.jpg（4 根滑窗防抖）；
 *  - Y 軸標籤放右側（對齊參考圖）；低點/收盤數字在軸下統計行。
 * 幀：285 根蠟燭逐根動畫 + 48 幀定格，30fps ≈ 11.1s。
 * 編碼：python3 + imageio-ffmpeg（本機無系統 ffmpeg）。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_ant_break_video.js
 *       之後按輸出提示用 imageio 合成 out/ant-break-20261124.mp4
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ant-break-20261124.json'), 'utf8'));
const P = D.candles;                                     // 5m 285 根

const OPM_LOGO_URI = 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png')).toString('base64');
const ANT_LOGO_URI = 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'logos', 'ANT.png')).toString('base64');
const HAPPY_URI = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'founders', 'dario_happy.jpg')).toString('base64');
const SAD_URI = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'founders', 'dario_sad.jpg')).toString('base64');

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

/* ---- 蠟燭圖座標（全寬，Y 軸標籤在右）---- */
const CH = { x0: 116, x1: 964, y0: 450, y1: 940 };
const YMIN = 74.5, YMAX = 116.5;
const X = (i) => CH.x0 + (CH.x1 - CH.x0) * ((i + 0.5) / P.length);
const Y = (v) => CH.y1 - (CH.y1 - CH.y0) * ((v - YMIN) / (YMAX - YMIN));
const UP = C.green, DOWN = C.red;
const OPEN_PX = 111.5, IPO_PX = 83.0;
const AV_R = 46, DIR_WIN = 4;

const dayIdx = {};
P.forEach((b, i) => { if (!(b.d in dayIdx)) dayIdx[b.d] = i; });
const iLo = P.findIndex((b) => b.l === Math.min(...P.map((x) => x.l)));
const iEnd = P.length - 1;

function isHappy(i) {
  const j = Math.max(0, i - DIR_WIN);
  return P[i].c >= P[j].c;
}

function frameSvg(nBars, { showEnd }) {
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

  svg.push(t(M, 432, '5-min candles · Nov 19\u201324', { size: 19, weight: 600, fill: C.gray, ls: 1 }));
  svg.push(t(CH.x1, 432, 'USD', { size: 17, fill: C.dim, anchor: 'end' }));

  /* ---- 網格＋Y 軸（右側）---- */
  [80, 85, 90, 95, 100, 105, 110, 115].forEach((v) => {
    svg.push(`<line x1="${CH.x0}" y1="${Y(v)}" x2="${CH.x1}" y2="${Y(v)}" stroke="${C.line}" stroke-width="1"/>`);
    svg.push(t(CH.x1 + 12, Y(v) + 5, '$' + v, { size: 15, fill: C.dim }));
  });

  /* ---- Open / IPO 虛線 ---- */
  svg.push(`<line x1="${CH.x0}" y1="${Y(OPEN_PX)}" x2="${CH.x1}" y2="${Y(OPEN_PX)}" stroke="${C.green}" stroke-width="2" stroke-dasharray="9 7"/>`);
  svg.push(t(CH.x1 - 8, Y(OPEN_PX) - 10, 'Open $111.50', { size: 20, weight: 700, fill: C.green, anchor: 'end' }));
  svg.push(`<line x1="${CH.x0}" y1="${Y(IPO_PX)}" x2="${CH.x1}" y2="${Y(IPO_PX)}" stroke="${C.goldInk}" stroke-width="2" stroke-dasharray="9 7"/>`);
  svg.push(t(CH.x0 + 8, Y(IPO_PX) - 10, 'IPO $83', { size: 20, weight: 700, fill: C.goldInk }));

  /* ---- 蠟燭（畫到 nBars）---- */
  const barW = (CH.x1 - CH.x0) / P.length;
  const bodyW = Math.max(1.6, barW * 0.62), wickW = 1.2;
  for (let i = 0; i < nBars; i++) {
    const b = P[i];
    const up = b.c >= b.o, col = up ? UP : DOWN;
    const x = X(i), bh = Math.max(0.8, Math.abs(Y(b.o) - Y(b.c)));
    const byTop = Y(Math.max(b.o, b.c));
    svg.push(`<line x1="${x}" y1="${Y(b.h)}" x2="${x}" y2="${Y(b.l)}" stroke="${col}" stroke-width="${wickW}"/>`);
    svg.push(rrect(x - bodyW / 2, byTop, bodyW, bh, 0.5, col));
  }

  /* ---- X 軸＋日期標籤（隨進度浮現當日標籤）---- */
  svg.push(`<line x1="${CH.x0}" y1="${CH.y1}" x2="${CH.x1}" y2="${CH.y1}" stroke="${C.line}" stroke-width="1.4"/>`);
  const dateNames = { '2026-11-19': '11/19', '2026-11-20': '11/20', '2026-11-23': '11/23', '2026-11-24': '11/24' };
  Object.entries(dayIdx).forEach(([d, i]) => {
    if (nBars > i) svg.push(t(X(i), CH.y1 + 24, dateNames[d], { size: 15, weight: 600, fill: C.gray, anchor: 'middle' }));
  });
  P.forEach((b, i) => {
    if (b.t === '13:00' && Math.abs(X(i) - X(dayIdx[b.d])) > 70 && nBars > i)
      svg.push(t(X(i), CH.y1 + 24, '13:00', { size: 14, fill: C.dim, anchor: 'middle' }));
  });

  /* ---- 紅圈（已移除：阿澤 2026-11-25 欽定去掉）---- */

  /* ---- 跟隨頭像（騎在最新一根收盤價上方）---- */
  if (nBars > 0) {
    const i = nBars - 1;
    const px = X(i), py = Y(P[i].c);
    const ax = Math.min(Math.max(px, CH.x0 + AV_R + 4), CH.x1 - AV_R - 4);
    const ay = Math.max(py - AV_R - 24, CH.y0 + AV_R);
    const happy = isHappy(i);
    defs.push(`<clipPath id="avClip"><circle cx="${ax}" cy="${ay}" r="${AV_R - 4}"/></clipPath>`);
    svg.push(`<circle cx="${ax}" cy="${ay}" r="${AV_R}" fill="#FFFFFF" stroke="${C.line}" stroke-width="2"/>`);
    svg.push(`<image x="${ax - AV_R + 4}" y="${ay - AV_R + 4}" width="${(AV_R - 4) * 2}" height="${(AV_R - 4) * 2}"
      preserveAspectRatio="xMidYMid slice" clip-path="url(#avClip)" href="${happy ? HAPPY_URI : SAD_URI}" image-rendering="optimizeQuality"/>`);
    svg.push(`<circle cx="${px}" cy="${py}" r="5" fill="${C.red}" stroke="#FFFFFF" stroke-width="1.8"/>`);
  }

  /* ---- 收盤統計（定格段出現）---- */
  if (showEnd) {
    svg.push(t(M, 1002, 'Nov 24:  ', { size: 19, weight: 600, fill: C.gray }));
    svg.push(t(M + 90, 1002, 'low $75.61 (-13.7%)', { size: 19, weight: 700, fill: C.redDeep }));
    svg.push(t(M + 344, 1002, '\u00b7  close $81.90 (-6.55%)', { size: 19, weight: 700, fill: C.red }));
  }

  /* ---- 靜態底部 ---- */
  pushFooter(t, svg, { M, W, H, C, meta: 'As of Nov 24, 2026 · ET', handle: '@onepagemarket' });

  svg.push('</svg>');
  svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return svg.join('\n');
}

/* ---- 出幀：285 根逐根 + 48 幀定格 ---- */
const frameDir = path.join(BASE, 'out', '_ant_video');
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => path.join(process.env.HOME || '', 'Library', 'Fonts', f))
  .filter((p) => fs.existsSync(p));

const holdFrames = 48;
let n = 0;
const t0 = Date.now();
for (let bars = 1; bars <= P.length; bars++) {
  const s = frameSvg(bars, { showEnd: false });
  const png = new Resvg(s, { fitTo: { mode: 'width', value: W }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT }, background: C.bg }).render().asPng();
  fs.writeFileSync(path.join(frameDir, `f${String(++n).padStart(4, '0')}.png`), png);
}
for (let f = 0; f < holdFrames; f++) {
  const s = frameSvg(P.length, { showEnd: true });
  const png = new Resvg(s, { fitTo: { mode: 'width', value: W }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT }, background: C.bg }).render().asPng();
  fs.writeFileSync(path.join(frameDir, `f${String(++n).padStart(4, '0')}.png`), png);
}
console.log(`frames: ${n} -> ${frameDir} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log('encode: python3 -c "import imageio.v2 as iio,glob;fs=sorted(glob.glob(\'out/_ant_video/f*.png\'));w=iio.get_writer(\'out/ant-break-20261124.mp4\',fps=30,codec=\'libx264\',quality=8,macro_block_size=2);[w.append_data(iio.imread(f)) for f in fs];w.close()"');
