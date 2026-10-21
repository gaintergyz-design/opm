/**
 * Who Owns NVDA? — 等距 3D 環形圖（股權結構）v5
 *   反饋迭代：① 標籤右4/上4/左4 均勻分布、引導線不交叉
 *            ② 最大扇區 = NVIDIA 品牌綠 #76B900，依次變淺
 *            ③ 中心洞 = 3D 立體硬幣 logo（assets/nvda-3d-logo.jpg）
 *            ④ 底色淺綠漸變點綴
 *   用法：NODE_PATH=... node scripts/build_ownership.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-nvda.json'), 'utf8'));

const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' },
  green: '#76B900',                     // NVIDIA 品牌綠（最大扇區起始色）
  pale: '#DDF4BE',                      // 依次變淺的終點色
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
  donut: { CX: 540, CY: 740, RX: 300, RY: 190, IX: 138, IY: 88, D: 52 },
  start: -70,                           // 起始角：讓 All Other 佔住右側大弧
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

/* 顏色：#76B900 → pale 線性插值 */
function lerpColor(h1, h2, f) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const mix = (sa, sb) => Math.round(sa + (sb - sa) * f);
  const r = mix((a >> 16) & 255, (b >> 16) & 255),
        g = mix((a >> 8) & 255, (b >> 8) & 255),
        bl = mix(a & 255, b & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
function shade(hex, f) {          // f>0 變亮, f<0 變暗
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

/* ---------- 幾何 ---------- */
let deg = CFG.start;                    // 順時針
const segs = D.segments.map((s, i) => {
  const a0 = deg, a1 = deg + s.pct / 100 * 360;
  deg = a1;
  return { ...s, a0, a1, aMid: (a0 + a1) / 2, i };
});
// 色帶：i=0（最大）= 品牌綠 #76B900，依次變淺
segs.forEach((s) => { s.color = lerpColor(CFG.green, CFG.pale, s.i / (segs.length - 1)); });

// 標籤分側（按屏幕角度，12 等分槽位保證不交叉）：R=[272,360)∪[0,60) / T=[240,272) / L=[60,240)
const sideOf = (m) => ((m >= 272 || m < 60) ? 'R' : m < 240 ? 'L' : 'T');
const segsR = segs.filter((s) => sideOf(s.aMid) === 'R').sort((p, q) => py(p.aMid, RY + 6) - py(q.aMid, RY + 6));
const segsT = segs.filter((s) => sideOf(s.aMid) === 'T').sort((p, q) => px(p.aMid, RX + 6) - px(q.aMid, RX + 6));
const segsL = segs.filter((s) => sideOf(s.aMid) === 'L').sort((p, q) => py(p.aMid, RY + 6) - py(q.aMid, RY + 6));

function arcPath(rx, ry, cy, a0, a1, sweep) {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0, rx, cy)} ${py(a0, ry, cy)} ` +
         `A ${rx} ${ry} 0 ${large} ${sweep} ${px(a1, rx, cy)} ${py(a1, ry, cy)}`;
}
function topFace(s) {
  const large = (s.a1 - s.a0) > 180 ? 1 : 0;
  return `M ${px(s.a0)} ${py(s.a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
         `L ${px(s.a1, IX)} ${py(s.a1, IY)} ` +
         `A ${IX} ${IY} 0 ${large} 0 ${px(s.a0, IX)} ${py(s.a0, IY)} Z`;
}
function wallPath(s) {           // 只畫下半側（屏幕可見）側壁
  const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
  if (a1 - a0 <= 0.5) return '';
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0)} ${py(a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
         `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
         `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
}
function holeWallPath() {        // 洞的內壁：遠側上半（180°~360°）
  return `M ${px(180, IX)} ${py(180, IY)} ` +
         `A ${IX} ${IY} 0 0 1 ${px(360, IX)} ${py(360, IY)} ` +
         `L ${px(360, IX, CY + DEPTH)} ${py(360, IY, CY + DEPTH)} ` +
         `A ${IX} ${IY} 0 0 0 ${px(180, IX, CY + DEPTH)} ${py(180, IY, CY + DEPTH)} Z`;
}

/* ---------- 組裝 ---------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

// ④ 背景：淺綠漸變 + 兩個極淡綠光暈
{
  const id = `bg${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.52" stop-color="#F6FBEE"/><stop offset="1" stop-color="#ECF6DA"/></linearGradient>`);
  a.push(`<rect width="${W}" height="${H}" fill="url(#${id})"/>`);
  a.push(`<ellipse cx="1000" cy="180" rx="400" ry="320" fill="${CFG.green}" opacity="0.05"/>`);
  a.push(`<ellipse cx="70" cy="1180" rx="380" ry="300" fill="${CFG.green}" opacity="0.045"/>`);
}

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
a.push(t(M, 172, D.title_line2, { size: 74, weight: 700, fill: '#5C8A00', ls: -1.5 }));
a.push(`<rect x="${M}" y="200" width="${M + 210}" height="44" rx="22" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
a.push(t(M + 24, 229, D.subtitle, { size: 20, fill: C.gray }));
// 摘要行（併入 subtitle pill 右側，騰出頂部給標籤）
a.push(t(M + 282, 229, `Institutions hold ${D.institutions_total} · ${D.summary_note}`, { size: 22, fill: C.gray }));

/* --- 3D 環形圖 --- */
// 1) 側壁（先畫，被頂面蓋住上緣）
segs.forEach((s) => {
  const w = wallPath(s);
  if (w) a.push(`<path d="${w}" fill="${shade(s.color, -0.42)}"/>`);
});
// 2) 洞內壁 + 地板 + ③ 3D 硬幣 logo
a.push(`<path d="${holeWallPath()}" fill="${shade(CFG.green, -0.55)}"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${IX}" ry="${IY}" fill="#F4F8EC"/>`);
{
  // 素材：assets/nvda-3d-logo.jpg（PIL 掃描定位：綠色圓盤圓心=(528,576) 半徑=332）
  const SRC = path.join(BASE, 'assets', 'nvda-3d-logo.jpg');
  if (fs.existsSync(SRC)) {
  const SR = 332;                                    // 素材中硬幣半徑
  const sx = (IX * 2) / (SR * 2), sy = (IY * 2) / (SR * 2);  // 非等比縮放貼合洞口橢圓
  const imgW = 1056 * sx, imgH = 1056 * sy;
  const x0 = CX - 528 * sx, y0 = (CY + DEPTH) - 576 * sy;    // 素材圓心(528,576) 映射到洞口圓心
  const id = `coin${uid++}`;
  const b64 = fs.readFileSync(SRC).toString('base64');
  defs.push(`<clipPath id="${id}"><ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${IX}" ry="${IY}"/></clipPath>`);
  a.push(`<g clip-path="url(#${id})"><image x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${imgW.toFixed(1)}" height="${imgH.toFixed(1)}" preserveAspectRatio="none" href="data:image/jpeg;base64,${b64}"/></g>`);
  } else {
    a.push(t(CX, CY + DEPTH + 8, 'NVDA', { size: 34, weight: 700, fill: CFG.green, anchor: 'middle' }));
  }
}
// 3) 頂面（白色描邊分隔）
segs.forEach((s) => {
  a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
});
// 4) 全局光澤（斜向高光 → 透明 → 底部暗）
{
  const id = `gloss${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/>` +
    `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0B1220" stop-opacity="0.20"/></linearGradient>`);
  a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 1 1 ${px(270)} ${py(270)} ` +
         `L ${px(270, IX)} ${py(270, IY)} A ${IX} ${IY} 0 1 0 ${px(-90, IX)} ${py(-90, IY)} Z" fill="url(#${id})"/>`);
}

/* --- ① 標籤 + 引導線：頂部 7 個小扇區按角度排「雙排弧形錯層」（外排4/內排3），
       左欄 4 + 右欄 1（All Other）。起終點 x/y 皆單調 → 引導線兩兩不交叉、不穿環。 --- */
const chip = (x, y, txt, anchor) => {
  const w = Math.round(txt.length * 0.62 * 26) + 26, h = 44;
  const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.ink}"/>` +
         t(x0 + w / 2, y + 30, txt + '%', { size: 26, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
};
const block = (bt, lines, disp, anchor, x) => {
  lines.forEach((ln, j) => a.push(t(x, bt + 21 + j * 24, ln, { size: 19, weight: 500, anchor })));
  a.push(chip(x, bt + 30 + (lines.length - 1) * 24, disp, anchor));
};
const segByName = {};
segs.forEach((s) => { segByName[s.name.split('|')[0]] = s; });

const drawLabel = (s, x, bt, anchor, elbowR = 0) => {
  const ex = px(s.aMid, RX + 6), ey = py(s.aMid, RY + 6);
  let pts = `${ex.toFixed(1)},${ey.toFixed(1)}`;
  if (elbowR) pts += ` ${px(s.aMid, RX + elbowR).toFixed(1)},${py(s.aMid, RY + elbowR).toFixed(1)}`;
  const tx = anchor === 'middle' ? x : anchor === 'end' ? 216 : 868;
  const ty = anchor === 'middle' ? bt + 74 : bt + 52;   // middle 連 chip 底中點，其餘連 chip 側中點
  a.push(`<polyline points="${pts} ${tx},${ty}" fill="none" stroke="#AEBFA4" stroke-width="1.5"/>`);
  a.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="${CFG.green}" stroke="#FFFFFF" stroke-width="1.5"/>`);
  block(bt, s.name.split('|'), s.disp, anchor, x);
};

// 頂部外排（bt=260，離環遠）
drawLabel(segByName['Insiders'], 340, 260, 'middle');
drawLabel(segByName['JPMorgan Chase'], 520, 260, 'middle');
drawLabel(segByName['T. Rowe Price'], 700, 260, 'middle');
drawLabel(segByName['Invesco'], 860, 260, 'middle');
// 頂部內排（bt=330，靠近環）
drawLabel(segByName['Geode Capital'], 440, 330, 'middle');
drawLabel(segByName['Capital Group'], 620, 330, 'middle');
drawLabel(segByName['Morgan Stanley'], 800, 330, 'middle');
// 左欄 4（全部單段直線，貼環外緣通過不交叉）
drawLabel(segByName['State Street'], 216, 550, 'end');
drawLabel(segByName['Fidelity (FMR)'], 216, 650, 'end');
drawLabel(segByName['BlackRock'], 216, 780, 'end');
drawLabel(segByName['Vanguard'], 216, 900, 'end');
// 右欄：All Other（三行名稱）
drawLabel(segByName['All Other'], 868, 750, 'start');

/* --- 頁腳 --- */
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
  background: '#FFFFFF',
}).render().asPng();
fs.writeFileSync(path.join(outDir, `who-owns-nvda-${stamp}.png`), png);
console.log('PNG ->', `out/who-owns-nvda-${stamp}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
