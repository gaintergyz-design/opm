/**
 * Who Owns NVDA? — 等距 3D 環形圖（股權結構）
 *   數據：data/ownership-nvda.json（13F，人工核實後寫入）
 *   版式：與 onepagemarket 卡片一致（handle pill / 水印 / 免責頁腳）
 *   用法：NODE_PATH=... node scripts/build_ownership.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-nvda.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' },
  green: '#76B900',                     // NVIDIA 品牌綠
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
  donut: { CX: 540, CY: 660, RX: 300, RY: 190, IX: 138, IY: 88, D: 52 },
};
const { W, H, M, colors: C } = CFG;
const { CX, CY, RX, RY, IX, IY, DEPTH } = { ...CFG.donut, DEPTH: CFG.donut.D };

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, o = {}) {
  const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rad = (d) => d * Math.PI / 180;
const px = (deg, rx = RX, cy = CY) => CX + rx * Math.cos(rad(deg));
const py = (deg, ry = RY, cy = CY) => cy + ry * Math.sin(rad(deg));

// 顏色工具
function shade(hex, f) {          // f>0 變亮, f<0 變暗
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

// NVIDIA 綠色系色帶（深 → 淺）
const PALETTE = ['#0C3B2A', '#11573A', '#17724A', '#1F8C58', '#2AA263', '#3CB56E',
                 '#5CC47C', '#7ED18C', '#9CDE9D', '#B8E9AE', '#D0F2C0', '#E4F8D2'];

/* ---------- 幾何 ---------- */
let deg = -90;                          // 從 12 點鐘順時針
const segs = D.segments.map((s, i) => {
  const a0 = deg, a1 = deg + s.pct / 100 * 360;
  deg = a1;
  return { ...s, a0, a1, aMid: (a0 + a1) / 2, color: PALETTE[i % PALETTE.length], i };
});

