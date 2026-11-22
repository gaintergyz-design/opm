/**
 * OPM-專題卡：How long to the bottom（每次危機見底要多久）· 1080×1350
 *
 * 觸發：阿澤出題「2008/2020/2022/2025 每次下跌從最高點到最低點的時間與幅度」，
 *       標題「每一次危機需要多久才能見底」（2026-11-22）。與 After every crash（反彈角度）
 *       同一套已核驗數據，突出重點不同：本卡只看 下跌段（高點→低點）。
 * 數據源：復用 build_crashbounces.js 內嵌的 PANELS（Sina 財經 .INX 日 K，2026-11-20 全量重算，
 *         禁止手改）。時間 = 收市高點 → 收市低點的自然日；月數 = 天數 ÷ 30.44。
 *   2008：517 天 ≈ 17.0 個月，-57%；2020：33 天 ≈ 1.1 個月，-34%；
 *   2022：282 天 ≈ 9.3 個月，-25%；2025：48 天 ≈ 1.6 個月，-19%。
 *   四輪中位數：-22%、5.4 個月。
 * 版式：2×2 走勢圖網格，每格大號「時間」為主角＋右側大號紅色跌幅＋僅下跌段的走勢線（帶淺紅面積），
 *       右上 assets/opm-logo.png、無手柄 pill、無斜紋水印、統一頁尾聲明。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_crashbottom.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_crashbottom.js   # 寫 out/_preview/
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
  line: '#E4E7EC', panel: '#F8F9FB', panelLine: '#ECEDF1',
  up: '#15A05D', down: '#F2596B',
};
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* ---- 復用已核驗數據（從 build_crashbounces.js 提取，禁止手改）---- */
const src = fs.readFileSync(path.join(__dirname, 'build_crashbounces.js'), 'utf8');
const m = src.match(/const PANELS = \/\*__DATA__\*\/(\[.*?\]);/s);
if (!m) { console.error('FATAL: cannot extract PANELS from build_crashbounces.js'); process.exit(1); }
const PANELS = JSON.parse(m[1]);

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dShort = (iso) => {           /* 2025-04-08 -> Apr 8 '25 */
  const [y, mm, d] = iso.split('-').map(Number);
  const yy = String(y % 100).padStart(2, '0');
  return `${MO[mm - 1]} ${d} '${yy}`;
};
const num = (v) => Math.round(v).toLocaleString('en-US');
const ts = (iso) => Date.parse(iso + 'T00:00:00Z') / 86400000;
const d8iso = (d8) => d8.toString().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

/* 時間主數字：≤90 天用「N days」，否則用月（≥10 個月取整，其餘一位小數） */
function timeHero(days) {
  if (days <= 90) return `${days} days`;
  const mo = days / 30.44;
  return mo >= 10 ? `${Math.round(mo)} months` : `${mo.toFixed(1)} months`;
}
const timeSub = (days) =>
  days <= 90 ? `${(days / 30.44).toFixed(1)} months peak \u2192 trough`
             : `${days} days peak \u2192 trough`;

/* ---- 畫布 ---- */
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

