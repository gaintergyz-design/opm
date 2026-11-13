/**
 * OPM 專題卡 · Nvidia 10-Year P/E · 1080×1080 (square)
 *
 * 依阿澤 2026-11-13 提供之「英偉達十年估值變化」圖重製（全英文卡）：
 *   PE(TTM) 2016-11-13 → 2026-11-12、10 年均值 62.77x、±1 SD 27.8–97.8x、
 *   2023 峰值 ~237x、最新 20.77x。曲線由參考圖逐像素數位化後寫入 data/nvda-pe-decade.json。
 *
 * 版面：公司 3D 圓盤 logo 置於整卡正中、opacity 0.20 淡底（2026-11-13 阿澤二改，
 *       assets/nvda_disc.png 去背）＋十年折線＋均值/標準差帶＋右上大字最新值；
 *       右上 OPM 標識、統一頁腳聲明、淺底、無斜紋水印。
 *
 * 🔴 全卡英文、純淺底、正方形（2026-11-13 阿澤欽定）。
 * 🔴 配色：橘紅 #F1541E（P/E 線）／teal #00A98C（均值）／亮金 #FFB01C（+1 SD）。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_nvda_pe_decade.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'nvda-pe-decade.json'), 'utf8'));
const DISC = 'data:image/png;base64,' +
  fs.readFileSync(path.join(BASE, 'assets', 'nvda_disc.png')).toString('base64');

const W = 1080, H = 1080, M = 48;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', grid: '#E7EBF1',
  loss: '#F1541E', lossInk: '#B93C0B', lossTint: '#FDEDE7',
  gain: '#00A98C', gainInk: '#007A66',
  gold: '#FFB01C', goldTint: '#FFF7E4',
  bandLow: '#B6BEC9',
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
const fit = (s, size, max, weight = 700) =>
  tw(s, size, weight) > max ? Math.floor(size * max / tw(s, size, weight)) : size;

/* ---------------- 幾何 ---------------- */
const PLOT_L = 116, PLOT_R = W - M, PLOT_T = 300, PLOT_B = 812;
const YMAX = 250;
const PH = PLOT_B - PLOT_T, PW = PLOT_R - PLOT_L;
const yOf = (v) => PLOT_B - (v / YMAX) * PH;
const xOf = (i, n) => PLOT_L + (i / (n - 1)) * PW;

