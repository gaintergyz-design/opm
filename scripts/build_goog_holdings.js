/**
 * OPM 專題卡 · Google's Q3 Stock Portfolio（Alphabet 13F 前十大持倉）· 1080×1350
 * v2（2026-11-10 阿澤反饋）：**排版完全抄富途**——柱狀圖不適合（除 SPCX 外值太小），
 * 改文字表格為主體：
 *   頁首   大標題（橙 "Google Q3" + 黑）+ 副行（加倉 SpaceX、建倉高通）+ 副標
 *   左欄   3D Google 圓牌 logo（assets/goog-coin.png）+ 組合總市值（橙）+ 前十大佔比
 *   右欄   深色表頭三欄表格（TICKER/NAME · VALUE · WEIGHT）10 行：logo 圓徽 +
 *          代碼/公司名 + 市值 + 佔比；動作 pill（BOOSTED/NEW/TRIMMED）掛在表左緣
 *   頁腳   統一聲明（disclaimer.js）+ 數據截止日 meta + handle
 *
 * 數據：whalewisdom，2026 年第三季 13F（9/30 截止），照抄富途卡口徑。
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_goog_holdings.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'goog-holdings.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));
const COIN = fs.readFileSync(path.join(BASE, 'assets', 'goog-coin.png')).toString('base64');

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC',
  accent: '#E8710A',                 // 富途橙
  headBg: '#1B2430',                 // 表頭深色
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

const ACTION = {
  boosted: { label: 'BOOSTED', fg: '#0E7A3D', bg: '#E3F5EA' },
  new:     { label: 'NEW',     fg: '#1D4ED8', bg: '#E4EBFF' },
  trimmed: { label: 'TRIMMED', fg: '#B42318', bg: '#FDEBEB' },
};

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tw = (s, size, weight = 400) => textWidth(s, size, weight);

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const fit = (s, size, weight, max) => tw(s, size, weight) > max ? Math.floor(size * max / tw(s, size, weight)) : size;

/* ---------------- 背景與頁首 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

/* 標題：仿富途「Google Q3（橙）美股持倉曝光！（黑）」 */
const T1A = 'Google Q3 ', T1B = 'Holdings Revealed!';
const TS1 = fit(T1A + T1B, 62, 700, CW);
const wA = tw(T1A, TS1, 700);
svg.push(t(M, 112, T1A, { size: TS1, weight: 700, fill: C.accent, ls: -1 }));
svg.push(t(M + wA, 112, T1B, { size: TS1, weight: 700, ls: -1 }));
const T2 = 'SpaceX boosted, Qualcomm opened';
const TS2 = fit(T2, 46, 700, CW);
svg.push(t(M, 172, T2, { size: TS2, weight: 700, ls: -0.5 }));
const SUB = 'Alphabet\u2019s top 10 U.S. holdings \u00b7 Q3 2026 13F \u00b7 whalewisdom';
const subSize = fit(SUB, 22, 400, CW);
svg.push(t(M, 212, SUB, { size: subSize, fill: C.gray }));

/* ---------------- 右欄表格（主體） ---------------- */
const TX0 = 430, TX1 = 1032;
const HEAD_Y = 296, HEAD_H = 52, ROW_H = 72;
const LOGO_CX = 478, LOGO_R = 22;
const NAME_X = 512;
const VAL_X = 856, PCT_X = 1008;

/* 表格外框（白卡 + 細邊） */
const TB_Y0 = HEAD_Y, TB_Y1 = HEAD_Y + HEAD_H + ROW_H * 10;
svg.push(`<rect x="${TX0 - 16}" y="${TB_Y0 - 16}" width="${TX1 - TX0 + 32}" height="${TB_Y1 - TB_Y0 + 32}" rx="16" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.5"/>`);

/* 深色表頭（上圓下直） */
svg.push(`<rect x="${TX0 - 16}" y="${TB_Y0 - 16}" width="${TX1 - TX0 + 32}" height="${HEAD_H + 16}" rx="16" fill="${C.headBg}"/>`);
svg.push(`<rect x="${TX0 - 16}" y="${TB_Y0 + 16}" width="${TX1 - TX0 + 32}" height="${HEAD_H - 32}" fill="${C.headBg}"/>`);
svg.push(t(NAME_X, TB_Y0 + 22, 'TICKER / NAME', { size: 17, weight: 700, fill: '#FFFFFF' }));
svg.push(t(VAL_X, TB_Y0 + 22, 'VALUE', { size: 17, weight: 700, fill: '#FFFFFF', anchor: 'end' }));
svg.push(t(PCT_X, TB_Y0 + 22, 'WEIGHT', { size: 17, weight: 700, fill: '#FFFFFF', anchor: 'end' }));

