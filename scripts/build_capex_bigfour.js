/**
 * OPM 專題卡 · AI Capex Race（四大雲端單季現金資本支出）· 1080×1350
 *
 * 版面（2026-10-30，參考 finguider「AI 燒錢競賽」圖改折線圖）：
 *   頁首   大標題 + 副標（無右上 logo / handle pill，阿澤指定可不放）
 *   圖例   2×2 品牌色 chip
 *   主圖   四條折線（5 個日曆季度）；AMZN 全點標值，右側端點標最新值
 *   條     合計洞察條
 *   頁腳   統一聲明（disclaimer.js）+ 口徑 meta + handle
 *
 * 數據口徑：現金流量表「購置物業及設備」現金支出，不含融資租賃；日曆季度。
 * 原始值與來源見 data/capex-bigfour.json 的 sources 欄。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_capex_bigfour.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'capex-bigfour.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

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
  <stop offset="0" stop-color="#E47911"/><stop offset="0.38" stop-color="#0078D4"/>
  <stop offset="0.72" stop-color="#188038"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

/* ---------------- 頁首（標題大一點，右上不放 logo） ---------------- */
const TS = 96;
const titleSize = tw(D.title, TS, 700) > CW ? Math.floor(TS * CW / tw(D.title, TS, 700)) : TS;
svg.push(t(M, 140, D.title, { size: titleSize, weight: 700, ls: -2.5 }));
svg.push(t(M, 186, D.subtitle, { size: 26, fill: C.gray }));
svg.push(`<rect x="${M}" y="208" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- 圖例 2×2 ---------------- */
const LEG_Y0 = 252, LEG_GAP = 44;
D.series.forEach((s, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = col === 0 ? M : W / 2 + 16;
  const y = LEG_Y0 + row * LEG_GAP;
  svg.push(rrect(x, y - 14, 17, 17, 4.5, s.color));
  svg.push(t(x + 28, y, `${s.name} ${s.ticker}`, { size: 22, weight: 500 }));
});
svg.push(t(W - M, LEG_Y0, D.unit, { size: 17, fill: C.dim, anchor: 'end' }));

/* ---------------- 主圖：四條折線 ---------------- */
const PX0 = M + 58, PX1 = W - M - 112;      // 右側留 112px 給 logo + 端點標值
const PY0 = 366, PY1 = 1122;
const YMAX = D.ymax, YSTEP = D.ystep;
const yOf = (v) => PY1 - (v / YMAX) * (PY1 - PY0);
const xOf = (i, n) => PX0 + (PX1 - PX0) * (i / (n - 1));
const NQ = D.quarters.length;

// 最新季度淡色豎帶（視覺聚焦）
const bandX = xOf(NQ - 1, NQ);
svg.push(`<rect x="${(bandX - 52).toFixed(1)}" y="${PY0 - 14}" width="104" height="${PY1 - PY0 + 14}" fill="#F5F9FD"/>`);

for (let v = 0; v <= YMAX; v += YSTEP) {
  const y = yOf(v);
  svg.push(`<line x1="${PX0}" y1="${y.toFixed(1)}" x2="${PX1 + 52}" y2="${y.toFixed(1)}" stroke="${v === 0 ? '#D8E2EC' : C.track}" stroke-width="1"/>`);
  svg.push(t(PX0 - 12, y + 5, String(v), { size: 15, fill: C.dim, anchor: 'end' }));
}
D.quarters.forEach((q, i) => {
  const last = i === NQ - 1;
  svg.push(t(xOf(i, NQ), PY1 + 30, q, { size: last ? 19 : 18, weight: last ? 700 : 400, fill: last ? C.ink : C.gray, anchor: 'middle' }));
});

D.series.forEach((s) => {
  const n = s.values.length;
  const pts = s.values.map((v, i) => [xOf(i, n), yOf(v)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  svg.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  pts.forEach((p, i) => {
    const last = i === n - 1;
    svg.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 6 : 4}" fill="#FFFFFF" stroke="${s.color}" stroke-width="${last ? 3.6 : 2.8}"/>`);
  });
});

/* AMZN（第一條）全點標值：首點左對齊防出畫 */
{
  const s = D.series[0];
  s.values.forEach((v, i) => {
    // 末點不標：右側端點標值欄已有一份，標兩次顯得重複
    if (i === s.values.length - 1) return;
    const x = xOf(i, NQ), y = yOf(v);
    svg.push(t(x + (i === 0 ? 4 : 0), y - 15, v.toFixed(1),
      { size: 17, weight: 700, fill: s.color, anchor: i === 0 ? 'start' : 'middle' }));
  });
}

/* 右側端點：各家 logo 圓標 + 最新值；由上到下排，最小間距 34（logo 直徑 28） */
{
  const items = D.series.map((s) => ({ s, y: yOf(s.values[NQ - 1]) }))
    .sort((a, b) => a.y - b.y);
  const placed = [];
  items.forEach((it) => {
    let y = it.y + 6;                       // 文字基線對齊點心
    for (const p of placed) if (Math.abs(y - p) < 34) y = p + 34;
    placed.push(y);
    const L = 28, lx = PX1 + 24, cy = y - 7;
    const uri = LOGOS[it.s.ticker];
    if (uri) {
      const cid = `lg${uid++}`;
      defs.push(`<clipPath id="${cid}"><circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}"/></clipPath>`);
      const ein = L * 0.92, eoff = (L - ein) / 2;
      svg.push(`<g clip-path="url(#${cid})"><image x="${lx + eoff}" y="${cy - L / 2 + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
      svg.push(`<circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}" fill="none" stroke="#DDE6EF" stroke-width="1.2"/>`);
    } else {
      svg.push(`<circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}" fill="${it.s.color}"/>`);
    }
    svg.push(t(PX1 + 58, y, it.s.values[NQ - 1].toFixed(1),
      { size: 20, weight: 700, fill: it.s.color, anchor: 'start' }));
  });
}

/* ---------------- 洞察條（兩行 pill，放大 1.3×，整塊略偏左的居中位） ---------------- */
{
  const ss = 22, SH = 52, GAP = 13;                       // 17/40/40 的 1.3 倍
  const lines = Array.isArray(D.strip) ? D.strip : [D.strip];
  const widths = lines.map((line) => Math.min(CW, Math.round(tw(line, ss, 500)) + 40));
  const x0 = Math.round((W - Math.max(...widths)) / 2) - 72;   // 居中基礎上整塊左移 72px
  lines.forEach((line, i) => {
    const SY = 524 + i * (SH + GAP);
    svg.push(rrect(x0, SY, widths[i], SH, 13, '#EEF4FE', 'stroke="#D7E5FA" stroke-width="1.2"'));
    svg.push(`<rect x="${x0}" y="${SY + 9}" width="5" height="${SH - 18}" rx="2.5" fill="#E47911"/>`);
    svg.push(t(x0 + 22, SY + 34, line, { size: ss, weight: 500, fill: '#0B1220' }));
  });
}

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.CAPEX_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `capex-bigfour-${stamp}`;
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
