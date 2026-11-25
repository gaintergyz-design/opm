/**
 * OPM-專題卡：All down but the dollar（黃金/白銀/比特幣/美元 2×2 走勢圖）· 1080×1350
 *
 * 來源：阿澤提供四張富途截圖（2026-11-25），要求 2×2 排版、以走勢圖為主。
 * 數據：Yahoo Finance 日線近 3 個月（GC=F / SI=F / BTC-USD / DX-Y.NYB），
 *       存 data/assets-2x2-20261125.json。
 * 版式：標題區 → 2×2 資產面板（徽章＋名稱＋現價｜三個月漲跌大字｜面積折線圖＋月份軸）
 *       → 收束句 → 頁尾。右上 assets/opm-logo.png。跌＝橙紅 #F1541E、漲＝teal #00A98C。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_assets_2x2.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_assets_2x2.js
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
  down: '#F1541E', downInk: '#D1400F',
  up: '#00A98C', upInk: '#00786B',
  upPanel: '#F0FAF7', upPanelLine: '#C9E9DD',
};
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* ---- 數據 ---- */
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'assets-2x2-20261125.json'), 'utf8'));
const ASSETS = [
  { key: 'gold',    name: 'Gold',    badge: 'Au',  badgeBg: '#FFF3DC', badgeInk: '#8A5B0A',
    tag: 'spot · $ per oz',     disp: (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}/oz` },
  { key: 'silver',  name: 'Silver',  badge: 'Ag',  badgeBg: '#EFF2F6', badgeInk: '#5C6675',
    tag: 'spot · $ per oz',     disp: (v) => `$${v.toFixed(2)}/oz` },
  { key: 'bitcoin', name: 'Bitcoin', badge: 'BTC', badgeBg: '#FFF0E2', badgeInk: '#B4610A',
    tag: 'BTC/USD',             disp: (v) => `$${Math.round(v).toLocaleString('en-US')}` },
  { key: 'dollar',  name: 'US Dollar', badge: '$', badgeBg: '#E2F5F0', badgeInk: '#00786B',
    tag: 'dollar index · DXY',  disp: (v) => `${v.toFixed(2)}`, highlight: true },
];

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區 ---- */
{
  svg.push(t(M, 146, 'All down but the dollar', { size: 72, weight: 700, ls: -2 }));
  svg.push(t(M, 192, 'Gold, silver and bitcoin all fell in three months — the dollar was the only winner',
    { size: 23, fill: C.gray }));
  svg.push(`<rect x="${M}" y="218" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 2×2 資產面板 ---- */
const PW = (CW - 24) / 2, PH = 434, GAP = 24, GY0 = 252;
ASSETS.forEach((a, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x0 = M + col * (PW + GAP), y0 = GY0 + row * (PH + GAP);
  const s = D.series[a.key];
  const down = s.chg < 0;
  const lineC = down ? C.down : C.up;
  const bigC = down ? C.downInk : C.upInk;
  const fill = a.highlight ? C.upPanel : C.panel;
  const stroke = a.highlight ? C.upPanelLine : C.panelLine;
  svg.push(rrect(x0, y0, PW, PH, 20, fill, `stroke="${stroke}" stroke-width="1"`));

  /* 面板面積漸變 */
  const gid = `areaG_${a.key}`;
  defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${lineC}" stop-opacity="0.16"/>
    <stop offset="1" stop-color="${lineC}" stop-opacity="0"/></linearGradient>`);

  /* 徽章 + 名稱 + 標籤 */
  const bx = x0 + 26 + 19, by = y0 + 26 + 19;
  svg.push(`<circle cx="${bx}" cy="${by}" r="19" fill="${a.badgeBg}" stroke="${stroke}" stroke-width="1"/>`);
  const bSize = a.badge.length > 2 ? 13 : a.badge.length > 1 ? 16 : 20;
  svg.push(t(bx, by + bSize * 0.36, a.badge, { size: bSize, weight: 700, fill: a.badgeInk, anchor: 'middle' }));
  svg.push(t(x0 + 72, y0 + 44, a.name, { size: 28, weight: 700 }));
  svg.push(t(x0 + 72, y0 + 68, a.tag, { size: 15, fill: C.gray }));

  /* 右上：三個月漲跌大字 */
  const chgTxt = `${s.chg > 0 ? '+' : ''}${s.chg.toFixed(1)}%`;
  svg.push(t(x0 + PW - 26, y0 + 52, chgTxt, { size: 42, weight: 700, fill: bigC, anchor: 'end' }));
  svg.push(t(x0 + PW - 26, y0 + 74, '3 months', { size: 14, fill: C.gray, anchor: 'end' }));

  /* 現價 */
  svg.push(t(x0 + 26, y0 + 100, `Last ${a.disp(s.last)}`, { size: 19, weight: 700 }));

  /* 走勢圖 */
  const cx0 = x0 + 26, cy0 = y0 + 118, cw = PW - 52, ch = PH - 118 - 42;
  const vals = s.points.map((p) => p.c);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X = (k) => cx0 + (k / (s.points.length - 1)) * cw;
  const Y = (v) => cy0 + ch - ((v - lo) / (hi - lo)) * ch;
  /* 網格線 */
  for (let g = 1; g <= 3; g++) {
    const gy = cy0 + (ch / 4) * g;
    svg.push(`<line x1="${cx0}" y1="${gy}" x2="${cx0 + cw}" y2="${gy}" stroke="${C.line}" stroke-width="1" stroke-dasharray="3 5"/>`);
  }
  /* 期初基準虛線 */
  const baseY = Y(s.points[0].c);
  svg.push(`<line x1="${cx0}" y1="${baseY}" x2="${cx0 + cw}" y2="${baseY}" stroke="${C.dim}" stroke-width="1" stroke-dasharray="6 5" opacity="0.7"/>`);
  /* 面積 + 折線 */
  const pts = s.points.map((p, k) => `${X(k).toFixed(1)},${Y(p.c).toFixed(1)}`).join(' ');
  svg.push(`<polygon points="${cx0},${cy0 + ch} ${pts} ${cx0 + cw},${cy0 + ch}" fill="url(#${gid})"/>`);
  svg.push(`<polyline points="${pts}" fill="none" stroke="${lineC}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`);
  /* 期終點 */
  const last = s.points[s.points.length - 1];
  svg.push(`<circle cx="${X(s.points.length - 1)}" cy="${Y(last.c)}" r="5" fill="${lineC}" stroke="#FFFFFF" stroke-width="2"/>`);
  /* 月份軸 */
  const seen = new Set();
  s.points.forEach((p, k) => {
    const mo = p.d.slice(5, 7), moName = { '08': '', '09': 'Sep', '10': 'Oct', '11': 'Nov' }[mo];
    if (p.d.slice(8) <= '07' || k === 0) {
      if (moName && !seen.has(moName)) {
        seen.add(moName);
        const anchor = k === 0 ? 'start' : (X(k) > cx0 + cw - 20 ? 'end' : 'middle');
        svg.push(t(X(k), cy0 + ch + 22, moName, { size: 14, fill: C.dim, anchor }));
      }
    }
  });
  svg.push(t(x0 + PW - 26, cy0 + ch + 22, '2026', { size: 14, fill: C.dim, anchor: 'end' }));
});

/* ---- 收束句 ---- */
svg.push(t(M, GY0 + 2 * PH + GAP + 40, 'Silver -40%. Gold -24%. Bitcoin -25%. Dollar +5%.',
  { size: 20, weight: 700 }));

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'Yahoo Finance daily closes, past 3 months · as of Nov 25, 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'assets-2x2-20261125';
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

if (!process.env.PREVIEW) {
  const genFile = path.join(BASE, 'out', 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}

/* 文案（X：疑問句開頭、簡短、活人感、≤280、結尾不加 One page ↓） */
const CAPTION =
  `Since when does silver drop 40% in three months? Gold -24%, bitcoin -25% \u2014 ` +
  `and the dollar is the only thing up, +5% and pressing a 19-month high.`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
