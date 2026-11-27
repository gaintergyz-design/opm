/**
 * OPM-專題卡：How to spot a market bottom（五種見底訊號）· 1080×1350
 *
 * 來源：阿澤提供的中文長文（2026-11-27），歸納情緒／領跌板塊／市場氣氛／
 *       信貸市場／技術形態五個觀察角度。全數英譯，不上中文。
 * 🔴 版式偏好（阿澤欽定）：白底、無高亮條、無分隔橫線、正文左對齊、
 *     留白充足且填滿版面；不套「標題下三欄 chips」的路徑依賴。
 * OPM 規格：1080×1350、全英文、右上 OPM 字標、統一頁尾。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_bottom_signals.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_bottom_signals.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'bottom-signals-20261127.json'), 'utf8'));
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

const W = 1080, H = 1350, M = 48;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', body: '#243149', gray: '#5C6675',
  dim: '#98A2B3', orange: '#F1541E', gold: '#BA7517', line: '#E4E7EC',
};
const HANDLE = '@onepagemarket';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y.toFixed(1)}" font-family="${FONT}" font-size="${size.toFixed(1)}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" xml:space="preserve">${esc(s)}</text>`;
}
function wrap(s, size, maxW, weight, maxLines) {
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const cand = cur ? cur + ' ' + word : word;
    if (textWidth(cand, size, weight) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) return null;
  if (lines.some((ln) => textWidth(ln, size, weight) > maxW + 1)) return null;
  return lines;
}
function fitWrap(s, base, min, maxW, weight, maxLines) {
  for (let sz = base; sz >= min; sz -= 0.5) {
    const lines = wrap(s, sz, maxW, weight, maxLines);
    if (lines) return { size: sz, lines };
  }
  return { size: min, lines: wrap(s, min, maxW, weight, maxLines + 2) || [String(s)] };
}
function fitLine(s, base, maxW, weight) {
  let sz = base;
  while (sz > 14 && textWidth(s, sz, weight) > maxW) sz -= 0.5;
  return sz;
}

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

/* 右上 OPM 字標 */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="34" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* 標題區：kicker + 兩行大標 + 副標 */
{
  const maxW = 930;
  /* 標題上方 kicker 依阿澤要求移除 */
  D.headline.forEach((line, i) => {
    const sz = fitLine(line, 80, maxW, 700);
    svg.push(t(M, 112 + i * 80, line, { size: sz, weight: 700, fill: i === 0 ? C.orange : C.ink, ls: -1.5 }));
  });
  /* 副標題依阿澤要求移除 */
}

/* 五個訊號：大號編號 + 標題 + 兩行內文；無分隔線，靠留白分組 */
const ROW_H = 154, ROW_TOP = 288, TITLE_X = 158, BODY_W = W - M - TITLE_X;
D.items.forEach((it, i) => {
  const top = ROW_TOP + i * ROW_H;
  const numSz = 50;
  svg.push(t(M, top + 52, it.n, { size: numSz, weight: 700, fill: C.orange, ls: -1 }));

  const titleSz = fitLine(it.title, 36, BODY_W, 700);
  svg.push(t(TITLE_X, top + 50, it.title, { size: titleSz, weight: 700, fill: C.ink, ls: -0.5 }));

  const f = fitWrap(it.body, 26, 21, BODY_W, 400, 2);
  const lh = f.size * 1.32;
  let y = top + 82 + f.size * 0.9;
  f.lines.forEach((ln) => {
    svg.push(t(TITLE_X, y, ln, { size: f.size, weight: 400, fill: C.body }));
    y += lh;
  });
});

/* 結語：統一字號／字重的淺底背景條 */
{
  const padX = 28, padY = 18;
  const f = fitWrap(D.takeaway, 27, 23, W - M * 2 - padX * 2, 500, 2);
  const lh = f.size * 1.26;
  const barY = 1090, barH = f.lines.length * lh + padY * 2;
  svg.push(`<rect x="${M}" y="${barY}" width="${W - M * 2}" height="${barH}" rx="12" fill="#E3E8F0"/>`);
  let y = barY + padY + f.size * 0.9;
  f.lines.forEach((ln) => {
    svg.push(t(M + padX, y, ln, { size: f.size, weight: 500, fill: C.ink }));
    y += lh;
  });
}

pushFooter(t, svg, { M, W, H, C, meta: D.as_of, handle: HANDLE });
svg.push('</svg>');
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

fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), D.caption);
console.log('caption chars:', D.caption.length);
D.caption.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  W: single line > 90 chars:', line.length, line);
});
