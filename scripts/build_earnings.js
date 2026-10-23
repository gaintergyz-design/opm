/**
 * OPM-個股財報（Earnings Card）· 1080×1350
 *
 * 版面（2026-10-23 與阿澤定版，重做自 finguider 的 BE 財報圖）：
 *   頁首   代碼大字 + 公司名 + 財季 / 截止日 / 發布時間
 *   ① KPI  兩張卡：營收 / EPS —— 實際值、超預期 pill、預估值、去年同期對比柱、YOY
 *   ② 左   獲利能力折線（毛利率 / 營業利潤率，5 個財季）
 *      右   營收佔比環圖 + 圖例（按終端市場）
 *   ③ 左   營業現金流柱狀（5 個財季）
 *      右   下季展望條列
 *   頁腳   統一聲明（不寫 Source）
 *
 * 排版全部用 scripts/lib/fontwidths.js 的實測字寬，不靠估算係數。
 * 圖表主色取公司品牌色（data/earnings-<ticker>.json 的 brand）。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_earnings.js
 *   EARN_DATA=data/earnings-wdc.json PREVIEW=1 node scripts/build_earnings.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const DATA_PATH = process.env.EARN_DATA || path.join(BASE, 'data', 'earnings-wdc.json');
const D = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const B = D.brand || {};
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7', card: '#FFFFFF', cardLine: '#E7EDF4',
  deep: B.deep || '#003369', primary: B.primary || '#005195',
  mid: B.mid || '#0067B3', teal: B.teal || '#17A9C4', pos: B.pos || '#028948',
};
const FONT = 'MiSans';

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
defs.push(`<linearGradient id="barCur" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.primary}"/></linearGradient>`);
defs.push(`<linearGradient id="barOcf" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.primary}"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.deep}"/><stop offset="0.55" stop-color="${C.primary}"/>
  <stop offset="1" stop-color="${C.teal}"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, '@onepagemarket', { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

/* ---------------- 頁首 ---------------- */
const TICK = D.ticker || '';
const TS = 92;
svg.push(t(M, 128, TICK, { size: TS, weight: 700, ls: -2.5 }));
let hx = M + tw(TICK, TS, 700) + 22;
const nameStr = D.company || '';
const nameSize = 40;
svg.push(t(hx, 128, nameStr, { size: nameSize, weight: 500, fill: C.primary }));
svg.push(t(M, 172, `${D.quarter} · Quarter ended ${D.period_end} · Reported ${D.reported}`,
           { size: 21, fill: C.gray }));

