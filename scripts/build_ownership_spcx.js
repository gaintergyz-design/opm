/**
 * Who Owns SpaceX? — 3D 立體餅圖（股權結構）v2 · 淺底（OPM 只做淺色底）
 *   ① 白底冷灰漸變 + 極淡藍光暈 + 軌道細弧
 *   ② 3D 實心餅圖（無洞）：Musk 扇區 = SpaceX 黑，其餘依次淡化為灰階
 *   ③ 標籤帶機構 logo / 個人頭像圓形徽章（白圓底 + 細環）
 *   ④ 星艦（Starship）矢量元素立於底部
 *   用法：NODE_PATH=... node scripts/build_ownership_spcx.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-spcx.json'), 'utf8'));
const A = (f) => path.join(BASE, 'assets', 'spcx', f);

const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' },
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.045, angle: -24 },
  donut: { CX: 540, CY: 775, RX: 292, RY: 186, D: 56 },
  start: -106,
  // 扇區色帶：Musk（最大）= SpaceX 黑 → 依次淡化
  ramp: ['#0E131B', '#6F7A89', '#8A94A2', '#9DA7B4', '#AEB7C3', '#BDC5D0',
         '#C9D0D9', '#D3D9E1', '#DBE0E7', '#E2E6EC', '#E8EBF0'],
};
const { W, H, M, colors: C } = CFG;
const { CX, CY, RX, RY, DEPTH } = CFG.donut;

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, o = {}) {
  const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rad = (d) => d * Math.PI / 180;
const px = (deg, rx = RX, cy = CY) => CX + rx * Math.cos(rad(deg));
const py = (deg, ry = RY, cy = CY) => cy + ry * Math.sin(rad(deg));

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

/* ---------- 幾何 ---------- */
let deg = CFG.start;
const segs = D.segments.map((s, i) => {
  const a0 = deg, a1 = deg + s.pct / 100 * 360;
  deg = a1;
  return { ...s, a0, a1, aMid: (a0 + a1) / 2, i };
});
segs.forEach((s) => { s.color = CFG.ramp[Math.min(s.i, CFG.ramp.length - 1)]; });

function topFace(s) {
  const large = (s.a1 - s.a0) > 180 ? 1 : 0;
  return `M ${px(s.a0)} ${py(s.a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
         `L ${CX} ${CY} Z`;
}
function wallPath(s) {
  const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
  if (a1 - a0 <= 0.5) return '';
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0)} ${py(a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
         `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
         `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
}

/* ---------- 底圖：白底冷灰 ---------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

defs.push(`<linearGradient id="bgL" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F7FAFD"/><stop offset="1" stop-color="#EDF2F8"/></linearGradient>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#bgL)"/>`);

// 極淡藍光暈（右上 / 左下）
defs.push(`<radialGradient id="glowA" cx="0.88" cy="0.10" r="0.52"><stop offset="0" stop-color="#1B4C8F" stop-opacity="0.10"/><stop offset="1" stop-color="#1B4C8F" stop-opacity="0"/></radialGradient>`);
defs.push(`<radialGradient id="glowB" cx="0.08" cy="0.86" r="0.5"><stop offset="0" stop-color="#5C6B80" stop-opacity="0.10"/><stop offset="1" stop-color="#5C6B80" stop-opacity="0"/></radialGradient>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#glowA)"/>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#glowB)"/>`);

// 極細軌道弧（空間感，不搶戲）
a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 128}" ry="${RY + 96}" fill="none" stroke="#C9D6E4" stroke-width="1" stroke-dasharray="5 9" opacity="0.55"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 210}" ry="${RY + 168}" fill="none" stroke="#D7E1EC" stroke-width="1" stroke-dasharray="4 12" opacity="0.45"/>`);

// 水印
const wm = CFG.watermark;
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', fill: C.ink, ls: 6 })}</g>`);

