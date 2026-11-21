/**
 * OPM 專題卡：Every US Gold ETF（黃金 ETF 全景清單，改自阿澤提供的富途牛牛參考圖）
 *
 * 需求（2026-11-22 阿澤）：富途黃金 ETF 圖改成 OPM 格式；**去掉「是否支援期權交易」欄**；標題自擬。
 * 結構照參考圖：無槓桿 ETF（5 檔）＋ 槓桿/反向（多頭 5 檔、反向 5 檔），不設期權欄。
 * 名稱與倍數已核實：SEC FWP 官方文件（DGP/DGZ/DZZ）、發行商官網慣用名（其餘）。
 * GLD 報價 Nasdaq API（2026-11-20 收市 $322.79 / −3.70%）。
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
  amber: '#E8930C', amberTint: '#FBF0DC',
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

/* 事實三格（標題下，填留白） */
D.facts.forEach((f, i) => {
  const fx = M + i * 210;
  svg.push(t(fx, 312, f.label, { size: 14, weight: 700, fill: C.dim, ls: 1.5 }));
  svg.push(t(fx, 344, f.value, { size: 28, weight: 700, fill: C.ink }));
});

/* ---------- Section 1: UNLEVERAGED ---------- */
let y = 412;
svg.push(`<rect x="${M}" y="${y - 22}" width="6" height="26" rx="3" fill="${C.amber}"/>`);
svg.push(t(M + 20, y, 'UNLEVERAGED', { size: 24, weight: 700, fill: C.ink, ls: 1.5 }));
svg.push(t(W - M, y, 'Physical bullion · no leverage', { size: 17, fill: C.dim, anchor: 'end' }));

y += 22;
const uRowH = 66;
D.unleveraged.forEach((r, i) => {
  const cy = y + uRowH * i + uRowH / 2;
  if (i % 2 === 0) svg.push(`<rect x="${M - 12}" y="${cy - uRowH / 2 + 4}" width="${CW + 24}" height="${uRowH - 8}" rx="16" fill="${C.amberTint}" opacity="0.55"/>`);
  svg.push(`<circle cx="${M + 14}" cy="${cy}" r="5" fill="${C.amber}"/>`);
  svg.push(t(M + 40, cy - 4, r.ticker, { size: 30, weight: 700, fill: C.ink, ls: -0.3 }));
  svg.push(t(M + 40, cy + 22, r.name, { size: 16, fill: C.gray }));
  svg.push(t(W - M, cy + 9, r.issuer, { size: 20, weight: 500, fill: C.gray, anchor: 'end' }));
});
y += uRowH * D.unleveraged.length + 40;

/* ---------- Section 2: LEVERAGED & INVERSE（雙欄） ---------- */
const COLW = (CW - 28) / 2, LX = M, RXc = M + COLW + 28;
svg.push(`<rect x="${LX}" y="${y - 22}" width="6" height="26" rx="3" fill="${C.teal}"/>`);
svg.push(t(LX + 20, y, 'LONG 2–3x', { size: 24, weight: 700, fill: C.tealInk, ls: 1.5 }));
svg.push(`<rect x="${RXc}" y="${y - 22}" width="6" height="26" rx="3" fill="${C.orange}"/>`);
svg.push(t(RXc + 20, y, 'INVERSE −1x to −3x', { size: 24, weight: 700, fill: C.orangeInk, ls: 1.5 }));

y += 24;
const lRowH = 62;
const levRow = (x, r, i, colors) => {
  const cy = y + lRowH * i + lRowH / 2;
  if (i % 2 === 0) svg.push(`<rect x="${x - 12}" y="${cy - lRowH / 2 + 4}" width="${COLW + 24}" height="${lRowH - 8}" rx="16" fill="${colors.tint}" opacity="0.6"/>`);
  /* 倍數徽章 */
  const bw = 62;
  svg.push(`<rect x="${x}" y="${cy - 17}" width="${bw}" height="34" rx="17" fill="${colors.tint}"/>`);
  svg.push(`<rect x="${x}" y="${cy - 17}" width="${bw}" height="34" rx="17" fill="none" stroke="${colors.main}" stroke-width="1.4"/>`);
  svg.push(t(x + bw / 2, cy + 8, r.lev, { size: 19, weight: 700, fill: colors.deep, anchor: 'middle' }));
  svg.push(t(x + bw + 16, cy - 2, r.ticker, { size: 26, weight: 700, fill: C.ink, ls: -0.3 }));
  svg.push(t(x + bw + 16, cy + 22, r.name, { size: 14, fill: C.gray }));
};
D.long.forEach((r, i) => levRow(LX, r, i, { main: C.teal, deep: C.tealInk, tint: C.tealTint }));
D.inverse.forEach((r, i) => levRow(RXc, r, i, { main: C.orange, deep: C.orangeInk, tint: C.orangeTint }));
y += lRowH * 5 + 30;

/* 底部中性注記 */
svg.push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`);
svg.push(t(M, y + 30, D.note, { size: 15, fill: C.dim }));

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
