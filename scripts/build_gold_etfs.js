/**
 * OPM 專題卡：Every US Gold ETF（黃金 ETF 全景清單，改自阿澤提供的富途牛牛參考圖）
 *
 * 需求（2026-11-22 阿澤）：富途黃金 ETF 圖改成 OPM 格式；**去掉「是否支援期權交易」欄**；標題自擬。
 * 二改（2026-11-22 阿澤「不要擅自添加模組」）：去掉副標下 3 格事實模組與底部注記，
 *   **改為卡片牆**——15 檔 ETF 每檔一張小卡，三行（無槓桿 / 多頭 / 反向），倍數徽章在卡上。
 * 名稱與倍數已核實：SEC FWP 官方文件（DGP/DGZ/DZZ）、發行商官網慣用名（其餘）。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_gold_etfs.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_gold_etfs.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'gold-etfs-20261122.json'), 'utf8'));

const W = 1080, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC',
  amber: '#E8930C', amberTint: '#FBF1DE',
  teal: '#00A98C', tealTint: '#E4F4F0', tealInk: '#00695A',
  orange: '#F1541E', orangeTint: '#FDEAE2', orangeInk: '#A03310',
};

/* 🔴 右上角品牌標識＝OPM 字標圖片（2026-11-14 欽定；resvg 只認 data URI） */
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&'.,%×−]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fitTitle = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
/* 按實測寬度折行（卡片牆名稱用） */
function wrap(s, size, maxW) {
  const words = String(s).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? cur + ' ' + w : w;
    if (approx(cand, size) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const H = 1350;
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

/* 右上 OPM 字標 */
{
  const h = 46, w = OPM_W / OPM_H * h;
  svg.push(`<image x="${W - M - w}" y="48" width="${w}" height="${h}" href="${OPM_URI}"/>`);
}

/* 標題 */
const T1 = D.headline[0], T2 = D.headline[1];
svg.push(t(M, 122, T1, { size: fitTitle(T1, 72, CW), weight: 700, fill: C.ink, ls: -1.2 }));
svg.push(t(M, 198, T2, { size: fitTitle(T2, 72, CW), weight: 700, fill: C.amber, ls: -1.2 }));
svg.push(t(M, 246, D.subtitle, { size: 23, fill: C.gray }));

/* ---------- 卡片牆 ---------- */
const CARD_H = 208, GAP = 16, PAD = 18;
const CARD_W = (CW - GAP * 4) / 5;

/* 分區分隔條：色條＋標籤＋右側低調說明 */
function divider(y, label, color, hint) {
  svg.push(`<rect x="${M}" y="${y - 21}" width="6" height="26" rx="3" fill="${color}"/>`);
  svg.push(t(M + 20, y, label, { size: 24, weight: 700, fill: C.ink, ls: 1.5 }));
  svg.push(t(W - M, y, hint, { size: 17, fill: C.dim, anchor: 'end' }));
}

/* 一張 ETF 卡 */
function etfCard(x, y, r, colors, lev) {
  const iw = CARD_W - PAD * 2;
  svg.push(`<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="${colors.tint}"/>`);
  svg.push(`<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="none" stroke="${colors.main}" stroke-width="1.3" opacity="0.65"/>`);
  if (lev) {   /* 倍數徽章（右上角，實色） */
    svg.push(`<rect x="${x + CARD_W - PAD - 58}" y="${y + PAD}" width="58" height="30" rx="15" fill="${colors.main}"/>`);
    svg.push(t(x + CARD_W - PAD - 29, y + PAD + 21, r.lev, { size: 17, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  }
  svg.push(t(x + PAD, y + PAD + 34, r.ticker, { size: 28, weight: 700, fill: C.ink, ls: -0.3 }));
  const lines = wrap(r.name, 13.5, iw);
  lines.forEach((ln, i) => {
    svg.push(t(x + PAD, y + PAD + 66 + i * 18, ln, { size: 13.5, fill: C.gray }));
  });
  if (r.issuer) svg.push(t(x + PAD, y + CARD_H - 20, r.issuer, { size: 13, weight: 500, fill: colors.deep }));
}

const SECTIONS = [
  { rows: D.unleveraged, div: 320, label: 'UNLEVERAGED', hint: 'Physical bullion · no leverage',
    colors: { main: C.amber, deep: '#8A5A0B', tint: C.amberTint }, lev: false },
  { rows: D.long, div: 620, label: 'LONG 2–3x', hint: 'Daily leveraged',
    colors: { main: C.teal, deep: C.tealInk, tint: C.tealTint }, lev: true },
  { rows: D.inverse, div: 920, label: 'INVERSE −1x to −3x', hint: 'Daily inverse',
    colors: { main: C.orange, deep: C.orangeInk, tint: C.orangeTint }, lev: true },
];

for (const s of SECTIONS) {
  divider(s.div, s.label, s.colors.main, s.hint);
  const y0 = s.div + 24;
  s.rows.forEach((r, i) => {
    etfCard(M + i * (CARD_W + GAP), y0, r, s.colors, s.lev);
  });
}

/* 頁腳 */
const handle = '@onepagemarket';
pushFooter(t, svg, { M, W, H, C, handle, meta: `Fund names and leverage per issuers · ${D.as_of}` });
svg.push('</svg>');
const svgStr = svg.join('\n');

/* ---------- 輸出 ---------- */
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.PAGES_STAMP || '20261122';
const name = `gold-etfs-${stamp}`;

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

fs.writeFileSync(path.join(outDir, `${name}.svg`), svgStr);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
fs.writeFileSync(path.join(outDir, `${name}.png`), png);
console.log('PNG ->', path.join(outDir, `${name}.png`), `(${(png.length / 1024).toFixed(0)} KB)`, `${W}x${H}`);

const genFile = path.join(BASE, 'out', 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${name}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap, null, 0));

if (!process.env.PREVIEW) {
  fs.writeFileSync(path.join(BASE, 'out', `caption-${name}.txt`), D.caption);
  console.log('caption chars:', D.caption.length);
}
