/**
 * OPM 專題卡 · Nasdaq「The Deep-V Escape」· 1080×1350
 *
 * 故事線（2026-11-26 阿澤指定，標題：纳指惊险「深V」躲过大跌）：
 *   11/25 (Tue) 納指大幅低開 −3.3%，09:40 殺到全日低 22,632（−4.6%），
 *   之後全天單邊修復，收 23,585.80（−0.62%）——從低點拉回 953 點。
 *
 * 版式：全英文、淺色底、右上 OPM 標識、主圖為 11/25 全日 5 分鐘收盤線
 *   （79 點），左右貫通（x: 0 → 1080 出血），線段兩色：
 *   低點前紅（殺跌）、低點後綠（修復），縱軸＝相對前收百分比。
 *   🔴 阿澤欽定：不加任何附注（事件框／箭頭／統計條都不放）。
 *
 * 數據：data/nasdaq-deepv-20261125.json（Yahoo 5m，東財禁用）
 * 用法：NODE_PATH=./node_modules node scripts/build_nasdaq_deepv.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'nasdaq-deepv-20261125.json'), 'utf8'));

const W = 1080, H = 1350, M = 50, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', body: '#3A4453',
  green: '#00A98C', greenInk: '#00725F', greenTint: '#E6F6F2',
  red: '#F1541E', redInk: '#C34A17', redTint: '#FDEFE8',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, op = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}
const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* 全英文卡：ASCII 查 MiSans 實測表、其餘 0.6em */
function cw(s, size, weight = 400) {
  let w = 0;
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c >= 0x2E80 && c <= 0xFFEF) w += 100;
    else if (c >= 32 && c <= 126) w += textWidth(ch, 100, weight);
    else w += 60;
  }
  return w * size / 100;
}
const fit = (s, size, max, weight = 700) =>
  cw(s, size, weight) > max ? Math.floor(size * max / cw(s, size, weight)) : size;

/* ---------------- SVG 骨架 ---------------- */
const a = [], defs = [];
const handle = '@onepagemarket';

a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
brandMark(a);

/* ---------------- 標題區 ---------------- */
const KICKER = 'NASDAQ COMPOSITE \u00B7 5-MINUTE CLOSES, NOV 25';
a.push(t(M, 76, KICKER, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));

const TITLE = 'The Deep-V Escape';
a.push(t(M, 156, TITLE, { size: fit(TITLE, 64, CW - 104), weight: 700, ls: -1.6 }));

const SUB = 'Gap down to \u22124.6% minutes after the open, then 953 points dug back to close just \u22120.6%.';
a.push(t(M, 200, SUB, { size: fit(SUB, 22, CW, 400), fill: C.gray }));
a.push(rr(M, 220, CW * 0.5, 6, 3, C.red));
a.push(rr(M + CW * 0.5, 220, CW * 0.5, 6, 3, C.green));

/* ---------------- 主圖（左右貫通 x: 0 → W） ---------------- */
const PREV = D.prev_close;
const pct = (p) => (p / PREV - 1) * 100;
const CY0 = 268, CY1 = 1180;          // 圖表縱向範圍
const P_LO = -5.2, P_HI = 0.2;        // 縱軸百分比範圍
const y = (p) => CY0 + (P_HI - pct(p)) * (CY1 - CY0) / (P_HI - P_LO);

const S = D.series, N = S.length;
/* 🔴 安全邊距：圖表區也收進左右 50px（x: M → W-M），不貫通出血 */
const CX0 = M, CX1 = W - M;
const x = (i) => CX0 + i * (CX1 - CX0) / (N - 1);

/* 網格 + 右側百分比標籤（相對前收） */
for (let k = 0; k <= 5; k++) {
  const p0 = PREV * (1 - k / 100);
  a.push(`<line x1="${CX0}" y1="${y(p0)}" x2="${CX1}" y2="${y(p0)}" stroke="${C.line}" stroke-width="1" stroke-dasharray="${k === 0 ? '' : '2 5'}" opacity="${k === 0 ? 0.9 : 0.75}"/>`);
  a.push(`<rect x="${CX1 - 66}" y="${y(p0) - 13}" width="64" height="26" rx="13" fill="#FFFFFF" opacity="0.92"/>`);
  a.push(t(CX1 - 8, y(p0) + 6, (k === 0 ? '0' : `\u2212${k}`) + '%', { size: 16, weight: 500, fill: '#7B8595', anchor: 'end' }));
}

/* 線段兩色：殺跌（開盤→全日低點）紅、修復（低點→收盤）綠 */
let iLow = 0;
for (let i = 1; i < N; i++) if (S[i][1] < S[iLow][1]) iLow = i;
const seg = (i0, i1, color, w0) => {
  const pts = [];
  for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) pts.push(`${x(i).toFixed(1)},${y(S[i][1]).toFixed(1)}`);
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${w0}" stroke-linejoin="round" stroke-linecap="round"/>`;
};
a.push(seg(0, iLow + 1, C.red, 3.4));
a.push(seg(iLow, N - 1, C.green, 3.4));

/* 底部時間軸（貫通，ET 交易時段整點） */
const iAt = (mins) => {
  for (let i = 0; i < N; i++) if (S[i][0] >= mins) return i;
  return N - 1;
};
[[600, '10:00'], [660, '11:00'], [720, '12:00'], [780, '13:00'], [840, '14:00'], [900, '15:00'], [960, '16:00']].forEach(([m, lbl]) => {
  const i = iAt(m);
  a.push(`<line x1="${x(i)}" y1="${CY1}" x2="${x(i)}" y2="${CY1 + 6}" stroke="#B9C0CB" stroke-width="1"/>`);
  a.push(t(Math.min(Math.max(x(i), M + 26), CX1 - 30), CY1 + 26, lbl + ' ET', { size: 15, weight: 500, fill: '#7B8595', anchor: 'middle' }));
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: 'Prices as of Nov 25, 2026 market close', handle });
a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);

/* ---------------- 輸出 ---------------- */
const svgStr = a.join('\n');
const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'nasdaq-deepv-20261125.svg'), svgStr);

const sub2 = path.join(BASE, 'assets', 'fonts');
const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => [path.join(sub2, f), path.join(full, f)].find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, 'nasdaq-deepv-20261125.png');
fs.writeFileSync(out, png);

/* 出圖時刻（畫廊增量用，§5 規則：新卡寫真實 epoch） */
const gtPath = path.join(outDir, 'gen-times.json');
let gt = {};
try { gt = JSON.parse(fs.readFileSync(gtPath, 'utf8')); } catch (e) {}
gt['nasdaq-deepv-20261125.png'] = Math.floor(Date.now() / 1000);
fs.writeFileSync(gtPath, JSON.stringify(gt, null, 1));

console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