function arcPath(rx, ry, cy, a0, a1, sweep) {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0, rx, cy)} ${py(a0, ry, cy)} ` +
         `A ${rx} ${ry} 0 ${large} ${sweep} ${px(a1, rx, cy)} ${py(a1, ry, cy)}`;
}

// 頂面（環形扇區）
function topFace(s) {
  const large = (s.a1 - s.a0) > 180 ? 1 : 0;
  return `M ${px(s.a0)} ${py(s.a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
         `L ${px(s.a1, IX)} ${py(s.a1, IY)} ` +
         `A ${IX} ${IY} 0 ${large} 0 ${px(s.a0, IX)} ${py(s.a0, IY)} Z`;
}

// 側壁：只畫位於下半圓（0°~180°，屏幕 y 向下為正）的可見部分
function wallPath(s) {
  const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
  if (a1 - a0 <= 0.5) return '';
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0)} ${py(a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
         `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
         `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
}

// 洞的內壁：遠側上半（180°~360°）
function holeWallPath() {
  return `M ${px(180, IX)} ${py(180, IY)} ` +
         `A ${IX} ${IY} 0 0 1 ${px(360, IX)} ${py(360, IY)} ` +
         `L ${px(360, IX, CY + DEPTH)} ${py(360, IY, CY + DEPTH)} ` +
         `A ${IX} ${IY} 0 0 0 ${px(180, IX, CY + DEPTH)} ${py(180, IY, CY + DEPTH)} Z`;
}

/* ---------- 組裝 ---------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
       `<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// 水印
const wm = CFG.watermark;
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', ls: 6 })}</g>`);

// 右上 handle pill（同 scaffold）
const handle = '@onepagemarket';
const pw = Math.round(handle.length * 17.6) + 44;
a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="#FAEEDA"/>`);
a.push(t(W - M - pw / 2, 101, handle, { size: 32, weight: 500, fill: '#854F0B', anchor: 'middle' }));

// 標題（兩行）＋副題 pill
a.push(t(M, 96, D.title_line1, { size: 74, weight: 700, ls: -1.5 }));
a.push(t(M, 172, D.title_line2, { size: 74, weight: 700, fill: CFG.green, ls: -1.5 }));
a.push(`<rect x="${M}" y="200" width="${M + 210}" height="44" rx="22" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
a.push(t(M + 24, 229, D.subtitle, { size: 20, fill: C.gray }));

/* --- 3D 環形圖 --- */
// 1) 側壁（先畫，被頂面蓋住上緣）
segs.forEach((s) => {
  const w = wallPath(s);
  if (w) a.push(`<path d="${w}" fill="${shade(s.color, -0.45)}"/>`);
});
// 2) 洞內壁 + 地板 + logo
a.push(`<path d="${holeWallPath()}" fill="${shade(PALETTE[0], -0.6)}"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${IX}" ry="${IY}" fill="#F2F4F7"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${IX}" ry="${IY}" fill="none" stroke="#DDE2E8" stroke-width="1.5"/>`);
{
  const uri = LOGOS['NVDA'];
  const L = 108;
  if (uri) {
    const id = `lp${uid++}`;
    defs.push(`<clipPath id="${id}"><circle cx="${CX}" cy="${CY + DEPTH}" r="${L / 2}"/></clipPath>`);
    a.push(`<g clip-path="url(#${id})"><image x="${CX - L / 2}" y="${CY + DEPTH - L / 2}" width="${L}" height="${L}" href="${uri}"/></g>`);
    a.push(`<circle cx="${CX}" cy="${CY + DEPTH}" r="${L / 2}" fill="none" stroke="#D6DAE1" stroke-width="1.5"/>`);
  } else {
    a.push(t(CX, CY + DEPTH + 8, 'NVDA', { size: 34, weight: 700, fill: CFG.green, anchor: 'middle' }));
  }
}
// 3) 頂面
segs.forEach((s) => {
  a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
});
// 4) 全局光澤（斜向高光 → 透明 → 底部暗）
{
  const id = `gloss${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/>` +
    `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0B1220" stop-opacity="0.22"/></linearGradient>`);
  const large = 1;
  a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 ${large} 1 ${px(270)} ${py(270)} ` +
         `L ${px(270, IX)} ${py(270, IY)} A ${IX} ${IY} 0 ${large} 0 ${px(-90, IX)} ${py(-90, IY)} Z" fill="url(#${id})"/>`);
}

/* --- 標籤 + 引導線（按扇區角度分配槽位，保證引導線不交叉） --- */
const chip = (x, y, txt, anchor) => {
  const w = Math.round(txt.length * 0.62 * 26) + 26, h = 44;
  const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.ink}"/>` +
         t(x0 + w / 2, y + 30, txt + '%', { size: 26, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
};
const block = (bt, lines, disp, anchor, x) => {
  // 一個標籤塊：名稱（可多行）在上、chip 在下
  const fs_ = anchor === 'end' || anchor === 'start' ? 19 : 21;
  lines.forEach((ln, j) => a.push(t(x, bt + 21 + j * 24, ln, { size: fs_, weight: 500, anchor })));
  a.push(chip(x, bt + 30 + (lines.length - 1) * 24, disp, anchor));
};
const segsR = segs.filter((s) => s.side === 'R');
const segsB = segs.filter((s) => s.side === 'B').sort((p, q) => p.aMid - q.aMid);
const segsL = segs.filter((s) => s.side === 'L').sort((p, q) => q.aMid - p.aMid); // 角度大（靠頂）在前

// 右側：All Other（名稱豎排三行）
segsR.forEach((s) => {
  const mid = s.aMid;
  const ex = px(mid, RX + 6), ey = py(mid, RY + 6);
  const lines = s.name.split('|');
  const bt = 424;
  a.push(`<polyline points="${ex},${ey} 876,${bt + 46}" fill="none" stroke="#C3CAD3" stroke-width="1.5"/>`);
  block(bt, lines, s.disp, 'start', 868);
});
// 左側：其餘 9 個。等比映射 + 最小間距 88px（防止文字塊重疊）
{
  const ys = segsL.map((s) => py(s.aMid, RY + 6));
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const y0 = 316, y1 = 1020, minGap = 88;
  const mapped = segsL.map((s, i) => y0 + (ys[i] - minY) / (maxY - minY) * (y1 - y0));
  const btList = [];
  let prev = -1e9;
  for (const y of mapped) { const v = Math.max(y, prev + minGap); btList.push(v); prev = v; }
  segsL.forEach((s, i) => {
    const mid = s.aMid;
    const ex = px(mid, RX + 6), ey = py(mid, RY + 6);
    const bt = btList[i];
    a.push(`<polyline points="${ex},${ey} 216,${(bt + 40).toFixed(1)}" fill="none" stroke="#C3CAD3" stroke-width="1.5"/>`);
    block(bt, s.name.split('|'), s.disp, 'end', 208);
  });
}
// 底部：Vanguard / BlackRock（移到頁腳上方，避開左欄）
segsB.forEach((s) => {
  const mid = s.aMid;
  const ex = px(mid, RX + 6), ey = py(mid, RY + 6);
  const x = s.name === 'BlackRock' ? 150 : 330, bt = 1140;
  a.push(`<polyline points="${ex},${ey} ${x},${bt - 12}" fill="none" stroke="#C3CAD3" stroke-width="1.5"/>`);
  block(bt, s.name.split('|'), s.disp, 'middle', x);
});

/* --- 摘要 + 頁腳 --- */
a.push(t(M, 272, `Institutions hold ${D.institutions_total} · ${D.summary_note}`, { size: 22, fill: C.gray }));
a.push(`<rect x="${M}" y="${H - 118}" width="${W - M * 2}" height="1" fill="${C.line}"/>`);
a.push(t(M, H - 78, 'For informational purposes only. Not investment advice.', { size: 20, fill: C.dim }));
a.push(t(W - M, H - 78, handle, { size: 20, fill: C.dim, anchor: 'end' }));
a.push(t(M, H - 48, `Data as of ${D.data_as_of} · Source: ${D.source}`, { size: 18, fill: C.dim }));

a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.PAGES_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
fs.writeFileSync(path.join(outDir, `who-owns-nvda-${stamp}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
  background: C.bg,
}).render().asPng();
fs.writeFileSync(path.join(outDir, `who-owns-nvda-${stamp}.png`), png);
console.log('PNG ->', `out/who-owns-nvda-${stamp}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
