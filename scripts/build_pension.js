/**
 * OPM 專題卡 · Global Pension Giants（全球主要養老基金規模＋資產配置）· 1080×1350
 *
 * 版面（2026-11-10，依阿澤「OPM 版式方向欽定」：圖形化優先＋KPI 膠囊＋大圖＋小字註解）：
 *   頁首   大標題 + 副標 + 漸變條（右上 OPM 標識）
 *   KPI    3 顆膠囊（合計規模 / 第一名 / 美國 TSP 股票佔比）
 *   圖例   Equities / Fixed income / Other 三色 chip + 右側單位說明
 *   主圖   7 條橫向堆疊柱（股票 / 固收 / 其他），按規模降序；
 *          每行國旗圓徽 + 短名 + 全名 + 右側規模值；美國 TSP 行淡金底高亮
 *   洞察條 一行 pill
 *   頁腳   統一聲明（disclaimer.js）+ meta + handle
 *
 * 數據：data/pension-global.json（來自東方財富圖解財經整理圖，截至 2025-12-31；
 *       阿澤指定：美國僅保留聯邦 TSP，剔除加州兩隻與中國全國社保基金）。
 * 國旗：assets/flags/*.png（flagcdn.com，w160）。
 *
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_pension.js
 *       PENSION_STAMP=YYYYMMDD 可覆蓋檔名日期
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'pension-global.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

// 堆疊段配色（OPM 淺色系）：股票琥珀金、固收藍、其他灰
const COL_EQ = '#E8930C', COL_FI = '#2E6BE6', COL_OT = '#CBD2DB';

const FLAGS = {};
for (const f of D.funds) {
  const p = path.join(BASE, 'assets', 'flags', `${f.flag}.png`);
  FLAGS[f.flag] = fs.readFileSync(p).toString('base64');
}

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#E8930C"/><stop offset="0.5" stop-color="#2E6BE6"/>
  <stop offset="1" stop-color="#8B5CF6"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);                       // 右上角 OPM 標識（2026-11-10 阿澤欽定）

/* ---------------- 頁首 ---------------- */
const TS = 96;
const AVAIL_T = CW - 104;   // 右上預留 OPM 標識寬度
const titleSize = tw(D.title, TS, 700) > AVAIL_T ? Math.floor(TS * AVAIL_T / tw(D.title, TS, 700)) : TS;
svg.push(t(M, 140, D.title, { size: titleSize, weight: 700, ls: -2.5 }));
svg.push(t(M, 186, D.subtitle, { size: 25, fill: C.gray }));
svg.push(`<rect x="${M}" y="208" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- KPI 膠囊 ×3 ---------------- */
{
  const total = D.funds.reduce((s, f) => s + f.t, 0);
  const top = D.funds[0], us = D.funds.find((f) => f.us);
  const pills = [
    `${D.funds.length} funds · $${total.toFixed(1)}T combined`,
    `${top.name} leads at $${top.t.toFixed(1)}T`,
    `${us.name}: ${us.eq}% equities`,
  ];
  const ss = 20, SH = 50, GAP = 14;
  const widths = pills.map((s) => Math.min(340, Math.round(tw(s, ss, 500)) + 36));
  let x = M;
  pills.forEach((s, i) => {
    const y = 250;
    svg.push(rrect(x, y, widths[i], SH, 13, '#EEF4FE', 'stroke="#D7E5FA" stroke-width="1.2"'));
    svg.push(`<rect x="${x}" y="${y + 9}" width="5" height="${SH - 18}" rx="2.5" fill="${COL_EQ}"/>`);
    svg.push(t(x + 20, y + 32, s, { size: ss, weight: 500, fill: '#0B1220' }));
    x += widths[i] + GAP;
  });
}

/* ---------------- 圖例 ---------------- */
{
  const y = 336;
  const items = [['Equities', COL_EQ], ['Fixed income', COL_FI], ['Other', COL_OT]];
  let x = M;
  items.forEach(([name, col]) => {
    svg.push(rrect(x, y - 14, 15, 15, 4, col));
    svg.push(t(x + 24, y, name, { size: 19, weight: 500, fill: C.gray }));
    x += 24 + tw(name, 19, 500) + 30;
  });
  svg.push(t(W - M, y, 'Assets, USD · as of ' + D.asof, { size: 16, fill: C.dim, anchor: 'end' }));
}

/* ---------------- 主圖：7 條橫向堆疊柱 ---------------- */
const ROW_Y0 = 372, ROW_H = 104;
const BX0 = M + 324, BX1 = W - M - 108;       // 柱區
const BW = BX1 - BX0;

function flagBadge(cx, cy, r, flag) {
  const cid = `fl${uid++}`;
  defs.push(`<clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
  svg.push(`<g clip-path="url(#${cid})"><image x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${FLAGS[flag]}" image-rendering="optimizeQuality"/></g>`);
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#DDE6EF" stroke-width="1.4"/>`);
}