// 右上 handle pill（scaffold 米色）
const handle = '@onepagemarket';
const pw = Math.round(handle.length * 17.6) + 44;
a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="#FAEEDA"/>`);
a.push(t(W - M - pw / 2, 101, handle, { size: 32, weight: 500, fill: '#854F0B', anchor: 'middle' }));

// SpaceX 深色 wordmark
{
  const b64 = fs.readFileSync(A('spacex-dark.png')).toString('base64');
  const lw = 188, lh = Math.round(188 * 123 / 996);
  a.push(`<image x="${W - M - lw}" y="132" width="${lw}" height="${lh}" href="data:image/png;base64,${b64}" opacity="0.86"/>`);
}

// 標題 + 副題
defs.push(`<linearGradient id="steelTxt" x1="0" y1="120" x2="0" y2="185" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#8C97A6"/></linearGradient>`);
a.push(t(M, 96, D.title_line1, { size: 74, weight: 700, fill: C.ink, ls: -1.5 }));
a.push(`<text x="${M}" y="172" font-family="${CFG.font}" font-size="74" font-weight="700" fill="url(#steelTxt)" letter-spacing="-1.5">${esc(D.title_line2)}</text>`);
a.push(`<rect x="${M}" y="200" width="420" height="44" rx="22" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
a.push(t(M + 24, 229, D.subtitle, { size: 20, fill: C.gray }));
a.push(t(M + 444, 229, `Musk holds ~82% voting power via Class B`, { size: 22, fill: C.gray }));

/* --- 地面投影 --- */
defs.push(`<radialGradient id="floorG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#0B1220" stop-opacity="0.18"/><stop offset="0.72" stop-color="#0B1220" stop-opacity="0.08"/><stop offset="1" stop-color="#0B1220" stop-opacity="0"/></radialGradient>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH + 42}" rx="${RX + 140}" ry="66" fill="url(#floorG)"/>`);

/* --- 3D 餅圖 --- */
// 1) 側壁
segs.forEach((s) => {
  const w = wallPath(s);
  if (w) a.push(`<path d="${w}" fill="${shade(s.color, -0.34)}"/>`);
});
// 2) 頂面
segs.forEach((s) => {
  a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
});
// 3) 輪廓描邊（定義剪影）
a.push(`<ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="#0B1220" stroke-opacity="0.10" stroke-width="1.5"/>`);
// 4) 全局光澤
{
  const id = `gloss${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/>` +
    `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0B1220" stop-opacity="0.14"/></linearGradient>`);
  a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 1 1 ${px(270)} ${py(270)} L ${CX} ${CY} Z" fill="url(#${id})"/>`);
}
// 5) 前緣高光
a.push(`<path d="M ${px(0)} ${py(0)} A ${RX} ${RY} 0 0 1 ${px(180)} ${py(180)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>`);

/* --- 標籤（badge + 名稱 + % pill + 引導線）--- */
const badgeCache = {};
function badgeImg(name, size) {
  const f = A(`badge-${name}.png`);
  if (!fs.existsSync(f)) return '';
  if (!badgeCache[name]) badgeCache[name] = fs.readFileSync(f).toString('base64');
  return `<circle r="${size / 2}" fill="#FFFFFF" stroke="#DDE2E9" stroke-width="1.5"/>` +
         `<image x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" href="data:image/png;base64,${badgeCache[name]}"/>`;
}

const chip = (x, y, txt, anchor, fs_) => {
  const w = Math.round(txt.length * 0.60 * fs_) + 36, h = 54;
  const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return { rect: `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="12" fill="${C.ink}"/>`,
           txt: t(x0 + w / 2, y + 39, txt + '%', { size: fs_, weight: 700, fill: '#FFFFFF', anchor: 'middle' }),
           cx: x0 + w / 2, x0, w };
};

// label block：badge + 名稱行 + % pill；mirror=true 時 badge 在右、文字右對齊
function block(s, x, bt, opt = {}) {
  const { nfs = 25, pfs = 36, bsize = 54, lines = null, badgeName = s.badge, role = null, mirror = false } = opt;
  const nameLines = lines || s.name.split('|');
  const blockH = 24 + (nameLines.length + (role ? 1 : 0)) * 32 + 8 + 54;
  const badgeCy = bt + blockH / 2 - 6;
  let out = '';
  let tx, tAnchor, chipAnchor;
  if (mirror) {
    out += badgeName ? `<g transform="translate(${x} ${badgeCy.toFixed(1)})">${badgeImg(badgeName, bsize)}</g>` : '';
    tx = x - bsize / 2 - 14;
    tAnchor = 'end'; chipAnchor = 'end';
  } else {
    out += badgeName ? `<g transform="translate(${x} ${badgeCy.toFixed(1)})">${badgeImg(badgeName, bsize)}</g>` : '';
    tx = x + bsize / 2 + 14;
    tAnchor = 'start'; chipAnchor = 'start';
  }
  nameLines.forEach((ln, j) => { out += t(tx, bt + 24 + j * 32, ln, { size: nfs, weight: 500, fill: C.ink, anchor: tAnchor }); });
  if (role) out += t(tx, bt + 24 + nameLines.length * 32 + 2, role, { size: 19, fill: C.dim, anchor: tAnchor });
  const py0 = bt + 40 + (nameLines.length + (role ? 1 : 0) - 1) * 32 + (role ? 8 : 0);
  const c = chip(tx, py0, s.disp, chipAnchor, pfs);
  out += c.rect + c.txt;
  const anchorPt = mirror ? [c.x0 - 6, py0 + 27] : [tx - 6, py0 + 27];
  return { out, anchorPt };
}

function drawLabel(s, x, bt, opt = {}) {
  const ex = px(s.aMid, RX + 6);
  let ey = py(s.aMid, RY + 6);
  if (Math.sin(rad(s.aMid)) > 0) ey += DEPTH;
  const { out, anchorPt } = block(s, x, bt, opt);
  a.push(`<polyline points="${ex.toFixed(1)},${ey.toFixed(1)} ${anchorPt[0]},${anchorPt[1]}" fill="none" stroke="#AEB7C4" stroke-width="1.5"/>`);
  a.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4.5" fill="${C.ink}" stroke="#FFFFFF" stroke-width="1.5"/>`);
  a.push(out);
}

const segByName = {};
segs.forEach((s) => { segByName[s.name.split('|')[0]] = s; });

// Musk（右側大標籤）
drawLabel(segByName['Elon Musk'], 800, 610, { nfs: 32, pfs: 46, bsize: 88, role: 'Founder · CEO' });
// All Other（左下）
drawLabel(segByName['All Other'], 250, 1010, { nfs: 25, pfs: 40 });
// 左列（由下往上）
drawLabel(segByName['Alphabet'], 130, 850, {});
drawLabel(segByName['Valor Equity'], 110, 715, { lines: ['Valor', 'Equity'] });
drawLabel(segByName['Founders Fund'], 110, 600, {});
// 頂部（由左至右，按圓序 → 引導線不交叉）
drawLabel(segByName['Fidelity (FMR)'], 120, 360, {});
drawLabel(segByName['Vy Capital'], 345, 262, {});
drawLabel(segByName['Gigafund'], 555, 235, {});
drawLabel(segByName['Saudi PIF'], 760, 280, {});
// 右列（mirror：badge 在右、文字右對齊）
drawLabel(segByName['Baron Capital'], 1050, 375, { mirror: true });
drawLabel(segByName['Sequoia Capital'], 1050, 485, { mirror: true });

/* --- 星艦 Starship（底部矢量，淺底配色更深）--- */
function starship(cx, baseY, h) {
  const bw = h * 0.185;
  const noseH = h * 0.24;
  const bodyTop = baseY - h + noseH;
  const bodyBot = baseY - h * 0.05;
  const g = `sg${uid++}`;
  defs.push(`<linearGradient id="${g}" x1="${cx - bw / 2}" y1="0" x2="${cx + bw / 2}" y2="0" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#2A313B"/><stop offset="0.26" stop-color="#7C8695"/><stop offset="0.48" stop-color="#C7CFD9"/><stop offset="0.72" stop-color="#6E7887"/><stop offset="1" stop-color="#1F252E"/></linearGradient>`);
  const tileG = `st${uid++}`;
  defs.push(`<linearGradient id="${tileG}" x1="0" y1="${bodyTop}" x2="0" y2="${bodyBot}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#232A34"/><stop offset="1" stop-color="#333B47"/></linearGradient>`);
  let s = '';
  for (const dx of [-bw * 0.26, 0, bw * 0.26]) {
    s += `<path d="M ${cx + dx - bw * 0.12} ${bodyBot} L ${cx + dx - bw * 0.19} ${baseY} L ${cx + dx + bw * 0.19} ${baseY} L ${cx + dx + bw * 0.12} ${bodyBot} Z" fill="#3C4450" stroke="#242A33" stroke-width="0.8"/>`;
  }
  s += `<rect x="${cx - bw / 2}" y="${bodyBot - h * 0.075}" width="${bw}" height="${h * 0.075}" fill="#4B535F"/>`;
  s += `<path d="M ${cx - bw / 2} ${bodyTop + noseH * 0.2} ` +
       `C ${cx - bw / 2} ${bodyTop - noseH * 0.55}, ${cx + bw / 2} ${bodyTop - noseH * 0.55}, ${cx + bw / 2} ${bodyTop + noseH * 0.2} ` +
       `L ${cx + bw / 2} ${bodyBot} L ${cx - bw / 2} ${bodyBot} Z" fill="url(#${g})"/>`;
  s += `<path d="M ${cx - bw / 2} ${bodyTop + noseH * 0.55} Q ${cx} ${bodyTop + noseH * 0.30}, ${cx + bw / 2} ${bodyTop + noseH * 0.55}" fill="none" stroke="#5E6875" stroke-width="1" opacity="0.8"/>`;
  s += `<path d="M ${cx + bw * 0.18} ${bodyTop + noseH * 0.60} L ${cx + bw / 2} ${bodyTop + noseH * 0.32} L ${cx + bw / 2} ${bodyBot - h * 0.075} L ${cx + bw * 0.18} ${bodyBot - h * 0.075} Z" fill="url(#${tileG})" opacity="0.95"/>`;
  for (let i = 1; i <= 6; i++) {
    const yy = bodyTop + noseH * 0.60 + (bodyBot - h * 0.075 - bodyTop - noseH * 0.60) * i / 7;
    s += `<line x1="${cx + bw * 0.18}" y1="${yy.toFixed(1)}" x2="${cx + bw / 2}" y2="${yy.toFixed(1)}" stroke="#4B535F" stroke-width="0.8" opacity="0.8"/>`;
  }
  const flap = (y0, y1, xw, dir, fillCol, op) =>
    `<path d="M ${cx + dir * bw / 2} ${y0} L ${cx + dir * (bw / 2 + xw)} ${y1} L ${cx + dir * bw * 0.32} ${y1} L ${cx + dir * bw * 0.32} ${y0} Z" fill="${fillCol}" opacity="${op}"/>`;
  s += flap(bodyTop + noseH * 0.52, bodyTop + noseH * 1.30, bw * 0.52, -1, '#6B7583', 0.95);
  s += flap(bodyTop + noseH * 0.52, bodyTop + noseH * 1.30, bw * 0.40, 1, '#4F5865', 0.9);
  s += flap(bodyBot - h * 0.16, bodyBot + h * 0.028, bw * 0.70, -1, '#6B7583', 1);
  s += flap(bodyBot - h * 0.16, bodyBot + h * 0.028, bw * 0.52, 1, '#4F5865', 0.95);
  s += `<line x1="${cx - bw * 0.22}" y1="${bodyTop + noseH * 0.35}" x2="${cx - bw * 0.22}" y2="${bodyBot - h * 0.06}" stroke="#FFFFFF" stroke-width="1.4" opacity="0.45"/>`;
  s += `<ellipse cx="${cx}" cy="${baseY + 3}" rx="${bw * 1.9}" ry="6" fill="#7C93B4" opacity="0.18"/>`;
  return s;
}
a.push(`<g>${starship(540, 1198, 180)}</g>`);

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
fs.writeFileSync(path.join(outDir, `who-owns-spcx-${stamp}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
  background: '#FFFFFF',
}).render().asPng();
fs.writeFileSync(path.join(outDir, `who-owns-spcx-${stamp}.png`), png);
console.log('PNG ->', `out/who-owns-spcx-${stamp}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