/* ---- 右上 OPM 字標（取代手柄 pill）---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區 ---- */
{
  svg.push(t(M, 148, 'How long to the bottom', { size: 76, weight: 700, ls: -2 }));
  svg.push(t(M, 194, 'Four S&P 500 selloffs \u2014 days from the peak to the low, and how deep each one fell',
    { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="220" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 2×2 走勢圖網格 ---- */
const PW = 480, PH = 448, GAP = 24;
const GX = [M, M + PW + GAP], GY = [252, 252 + PH + GAP];
PANELS.forEach((p, i) => {
  const x0 = GX[i % 2], y0 = GY[Math.floor(i / 2)];
  const cx0 = x0 + 28, cx1 = x0 + PW - 28;            /* 圖表左右 */
  const cy0 = y0 + 160, cy1 = y0 + 380;               /* 圖表上下 */

  /* 底板 */
  svg.push(rrect(x0, y0, PW, PH, 20, C.panel, `stroke="${C.panelLine}" stroke-width="1"`));

  /* 頭行：年代 + 事件 | 右側大號紅色跌幅 */
  svg.push(t(x0 + 24, y0 + 42, p.year, { size: 32, weight: 700 }));
  svg.push(t(x0 + 100, y0 + 40, `\u00B7 ${p.event}`, { size: 16, fill: C.gray }));
  svg.push(t(x0 + PW - 24, y0 + 44, `-${Math.abs(p.depth).toFixed(0)}%`, { size: 36, weight: 700, fill: C.down, anchor: 'end' }));
  svg.push(t(x0 + PW - 24, y0 + 66, 'peak-to-trough', { size: 13, fill: C.dim, anchor: 'end' }));

  /* 時間主數字（本卡主角） */
  const all = p.pts;
  const peakI = all.findIndex(([d]) => d === Math.round(parseFloat(p.peak[0].replace(/-/g, ''))));
  const botI = all.findIndex(([d]) => d === Math.round(parseFloat(p.bottom[0].replace(/-/g, ''))));
  const days = Math.round(ts(p.bottom[0]) - ts(p.peak[0]));
  svg.push(t(x0 + 24, y0 + 112, timeHero(days), { size: 30, weight: 700 }));
  svg.push(t(x0 + 24, y0 + 136, `${timeSub(days)} \u00B7 ${dShort(p.peak[0])} \u2192 ${dShort(p.bottom[0])}`,
    { size: 14, fill: C.gray }));

  /* 座標：僅下跌段（高點→低點） */
  const ymin = p.bottom[1] * 0.97, ymax = p.peak[1] * 1.02;
  const tmin = ts(d8iso(all[peakI][0])), tmax = ts(d8iso(all[botI][0]));
  const X = (d8) => cx0 + (ts(d8iso(d8)) - tmin) / (tmax - tmin) * (cx1 - cx0);
  const Y = (v) => cy1 - (v - ymin) / (ymax - ymin) * (cy1 - cy0);

  /* 走勢線（全段紅＝跌）＋淺紅面積 */
  const seg = all.slice(peakI, botI + 1);
  const linePts = seg.map(([d, v]) => `${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const areaPts = `${cx0},${cy1} ${linePts} ${cx1},${cy1}`;
  svg.push(`<polygon points="${areaPts}" fill="${C.down}" opacity="0.08"/>`);
  svg.push(`<polyline points="${linePts}" fill="none" stroke="${C.down}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);

  /* 標注點：最高點（上方）／最低點（下方） */
  const dot = (d8, v, fill, r = 5) =>
    `<circle cx="${X(d8).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${r}" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/>`;
  svg.push(dot(all[peakI][0], p.peak[1], C.down));
  const hxLabel = Math.min(Math.max(X(all[peakI][0]), cx0 + 80), cx1 - 80);
  svg.push(t(hxLabel, Y(p.peak[1]) - 14, `High ${num(p.peak[1])} \u00B7 ${dShort(p.peak[0])}`,
    { size: 13, weight: 700, fill: C.ink, anchor: 'middle' }));
  svg.push(dot(all[botI][0], p.bottom[1], C.ink));
  /* 低點貼右緣，標籤改右對齊避免溢出面板 */
  svg.push(t(cx1, Y(p.bottom[1]) + 24, `Low ${num(p.bottom[1])} \u00B7 ${dShort(p.bottom[0])}`,
    { size: 13, weight: 700, fill: C.ink, anchor: 'end' }));
});

/* ---- 結論 + 口徑註 ---- */
svg.push(t(M, 1196, 'Median across the four: \u221222% and 5.4 months peak to trough. The low was never obvious at the time.',
  { size: 17, weight: 700, fill: C.ink }));
svg.push(t(M, 1220,
  'S&P 500 daily closes. Time = calendar days from the closing peak to the closing low; months = days \u00F7 30.4. 2008\u2019s low came in Mar 2009.',
  { size: 13, fill: C.dim }));

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'S&P 500 (SPX) \u00B7 daily closes \u00B7 as of Nov 20, 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'crash-to-bottom-20261122';
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

/* gen-times（正式出圖才寫；PREVIEW 不動畫廊時間戳） */
if (!process.env.PREVIEW) {
  const genFile = path.join(BASE, 'out', 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}

/* 文案（X：疑問句開頭、簡短、活人感、≤280、結尾不加 One page ↓） */
const CAPTION =
  `How fast did each crash find its low? 2020: 33 days. 2025: 48. ` +
  `2022: 282. 2008: 517 \u2014 down 57% before it was done.`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