const handle = '@onepagemarket';
const pillW = Math.round(tw(handle, 27, 500)) + 38;
const pillX = W - M - pillW;
svg.push(rrect(pillX, 66, pillW, 50, 12, '#EAF2F9'));
svg.push(t(pillX + pillW / 2, 99, handle, { size: 27, weight: 500, fill: C.primary, anchor: 'middle' }));
const logoUri = LOGOS[TICK];
if (logoUri) {
  const ls2 = 44, lx = pillX - 16 - ls2, cid = `lg${uid++}`;
  defs.push(`<clipPath id="${cid}"><circle cx="${lx + ls2 / 2}" cy="91" r="${ls2 / 2}"/></clipPath>`);
  svg.push(`<g clip-path="url(#${cid})"><image x="${lx}" y="${91 - ls2 / 2}" width="${ls2}" height="${ls2}" href="${logoUri}"/></g>`);
  svg.push(`<circle cx="${lx + ls2 / 2}" cy="91" r="${ls2 / 2}" fill="none" stroke="#DDE6EF" stroke-width="1.2"/>`);
}
svg.push(`<rect x="${M}" y="196" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- ① KPI 卡 ---------------- */
const KPI_Y = 216, KPI_H = 224, GAP = 24;
const cardW = (CW - GAP) / 2;

function kpiCard(x, k) {
  const g = [];
  g.push(rrect(x, KPI_Y, cardW, KPI_H, 18, C.card, `stroke="${C.cardLine}" stroke-width="1.5"`));
  g.push(rrect(x + 0.75, KPI_Y + 18, 5, KPI_H - 36, 2.5, C.primary));
  g.push(t(x + 26, KPI_Y + 46, k.label, { size: 25, fill: C.gray }));
  g.push(t(x + 26, KPI_Y + 118, k.actual_disp, { size: 62, weight: 700, fill: C.deep, ls: -1 }));

  const beat = k.surprise >= 0;
  const ptxt = `${beat ? 'Beat' : 'Miss'} ${beat ? '+' : '\u2212'}${Math.abs(k.surprise).toFixed(1)}%`;
  const ps = 22, pwid = Math.round(tw(ptxt, ps, 600)) + 30;
  g.push(rrect(x + 26, KPI_Y + 136, pwid, 38, 9, beat ? C.pos : '#C0392B'));
  g.push(t(x + 26 + pwid / 2, KPI_Y + 163, ptxt, { size: ps, weight: 600, fill: '#FFFFFF', anchor: 'middle' }));

  g.push(t(x + 26, KPI_Y + 206, `Est. ${k.est_disp}`, { size: 21, fill: C.gray }));

  const bx = x + 306, bw = 42, gap2 = 14, baseY = KPI_Y + 176, maxH = 96;
  const mx = Math.max(k.actual, k.prior);
  const h1 = Math.round(k.prior / mx * maxH), h2 = Math.round(k.actual / mx * maxH);
  g.push(rrect(bx, baseY - h1, bw, h1, 4, '#CBDDEB'));
  g.push(rrect(bx + bw + gap2, baseY - h2, bw, h2, 4, 'url(#barCur)'));
  g.push(t(bx + bw / 2, baseY + 22, k.prior_txt, { size: 16, fill: C.dim, anchor: 'middle' }));
  g.push(t(bx + bw + gap2 + bw / 2, baseY + 22, k.cur_txt, { size: 16, fill: C.dim, anchor: 'middle' }));

  g.push(t(x + cardW - 26, KPI_Y + 46, `YOY +${k.yoy}%`,
           { size: 23, weight: 700, fill: C.pos, anchor: 'end' }));
  return g.join('');
}
svg.push(kpiCard(M, D.kpi.revenue));
svg.push(kpiCard(M + cardW + GAP, D.kpi.eps));

/* ---------------- ② 獲利能力 ---------------- */
const B_Y = 462, B_H = 320;
const LP_X = M, LP_W = 512;
const RP_X = M + LP_W + 32, RP_W = CW - LP_W - 32;

svg.push(t(LP_X, B_Y + 30, 'Profitability', { size: 26, weight: 500 }));
{
  // 圖例直接把最新一季的數值寫出來（取代壓在線上的標籤）
  const last = D.gross_margin.length - 1;
  const items = [
    { c: C.deep, label: 'Gross', val: `${D.gross_margin[last].toFixed(1)}%` },
    { c: C.teal, label: 'Operating', val: `${D.op_margin[last].toFixed(1)}%` },
  ];
  let rx = LP_X + LP_W;
  items.slice().reverse().forEach((it) => {
    const vw = tw(it.val, 16, 700), lw = tw(it.label, 15);
    rx -= vw; svg.push(t(rx, B_Y + 28, it.val, { size: 16, weight: 700, fill: it.c }));
    rx -= 6 + lw; svg.push(t(rx, B_Y + 28, it.label, { size: 15, fill: C.gray }));
    rx -= 20;
    svg.push(`<rect x="${rx}" y="${B_Y + 15}" width="15" height="4" rx="2" fill="${it.c}"/>`);
    rx -= 14;
  });
}

const PX0 = LP_X + 48, PX1 = LP_X + LP_W - 10, PY0 = B_Y + 62, PY1 = B_Y + 246;
const Y_MAX = 60;
const yOf = (v) => PY1 - (v / Y_MAX) * (PY1 - PY0);
const xOf = (i, n) => PX0 + (PX1 - PX0) * (i / (n - 1));

for (let v = 0; v <= Y_MAX; v += 10) {
  const y = yOf(v);
  svg.push(`<line x1="${PX0}" y1="${y.toFixed(1)}" x2="${PX1}" y2="${y.toFixed(1)}" stroke="${v === 0 ? '#D8E2EC' : C.track}" stroke-width="1"/>`);
  svg.push(t(PX0 - 12, y + 5, `${v}%`, { size: 15, fill: C.dim, anchor: 'end' }));
}

function drawLine(series, color, wdt) {
  const n = series.length;
  const pts = series.map((v, i) => [xOf(i, n), yOf(v)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  let s = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${wdt}" stroke-linecap="round" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 5.5 : 4}" fill="#FFFFFF" stroke="${color}" stroke-width="${last ? 3.4 : 2.6}"/>`;
  });
  return s;
}
svg.push(drawLine(D.gross_margin, C.deep, 3.6));
svg.push(drawLine(D.op_margin, C.teal, 3.6));

D.quarters.forEach((q, i) => {
  svg.push(t(xOf(i, D.quarters.length), PY1 + 28, q, { size: 17, fill: C.gray, anchor: 'middle' }));
});

