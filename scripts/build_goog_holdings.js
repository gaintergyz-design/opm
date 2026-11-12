/**
 * OPM 專題卡 · Google's Q3 Stock Portfolio（Alphabet 13F 前十大持倉）· 1080×1350
 *
 * 版面（2026-11-10，數據與排版參考富途牛牛「Google Q3 美股持倉曝光」卡，
 * OPM 淺色格式＋欽定的圖形化方向）：
 *   頁首   兩行大標題 + 副標 + 漸變色條 + 3 個 KPI 膠囊
 *   主圖   10 行持倉：序號 + logo 圓徽 + 代碼/公司名 + 動作 pill（BOOSTED/NEW/TRIMMED）
 *          + 品牌色漸變橫條（長度∝組合佔比，線性誠實比例——SpaceX 佔 94.8% 本身就是故事）
 *          + 右側市值與佔比
 *   頁腳   統一聲明（disclaimer.js）+ 數據截止日 meta + handle
 *
 * 數據：whalewisdom，2026 年第三季 13F（9/30 截止），照抄富途卡口徑。
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_goog_holdings.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'goog-holdings.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC',
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

/* ---------------- 背景與頁首 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#4285F4"/><stop offset="0.5" stop-color="#EA4335"/>
  <stop offset="1" stop-color="#FBBC05"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);                       // 左上角 OPM 標識（2026-11-10 阿澤欽定）

const rows = D.rows;

const T1 = D.title_line1, T2 = D.title_line2;
// 標題過寬會撞右上 OPM 標識 → 自動縮字（2026-11-10）
const TS = 66;
const AVAIL_T = CW - 104;
const twMax = Math.max(tw(T1, TS, 700), tw(T2, TS, 700));
const titleSize = twMax > AVAIL_T ? Math.max(46, Math.floor(TS * AVAIL_T / twMax)) : TS;
svg.push(t(M, 116, T1, { size: titleSize, weight: 700, ls: -2 }));
svg.push(t(M, 190, T2, { size: titleSize, weight: 700, ls: -2 }));
const SUB = D.subtitle;
const subSize = tw(SUB, 24) > CW ? Math.floor(24 * CW / tw(SUB, 24)) : 24;
svg.push(t(M, 230, SUB, { size: subSize, fill: C.gray }));
svg.push(`<rect x="${M}" y="250" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* KPI 膠囊 */
const pills = [
  ['$88.3B', ' portfolio value'],
  ['94.8%', ' is SpaceX'],
  ['99.5%', ' in the top 10'],
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

/* ---------------- 持倉行 ----------------
 * 左：序號 + logo 圓徽 + 代碼/公司名（兩行）+ 動作 pill
 * 中：品牌色漸變橫條（長度∝佔比，線性）
 * 右：市值 + 佔比
 */
const Y0 = 352, RH = 64, GAP = 20, STRIDE = RH + GAP;
const LOGO_R = 27, LOGO_CX = 130;
const NAME_X = 180;
const BAR_X = 402, BAR_H = 30;
const RIGHT_X = 1032;                        // 右緣（ink 數字右對齊）
const BAR_W_MAX = RIGHT_X - 108 - BAR_X;     // 右側留 108 組「市值+佔比」
const maxPct = rows[0].pct;

rows.forEach((r, i) => {
  const y = Y0 + i * STRIDE;
  const cy = y + RH / 2;

  /* 行分隔線（除最後一行） */
  if (i > 0) svg.push(`<line x1="${M}" y1="${y - GAP / 2}" x2="${W - M}" y2="${y - GAP / 2}" stroke="${C.line}" stroke-width="1"/>`);

  /* 序號 */
  svg.push(t(84, cy + 9, `${i + 1}.`, { size: 24, weight: 700, fill: C.dim, anchor: 'end' }));

  /* logo 圓徽（白底） */
  const lg = LOGOS[r.ticker];
  const lcid = `lc${uid++}`;
  defs.push(`<clipPath id="${lcid}"><circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}"/></clipPath>`);
  svg.push(`<circle cx="${LOGO_CX}" cy="${cy}" r="${LOGO_R}" fill="#FFFFFF" stroke="#DDE6EF" stroke-width="1.4"/>`);
  if (lg) {
    const ein = LOGO_R * 2 * 0.92, eoff = (LOGO_R * 2 - ein) / 2;
    svg.push(`<g clip-path="url(#${lcid})"><image x="${LOGO_CX - LOGO_R + eoff}" y="${cy - LOGO_R + eoff}" width="${ein}" height="${ein}" href="${lg}" image-rendering="optimizeQuality"/></g>`);
  } else {
    svg.push(t(LOGO_CX, cy + 7, r.ticker.slice(0, 2), { size: 16, weight: 700, anchor: 'middle' }));
  }

  /* 代碼 + 公司名（兩行） */
  svg.push(t(NAME_X, cy - 4, r.ticker, { size: 24, weight: 700 }));
  svg.push(t(NAME_X, cy + 20, r.name, { size: 15, fill: C.gray }));

  /* 動作 pill（跟在公司名後，若太寬則上移） */
  if (r.action) {
    const A = ACTION[r.action];
    const aw = tw(A.label, 13, 700) + 18;
    let ax = NAME_X + Math.max(tw(r.ticker, 24, 700), tw(r.name, 15)) + 14;
    if (ax + aw > BAR_X - 12) ax = BAR_X - 12 - aw;   // 兜底：不壓柱
    const ay = cy - 24;                                // 與代碼同行
    svg.push(`<rect x="${ax}" y="${ay}" width="${aw}" height="24" rx="12" fill="${A.bg}"/>`);
    svg.push(t(ax + aw / 2, ay + 17, A.label, { size: 13, weight: 700, fill: A.fg, anchor: 'middle' }));
  }

  /* 佔比橫條（線性誠實比例；<0.35% 給最小可見寬度 5px） */
  const bw = Math.max(5, BAR_W_MAX * r.pct / maxPct);
  const gid = `bg${uid++}`;
  defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${r.c[0]}"/><stop offset="1" stop-color="${r.c[1]}"/></linearGradient>`);
  svg.push(`<rect x="${BAR_X}" y="${cy - BAR_H / 2}" width="${bw}" height="${BAR_H}" rx="10" fill="url(#${gid})"/>`);

  /* 市值：短柱放柱外（灰粗），長柱（SpaceX）放柱內右端（白粗，避免撞右緣佔比） */
  const val = r.value >= 1e9 ? `$${(r.value / 1e9).toFixed(r.value >= 1e10 ? 1 : 2)}B` : `$${Math.round(r.value / 1e6)}M`;
  const vw = tw(val, 17, 700);
  if (bw >= BAR_W_MAX - 120) {
    svg.push(t(BAR_X + bw - 16, cy + 6, val, { size: 17, weight: 700, fill: '#FFFFFF', anchor: 'end' }));
  } else {
    svg.push(t(BAR_X + Math.max(bw, 5) + 12, cy - 2, val, { size: 17, weight: 700, fill: C.gray }));
  }
  svg.push(t(RIGHT_X, cy + 9, `${r.pct.toFixed(2)}%`, { size: 26, weight: 700, anchor: 'end' }));
});

/* 註解（柱區下方小字） */
const NOTE = '13F covers long U.S. equity only. The SpaceX stake is held via private placements — Alphabet added in Q3.';
svg.push(t(M, Y0 + 10 * STRIDE + 26, NOTE, { size: 16, fill: C.dim }));

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
