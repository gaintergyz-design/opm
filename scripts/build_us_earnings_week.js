/**
 * OPM 專題卡：本週美股業績日曆（US Earnings Week）· 1080×1350
 *
 * 來源：阿澤 2026-11-15 提供的富途牛牛〈本週重點業績日曆〉卡。
 * 需求（2026-11-15）：只保留「美股業績發布」模組，
 *   去掉最左邊的藍色側欄（美股業績發布／美東時間），
 *   每一檔個股都配 logo，做成 OPM 格式。
 *
 * 🔴 遵守：全英文、右上 assets/opm-logo.png、統一頁尾聲明、無斜紋水印、
 *   不加「標題 → 三欄 chips」路徑依賴、不用高亮條／橫線、正文左對齊、留白充足。
 *   左側欄拿掉後五日欄吃滿 984px，字級放大、行距拉開。
 *
 * 資料：data/us-earnings-week-20261116.json（依原圖逐格抄錄，中文公司名轉英文）
 * logo：data/logos.json（base64 data URI；每檔一個圓形白底徽章）
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_us_earnings_week.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_us_earnings_week.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'us-earnings-week-20261116.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));

/* 🔴 右上角品牌標識＝OPM 字標圖片（resvg 只認 data URI）*/
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const COL_W = CW / 5;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', badgeLine: '#E4E9F0',
  stripe: '#F5F8FC',
  bmo: '#B25E09', amc: '#2E6BD6',
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
    a + (/[A-Z0-9]/.test(ch) ? 0.62 : /[a-z]/.test(ch) ? 0.52 : ch === ' ' ? 0.28 : 0.55), 0) * sz;
}
function fit(s, base, maxW) {
  const w = approx(s, base);
  return w <= maxW ? base : Math.max(11, Math.floor(base * (maxW - 4) / w));
}

const defs = [];
const svg = [];
let uid = 0;
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);

/* 背景：乾淨淺底，不加斜紋水印 */
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區：只兩行，不加 chips、不加規則線 ---- */
const titleSize = fit(D.headline, 66, CW - 160);
svg.push(t(M, 156, D.headline, { size: titleSize, weight: 700, ls: -1.5 }));
svg.push(t(M, 206, D.subhead, { size: 24, fill: C.gray }));

/* ---- 五日欄表頭（無深色帶、無橫線）---- */
const DAY_Y = 268, DATE_Y = 294;
D.days.forEach((d, i) => {
  const x = M + COL_W * i + 14;
  svg.push(t(x, DAY_Y, d.label, { size: 21, weight: 700, ls: 1.4 }));
  svg.push(t(x, DATE_Y, d.date, { size: 16, fill: C.dim }));
});

/* ---- 版面座標 ---- */
const ROW_H = 70;
const G1_LABEL_Y = 342, G1_Y = 372, G1_ROWS = 6;
const G2_LABEL_Y = 838, G2_Y = 868, G2_ROWS = 4;
const G1_BOT = G1_Y + G1_ROWS * ROW_H;
const G2_BOT = G2_Y + G2_ROWS * ROW_H;

/* 隔欄淡底：只做極淡的直向區塊，幫眼睛對齊，不是高亮條 */
[1, 3].forEach((i) => {
  const x = M + COL_W * i + 4;
  svg.push(rrect(x, G1_Y - 8, COL_W - 8, G1_ROWS * ROW_H + 16, 12, C.stripe));
  svg.push(rrect(x, G2_Y - 8, COL_W - 8, G2_ROWS * ROW_H + 16, 12, C.stripe));
});

/* ---- 分組標題：小色點 + 大寫標籤 + 右側時段／檔數 ---- */
const nBmo = D.days.reduce((a, d) => a + d.bmo.length, 0);
const nAmc = D.days.reduce((a, d) => a + d.amc.length, 0);
function groupLabel(y, text, code, count, color) {
  svg.push(`<circle cx="${M + 7}" cy="${y - 6}" r="5" fill="${color}"/>`);
  svg.push(t(M + 24, y, text, { size: 19, weight: 700, fill: color, ls: 2.2 }));
  svg.push(t(W - M, y, `${code} · ${count} names`, { size: 15, fill: C.dim, anchor: 'end' }));
}
groupLabel(G1_LABEL_Y, 'BEFORE THE OPEN', 'BMO', nBmo, C.bmo);
groupLabel(G2_LABEL_Y, 'AFTER THE CLOSE', 'AMC', nAmc, C.amc);

/* ---- 單檔：圓形白底 logo 徽章 + 代碼 + 公司名（左對齊）---- */
function cell(i, j, y0, [tk, nm]) {
  const x = M + COL_W * i + 14;
  const cy = y0 + j * ROW_H + ROW_H / 2;
  const cx = x + 23, r = 23, inner = 21.5;
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.badgeLine}" stroke-width="1.2"/>`);
  const uri = LOGOS[tk];
  if (uri) {
    const cid = `lg${uid++}`;
    defs.push(`<clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${inner}"/></clipPath>`);
    svg.push(`<g clip-path="url(#${cid})"><image x="${cx - inner}" y="${cy - inner}" width="${inner * 2}" height="${inner * 2}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
  } else {
    svg.push(t(cx, cy + 8, tk.charAt(0), { size: 20, weight: 700, fill: C.dim, anchor: 'middle' }));
  }
  const tx = x + 56, avail = COL_W - 56 - 18;
  svg.push(t(tx, cy - 5, tk, { size: 22, weight: 700, ls: -0.3 }));
  svg.push(t(tx, cy + 18, nm, { size: fit(nm, 15.5, avail), fill: C.gray }));
}

D.days.forEach((d, i) => {
  d.bmo.forEach((e, j) => cell(i, j, G1_Y, e));
  d.amc.forEach((e, j) => cell(i, j, G2_Y, e));
});

/* ---- 口徑小字 ---- */
svg.push(t(M, 1196, D.note, { size: 16, fill: C.dim }));

/* ---- OPM 統一頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle: HANDLE });

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

/* 文案：疑問句開頭、簡短、活人感、不說教；全英文、≤280 字元 */
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