D.funds.forEach((f, i) => {
  const y0 = ROW_Y0 + i * ROW_H;
  const cy = y0 + ROW_H / 2 - 6;

  if (f.us) svg.push(rrect(M - 8, y0 - 2, CW + 16, ROW_H - 14, 14, '#FFF6E6'));

  flagBadge(M + 30, cy, 27, f.flag);
  svg.push(t(M + 70, cy - 2, f.name, { size: 24, weight: 700 }));
  svg.push(t(M + 70, cy + 22, f.full, { size: 14.5, fill: C.gray }));

  // 規模值（右列）
  svg.push(t(W - M, cy + 10, `$${f.t.toFixed(2)}T`, { size: 27, weight: 700, anchor: 'end' }));

  // 堆疊柱
  const other = +(100 - f.eq - f.fi).toFixed(1);
  const segs = [
    ['eq', f.eq, COL_EQ, '#FFFFFF'],
    ['fi', f.fi, COL_FI, '#FFFFFF'],
    ['ot', other, COL_OT, '#475467'],
  ];
  const bh = 30, by = cy - bh / 2;
  const cid = `bar${uid++}`;
  defs.push(`<clipPath id="${cid}"><rect x="${BX0}" y="${by}" width="${BW}" height="${bh}" rx="8"/></clipPath>`);
  svg.push(`<g clip-path="url(#${cid})">`);
  let cx0 = BX0;
  segs.forEach(([k, pct, col, txtCol]) => {
    if (pct <= 0) return;
    const w = pct / 100 * BW;
    svg.push(`<rect x="${cx0.toFixed(1)}" y="${by}" width="${w.toFixed(1)}" height="${bh}" fill="${col}"/>`);
    if (w >= 52) svg.push(t(cx0 + w / 2, cy + 6, `${pct}%`, { size: 17, weight: 700, fill: txtCol, anchor: 'middle' }));
    cx0 += w;
  });
  svg.push('</g>');
  // 柱底細邊框，讓「其他」為 0 的行也有輪廓
  svg.push(`<rect x="${BX0}" y="${by}" width="${BW}" height="${bh}" rx="8" fill="none" stroke="#E4E7EC" stroke-width="1"/>`);
});

/* ---------------- 洞察條 ---------------- */
{
  const ss = 21, SH = 52;
  const w = Math.min(CW, Math.round(tw(D.strip, ss, 500)) + 44);
  const x0 = Math.round((W - w) / 2), SY = ROW_Y0 + D.funds.length * ROW_H + 40;
  svg.push(rrect(x0, SY, w, SH, 13, '#EEF4FE', 'stroke="#D7E5FA" stroke-width="1.2"'));
  svg.push(`<rect x="${x0}" y="${SY + 9}" width="5" height="${SH - 18}" rx="2.5" fill="${COL_EQ}"/>`);
  svg.push(t(x0 + 22, SY + 34, D.strip, { size: ss, weight: 500, fill: '#0B1220' }));
}

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: 'Assets and allocation as of ' + D.asof, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.PENSION_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `pension-global-${stamp}`;
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