D.rows.forEach((r, i) => {
  const cy = TB_Y0 + HEAD_H + ROW_H * i + ROW_H / 2;

  /* 行分隔線 */
  if (i > 0) svg.push(`<line x1="${TX0 - 16}" y1="${TB_Y0 + HEAD_H + ROW_H * i}" x2="${TX1 + 16}" y2="${TB_Y0 + HEAD_H + ROW_H * i}" stroke="${C.line}" stroke-width="1"/>`);

  /* logo 圓徽 */
  const lg = LOGOS[r.ticker];
  const lcid = `lc${uid++}`;
  defs.push(`<clipPath id="${lcid}"><circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}"/></clipPath>`);
  svg.push(`<circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}" fill="#FFFFFF" stroke="#DDE6EF" stroke-width="1.2"/>`);
  if (lg) {
    const ein = LOGO_R * 2 * 0.92, eoff = (LOGO_R * 2 - ein) / 2;
    svg.push(`<g clip-path="url(#${lcid})"><image x="${LOGO_CX - LOGO_R + eoff}" y="${cy - LOGO_R + eoff}" width="${ein}" height="${ein}" href="${lg}" image-rendering="optimizeQuality"/></g>`);
  } else {
    svg.push(t(LOGO_CX, cy + 6, r.ticker.slice(0, 2), { size: 14, weight: 700, anchor: 'middle' }));
  }

  /* 代碼 + 公司名（兩行） */
  svg.push(t(NAME_X, cy - 3, r.ticker, { size: 23, weight: 700 }));
  svg.push(t(NAME_X, cy + 19, r.name, { size: 14, fill: C.gray }));

  /* 市值 + 佔比 */
  const val = r.value >= 1e9 ? `$${(r.value / 1e9).toFixed(r.value >= 1e10 ? 1 : 2)}B` : `$${Math.round(r.value / 1e6)}M`;
  svg.push(t(VAL_X, cy + 8, val, { size: 23, weight: 700, anchor: 'end' }));
  svg.push(t(PCT_X, cy + 8, `${r.pct.toFixed(2)}%`, { size: 23, weight: 700, anchor: 'end' }));

  /* 動作 pill（掛在表左緣，帶小三角指向行） */
  if (r.action) {
    const A = ACTION[r.action];
    const aw = tw(A.label, 13, 700) + 18, ah = 26;
    const ay = cy - ah / 2, ax = TX0 - 16 - aw + 10;      // 大半在外、右端壓過表緣
    svg.push(`<path d="M ${ax + aw} ${cy - 6} L ${ax + aw + 12} ${cy} L ${ax + aw} ${cy + 6} Z" fill="${A.bg}"/>`);
    svg.push(`<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="13" fill="${A.bg}" stroke="${A.fg}" stroke-width="1.2"/>`);
    svg.push(t(ax + aw / 2, cy + 5, A.label, { size: 13, weight: 700, fill: A.fg, anchor: 'middle' }));
  }
});

/* ---------------- 左欄（Google logo + 組合數據） ---------------- */
const COIN_W = 336, COIN_H = Math.round(COIN_W * 645 / 792);
const COIN_Y = 384;
svg.push(`<ellipse cx="${M + COIN_W / 2}" cy="${COIN_Y + COIN_H + 14}" rx="${COIN_W * 0.42}" ry="14" fill="#0B1220" opacity="0.08"/>`);
svg.push(`<image x="${M}" y="${COIN_Y}" width="${COIN_W}" height="${COIN_H}" href="data:image/png;base64,${COIN}" image-rendering="optimizeQuality"/>`);

const L1 = COIN_Y + COIN_H;   // logo 底
svg.push(t(M, L1 + 84, 'Total portfolio value', { size: 21, fill: C.gray }));
svg.push(t(M, L1 + 148, '$88.3B', { size: 62, weight: 700, fill: C.accent, ls: -1 }));
svg.push(t(M, L1 + 224, 'Top 10 holdings =', { size: 21, fill: C.gray }));
svg.push(t(M, L1 + 290, '99.47%', { size: 62, weight: 700, ls: -1 }));

/* 口徑註解（左欄底部小字） */
const NOTE = [
  '13F covers long U.S. equity only \u2014 the',
  'SpaceX stake is held via private placements.',
  'Alphabet added in Q3.',
];
NOTE.forEach((line, i) => {
  svg.push(t(M, L1 + 348 + i * 22, line, { size: 15, fill: C.dim }));
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, {
  M, W, H, C,
  meta: 'Holdings as of Q3 2026 13F filings (Sep 30, 2026)',
  handle,
});

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.GOOG_STAMP || '20261110';
const stem = `goog-holdings-${stamp}`;
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

/* 發帖文案（照抄 out/caption-*.txt 慣例） */
const CAPTION =
  'What does Alphabet do with its spare $88B? Puts 94.8% into SpaceX — and just bought more.\n' +
  'Q3 13F: new stake in Qualcomm, trimmed Freshworks. The other nine names combined: under 1%.';
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);

console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
console.log('caption ->', `out/caption-${stem}.txt`);