/* ---------------- ② 營收佔比 ---------------- */
svg.push(t(RP_X, B_Y + 30, 'Revenue mix', { size: 26, weight: 500 }));
{
  const cx = RP_X + 104, cy = B_Y + 168, R = 98, HOLE = 56;
  const mix = D.mix || [];
  const COL = [C.deep, C.mid, C.teal];
  const rad = (d) => d * Math.PI / 180;
  const p = (r, d) => [cx + r * Math.cos(rad(d)), cy + r * Math.sin(rad(d))];
  let a = -90;
  mix.forEach((m, i) => {
    const sweep = m.pct / 100 * 360;
    const a0 = a, a1 = a + sweep; a = a1;
    const large = sweep > 180 ? 1 : 0;
    const [x1, y1] = p(R, a0), [x2, y2] = p(R, a1);
    const [x3, y3] = p(HOLE, a1), [x4, y4] = p(HOLE, a0);
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
              `L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${HOLE} ${HOLE} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
    svg.push(`<path d="${d}" fill="${COL[i % COL.length]}" stroke="#FFFFFF" stroke-width="2"/>`);
  });
  svg.push(t(cx, cy + 2, `${mix[0].pct}%`, { size: 30, weight: 700, fill: C.deep, anchor: 'middle' }));
  svg.push(t(cx, cy + 25, 'cloud', { size: 16, fill: C.gray, anchor: 'middle' }));

  const LX = cx + R + 40;
  mix.forEach((m, i) => {
    const y = B_Y + 112 + i * 62;
    svg.push(rrect(LX, y - 13, 13, 13, 3.5, COL[i % COL.length]));
    svg.push(t(LX + 22, y, m.name, { size: 21, weight: 500 }));
    svg.push(t(RP_X + RP_W, y, `${m.pct}%`, { size: 22, weight: 700, fill: C.deep, anchor: 'end' }));
    svg.push(t(LX + 22, y + 22, m.value, { size: 17, fill: C.dim }));
  });
}

/* ---------------- ③ 營業現金流 ---------------- */
const C_Y = 806, C_H = 370;
const OP_X = M, OP_W = 512;
const OB_X = M + OP_W + 32, OB_W = CW - OP_W - 32;

svg.push(t(OP_X, C_Y + 30, 'Operating cash flow', { size: 26, weight: 500 }));
svg.push(t(OP_X + OP_W, C_Y + 29, 'US$M', { size: 17, fill: C.dim, anchor: 'end' }));

{
  const n = D.ocf.length;
  const gx0 = OP_X + 52, gx1 = OP_X + OP_W;
  const baseY = C_Y + 310, maxH = 226;
  const mx = Math.max(...D.ocf);
  const slot = (gx1 - gx0) / n;
  const bw = Math.min(62, slot * 0.54);
  for (let v = 0; v <= mx; v += 400) {
    const y = baseY - (v / mx) * maxH;
    svg.push(`<line x1="${gx0}" y1="${y.toFixed(1)}" x2="${gx1}" y2="${y.toFixed(1)}" stroke="${v === 0 ? '#D8E2EC' : C.track}" stroke-width="1"/>`);
    svg.push(t(gx0 - 12, y + 5, String(v), { size: 15, fill: C.dim, anchor: 'end' }));
  }
  D.ocf.forEach((v, i) => {
    const h = (v / mx) * maxH;
    const x = gx0 + slot * i + (slot - bw) / 2;
    svg.push(rrect(x, baseY - h, bw, h, 4, i === n - 1 ? 'url(#barCur)' : 'url(#barOcf)'));
    svg.push(t(x + bw / 2, baseY - h - 10, String(v), { size: 17, weight: 600, fill: C.deep, anchor: 'middle' }));
  });
  D.quarters.forEach((q, i) => {
    svg.push(t(gx0 + slot * i + slot / 2, baseY + 28, q, { size: 17, fill: C.gray, anchor: 'middle' }));
  });
}

/* ---------------- ③ 展望 ---------------- */
{
  svg.push(rrect(OB_X, C_Y, OB_W, C_H, 20, '#F2F7FC', `stroke="#DEE9F3" stroke-width="1.5"`));
  svg.push(t(OB_X + 26, C_Y + 42, D.outlook.title, { size: 24, weight: 700, fill: C.deep }));
  D.outlook.items.forEach((it, i) => {
    const y = C_Y + 92 + i * 56;
    svg.push(`<circle cx="${OB_X + 26}" cy="${y - 7}" r="3.6" fill="${C.teal}"/>`);
    svg.push(t(OB_X + 42, y, it.k, { size: 19, fill: C.gray }));
    svg.push(t(OB_X + OB_W - 24, y, it.v, { size: 20, weight: 600, fill: C.ink, anchor: 'end' }));
    if (it.note) svg.push(t(OB_X + 42, y + 20, it.note, { size: 15, fill: C.dim }));
  });
}

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.EARN_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `earnings-${TICK.toLowerCase()}-${stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