const a = [];
const defs = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.25" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#00A98C"/><stop offset="0.5" stop-color="#FFB01C"/>
  <stop offset="1" stop-color="#F1541E"/></linearGradient>`);
defs.push(`<linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#F1541E" stop-opacity="0.20"/>
  <stop offset="1" stop-color="#F1541E" stop-opacity="0.015"/></linearGradient>`);
defs.push(`<clipPath id="plotClip"><rect x="${PLOT_L}" y="${PLOT_T}" width="${PW}" height="${PH}"/></clipPath>`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
brandMark(a, { W, M, cy: 74, h: 34 });

/* ---------------- 圖中心半透明品牌圓盤（2026-11-13 阿澤欽定） ----------------
 * logo 置於整卡正中、opacity 0.20 做淡品牌底紋。
 * 繪製順序刻意放在網格／SD 帶之後、參考線與曲線之前：讓淡底均勻覆蓋底色，
 * 不被不透明的 SD 帶「切成兩截」，同時均值線／曲線／標註保持銳利。 */
const DISC_S = 440, DISC_X = (W - DISC_S) / 2, DISC_Y = (H - DISC_S) / 2;

/* ---------------- 標題區（logo 已移至圖中心，標題放大靠左） ---------------- */
a.push(t(M, 62, D.kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
a.push(t(M, 160, D.title, { size: fit(D.title, 64, W - M * 2, 700), weight: 700, ls: -1.4 }));
a.push(t(M, 202, D.subtitle, { size: fit(D.subtitle, 24, W - M * 2, 400), fill: C.gray }));
a.push(rr(M, 230, W - M * 2, 6, 3, 'url(#ruleG)'));

/* ---------------- 圖例 ---------------- */
const legend = [
  [PLOT_L, C.loss, 'P/E (TTM)'],
  [PLOT_L + 176, C.gain, '10Y AVG 62.77x'],
  [PLOT_L + 418, C.gold, '+/-1 SD BAND'],
];
legend.forEach(([x, col, label]) => {
  a.push(rr(x, 264, 15, 15, 4, col));
  a.push(t(x + 24, 277, label, { size: 15, weight: 500, fill: C.gray }));
});

/* ---------------- 繪圖區底：網格 / ±1 SD 帶 / 參考線 ---------------- */
for (let v = 0; v <= YMAX; v += 50) {
  const y = yOf(v);
  a.push(`<line x1="${PLOT_L}" y1="${y}" x2="${PLOT_R}" y2="${y}" stroke="${C.grid}" stroke-width="1.5"/>`);
  a.push(t(PLOT_L - 16, y + 6, String(v), { size: 17, fill: C.dim, anchor: 'end' }));
}
const yUp = yOf(D.upper), yLo = yOf(D.lower), yMean = yOf(D.mean);
a.push(rr(PLOT_L, yUp, PW, yLo - yUp, 0, C.goldTint));
a.push(`<image x="${DISC_X}" y="${DISC_Y}" width="${DISC_S}" height="${DISC_S}" href="${DISC}" opacity="0.20" preserveAspectRatio="xMidYMid meet"/>`);
a.push(`<line x1="${PLOT_L}" y1="${yUp}" x2="${PLOT_R}" y2="${yUp}" stroke="${C.gold}" stroke-width="3"/>`);
a.push(`<line x1="${PLOT_L}" y1="${yLo}" x2="${PLOT_R}" y2="${yLo}" stroke="${C.bandLow}" stroke-width="3"/>`);
a.push(`<line x1="${PLOT_L}" y1="${yMean}" x2="${PLOT_R}" y2="${yMean}" stroke="${C.gain}" stroke-width="3"/>`);

/* ---------------- P/E 曲線 ---------------- */
const n = D.series.length;
const pts = D.series.map((v, i) => `${xOf(i, n).toFixed(1)} ${yOf(v).toFixed(1)}`);
const lineD = 'M' + pts.join(' L');
const areaD = lineD + ` L ${PLOT_R} ${PLOT_B} L ${PLOT_L} ${PLOT_B} Z`;
a.push(`<g clip-path="url(#plotClip)">`);
a.push(`<path d="${areaD}" fill="url(#areaG)"/>`);
a.push(`<path d="${lineD}" fill="none" stroke="${C.loss}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`);
a.push('</g>');

/* ---------------- 峰值 / 最新值 標註 ---------------- */
const peakVal = Math.max(...D.series);
const peakIdx = D.series.indexOf(peakVal);
const px = xOf(peakIdx, n), py = yOf(peakVal);
a.push(t(px - 18, py + 2, `PEAK ${peakVal.toFixed(1)}x`, { size: 19, weight: 700, fill: C.lossInk, anchor: 'end' }));
a.push(t(px - 18, py + 24, '2023', { size: 15, fill: C.gray, anchor: 'end' }));
a.push(`<line x1="${px - 14}" y1="${py + 8}" x2="${px - 3}" y2="${py}" stroke="${C.lossInk}" stroke-width="1.6"/>`);

const cy = yOf(D.current);
a.push(`<circle cx="${PLOT_R}" cy="${cy}" r="9" fill="${C.loss}" stroke="#FFFFFF" stroke-width="3"/>`);
a.push(t(PLOT_R, 340, 'NVDA  /  NOV 12, 2026', { size: 15, weight: 500, fill: C.gray, anchor: 'end', ls: 1.6 }));
a.push(t(PLOT_R, 420, `${D.current.toFixed(2)}x`, { size: 78, weight: 700, fill: C.lossInk, anchor: 'end' }));
a.push(t(PLOT_R, 450, 'LATEST P/E (TTM)', { size: 17, weight: 500, fill: C.gray, anchor: 'end' }));

/* ---------------- x 軸年份 ---------------- */
for (let yr = D.start_year; yr <= D.end_year; yr += 2) {
  const x = PLOT_L + ((yr - D.start_year) / (D.end_year - D.start_year)) * PW;
  a.push(t(x, PLOT_B + 30, String(yr), { size: 17, fill: C.dim, anchor: 'middle' }));
}

/* ---------------- 底部註記 + 頁腳 ---------------- */
a.push(t(M, 890, D.note, { size: 19, weight: 500, fill: C.body || C.gray }));
pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.meta, handle });
a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

/* ---------------- 輸出 ---------------- */
const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = `nvda-pe-decade-${D.stamp}`;
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
