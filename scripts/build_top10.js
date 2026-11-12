/**
 * OPM 專題卡 · The 10 Most Valuable Companies on Earth（市值 Top 10 + CEO）· 1080×1350
 *
 * 版面（2026-11-10，參考 Boardroom「The Most Valuable Companies Right Now」排版，
 * OPM 淺色格式＋欽定的圖形化方向）：
 *   頁首   兩行大標題 + 副標 + 漸變色條 + 3 個 KPI 膠囊
 *   主圖   10 行排名：序號 + logo 圓徽 + CEO 頭像（白環疊在 logo 右側，下有名字）
 *          + 品牌色漸變橫條（長度∝市值），條內右端疊放公司名／市值（中間白細線）
 *   頁腳   統一聲明（disclaimer.js）+ 數據截止日 meta + handle
 *
 * 數據：Yahoo Finance screener（intradaymarketcap 降序，三大交易所），
 *       2026-11-09 美股收盤口徑；CEO 名單經新聞核實（魏哲家/陳福陽等 2026-11 在任）。
 *       頭像：Wikipedia 條目肖像（魏哲家用中文維基）。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_top10.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'top10-cap.json'), 'utf8'));
const AVATARS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ceo-avatars.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

const META = {   // ticker → 顯示名 / CEO / 品牌色漸變 [亮, 深]
  AAPL:  { disp: 'APPLE',     ceo: 'John Ternus',     c: ['#5A5A63', '#1D1D1F'] },
  NVDA:  { disp: 'NVIDIA',    ceo: 'Jensen Huang',    c: ['#A4D65E', '#4C7A00'] },
  MSFT:  { disp: 'MICROSOFT', ceo: 'Satya Nadella',   c: ['#38B6FF', '#0078D4'] },
  GOOGL: { disp: 'ALPHABET',  ceo: 'Sundar Pichai',   c: ['#EA4335', '#4285F4'] },
  AMZN:  { disp: 'AMAZON',    ceo: 'Andy Jassy',      c: ['#FFB84D', '#F07E00'] },
  TSM:   { disp: 'TSMC',      ceo: 'C.C. Wei',        c: ['#E04E52', '#B1232C'] },
  SPCX:  { disp: 'SPACEX',    ceo: 'Elon Musk',       c: ['#4A5578', '#111827'] },
  META:  { disp: 'META',      ceo: 'Mark Zuckerberg', c: ['#7BA4F5', '#0668E1'] },
  AVGO:  { disp: 'BROADCOM',  ceo: 'Hock Tan',        c: ['#E85656', '#CC092F'] },
  TSLA:  { disp: 'TESLA',     ceo: 'Elon Musk',       c: ['#FF6B6B', '#E31937'] },
};

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tw = (s, size, weight = 400) => textWidth(s, size, weight);

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}

/* ---------------- 背景與頁首 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#0B1220"/><stop offset="0.5" stop-color="#4C7A00"/>
  <stop offset="1" stop-color="#CC092F"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);                       // 左上角 OPM 標識（2026-11-10 阿澤欽定）

const rows = D.rows.slice(0, 10);
const sum = rows.reduce((a, r) => a + r.mcap, 0);
const above2T = rows.filter((r) => r.mcap > 2e12).length;
const musk = rows.filter((r) => META[r.ticker] && META[r.ticker].ceo === 'Elon Musk').length;

const T1 = 'The 10 Most Valuable', T2 = 'Companies on Earth';
const TS = 66;
svg.push(t(M, 116, T1, { size: TS, weight: 700, ls: -2 }));
svg.push(t(M, 190, T2, { size: TS, weight: 700, ls: -2 }));
const SUB = 'Ranked by market cap — the trillion-dollar club, with the boss in the driver seat';
const subSize = tw(SUB, 24) > CW ? Math.floor(24 * CW / tw(SUB, 24)) : 24;
svg.push(t(M, 230, SUB, { size: subSize, fill: C.gray }));
svg.push(`<rect x="${M}" y="250" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* KPI 膠囊 */
const pills = [
  [`$${(sum / 1e12).toFixed(1)}T`, ' combined'],
  [`${above2T} companies`, ' above $2T'],
  ['Elon Musk', ` runs ${musk} of 10`],
];
let px = M;
pills.forEach(([bold, rest]) => {
  const wBold = tw(bold, 20, 700), wRest = tw(rest, 17) + 2;
  const wPad = 22, wIn = wBold + wRest;
  const pw = wIn + wPad * 2;
  svg.push(`<rect x="${px}" y="276" width="${pw}" height="42" rx="21" fill="#F4F6F9" stroke="${C.line}" stroke-width="1.2"/>`);
  const cyT = 303;
  svg.push(`<text x="${px + wPad}" y="${cyT}" font-family="${FONT}" font-size="20" font-weight="700" fill="${C.ink}">${esc(bold)}<tspan font-weight="400" font-size="17" fill="${C.gray}" dx="5">${esc(rest.trim())}</tspan></text>`);
  px += pw + 12;
});

/* ---------------- 排名行 ----------------
 * 2026-11-10 阿澤反饋改版：① 頭像從 logo 側移到柱內左端（logo 行不再擠）
 * ② 公司名/市值改同行（名在柱內跟頭像後，市值在柱右端外側 ink 色）
 */
const Y0 = 344, RH = 82, GAP = 6, STRIDE = RH + GAP;
const LOGO_R = 30, LOGO_CX = 124;
const AV_R = 25, AV_CX_OFF = 30;                 // 頭像圓心 = 柱左端 + 30
const BAR_X = 190, BAR_H = 54;
const VAL_W = 106;                               // 柱右端外側市值預留
const BAR_W_MAX = W - M - BAR_X - VAL_W;
const maxCap = rows[0].mcap;

rows.forEach((r, i) => {
  const y = Y0 + i * STRIDE;
  const cy = y + RH / 2;
  const m = META[r.ticker] || { disp: r.ticker, ceo: '', c: ['#9AA4B2', '#5C6675'] };

  /* 序號 */
  svg.push(t(84, cy + 11, `${i + 1}.`, { size: 30, weight: 700, fill: C.dim, anchor: 'end' }));

  /* logo 圓徽（白底） */
  const lg = LOGOS[r.ticker];
  const lcid = `lc${uid++}`;
  defs.push(`<clipPath id="${lcid}"><circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}"/></clipPath>`);
  svg.push(`<circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}" fill="#FFFFFF" stroke="#DDE6EF" stroke-width="1.4"/>`);
  if (lg) {
    const ein = LOGO_R * 2 * 0.92, eoff = (LOGO_R * 2 - ein) / 2;
    svg.push(`<g clip-path="url(#${lcid})"><image x="${LOGO_CX - LOGO_R + eoff}" y="${cy - LOGO_R + eoff}" width="${ein}" height="${ein}" href="${lg}" image-rendering="optimizeQuality"/></g>`);
  } else {
    svg.push(t(LOGO_CX, cy + 8, r.ticker.slice(0, 2), { size: 18, weight: 700, anchor: 'middle' }));
  }

  /* 市值橫條（長度∝市值） */
  const bw = Math.max(150, BAR_W_MAX * r.mcap / maxCap);
  const x1 = BAR_X + bw;
  const gid = `bg${uid++}`;
  defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${m.c[0]}"/><stop offset="1" stop-color="${m.c[1]}"/></linearGradient>`);
  svg.push(`<rect x="${BAR_X}" y="${cy - BAR_H / 2}" width="${bw}" height="${BAR_H}" rx="16" fill="url(#${gid})"/>`);

  /* CEO 頭像（疊在柱內左端） */
  const av = AVATARS[r.ticker];
  const AV_CX = BAR_X + AV_CX_OFF;
  if (av && av.uri) {
    const acid = `av${uid++}`;
    defs.push(`<clipPath id="${acid}"><circle cx="${AV_CX}" cy="${cy}" r="${AV_R}"/></clipPath>`);
    svg.push(`<circle cx="${AV_CX}" cy="${cy}" r="${AV_R + 2.5}" fill="#FFFFFF"/>`);
    svg.push(`<g clip-path="url(#${acid})"><image x="${AV_CX - AV_R}" y="${cy - AV_R}" width="${AV_R * 2}" height="${AV_R * 2}" href="${av.uri}" image-rendering="optimizeQuality"/></g>`);
    svg.push(`<circle cx="${AV_CX}" cy="${cy}" r="${AV_R}" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>`);
    /* CEO 名（柱下方、對齊頭像） */
    const nm = av.name || m.ceo;
    svg.push(t(AV_CX, y + RH - 2, nm, { size: 12.5, fill: C.dim, anchor: 'middle' }));
  }

  /* 柱內公司名（頭像右側、同行垂直居中） */
  svg.push(t(AV_CX + AV_R + 14, cy + 8, m.disp, { size: 24, weight: 700, fill: '#FFFFFF' }));

  /* 市值（柱右端外側，ink 色） */
  svg.push(t(x1 + 14, cy + 9, fmtCap(r.mcap), { size: 26, weight: 700 }));
});

function fmtCap(v) {
  return `$${(v / 1e12).toFixed(2)}T`;
}

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, {
  M, W, H, C,
  meta: 'Market caps as of the Nov 9, 2026 US close',
  handle,
});

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.TOP10_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `top10-cap-${stamp}`;
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
console.log('sum = $' + (sum / 1e12).toFixed(2) + 'T | above2T =', above2T, '| musk =', musk);
