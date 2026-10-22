/**
 * Who Owns SpaceX? — 3D 立體環形圖（股權結構）v3 · 淺底
 *   反饋迭代（2026-10-22 阿澤三點）：
 *   ① 引導線改 moneywise Tesla 卡式折線：錨點 → 斜段 → 正交段 → 徽章邊緣
 *   ② 標籤按就近扇區分區排列，列內等距、離環距離均勻
 *   ③ 餅圖 = 3D 立體「空心」環 + 中心 SpaceX X logo 金屬圓盤
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
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  start: -106,
  // 扇區色帶：Musk（最大）= SpaceX 黑 → 依次淡化
  ramp: ['#0E131B', '#6F7A89', '#8A94A2', '#9DA7B4', '#AEB7C3', '#BDC5D0',
         '#C9D0D9', '#D3D9E1', '#DBE0E7', '#E2E6EC', '#E8EBF0'],
};
const { W, H, M, colors: C } = CFG;
const { CX, CY, RX, RY, IX, IY, DEPTH } = CFG.ring;

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

function topFace(s) {          // 環形扇區（空心）
  const large = (s.a1 - s.a0) > 180 ? 1 : 0;
  return `M ${px(s.a0)} ${py(s.a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
         `L ${px(s.a1, IX)} ${py(s.a1, IY)} ` +
         `A ${IX} ${IY} 0 ${large} 0 ${px(s.a0, IX)} ${py(s.a0, IY)} Z`;
}
function wallPath(s) {         // 外側壁（僅下半可見）
  const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
  if (a1 - a0 <= 0.5) return '';
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0)} ${py(a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
         `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
         `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
}
function holeWallPath() {      // 洞內壁（遠側上半）
  return `M ${px(180, IX)} ${py(180, IY)} ` +
         `A ${IX} ${IY} 0 0 1 ${px(360, IX)} ${py(360, IY)} ` +
         `L ${px(360, IX, CY + DEPTH)} ${py(360, IY, CY + DEPTH)} ` +
         `A ${IX} ${IY} 0 0 0 ${px(180, IX, CY + DEPTH)} ${py(180, IY, CY + DEPTH)} Z`;
}

/* ---------- 底圖 ---------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

defs.push(`<linearGradient id="bgL" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F7FAFD"/><stop offset="1" stop-color="#EDF2F8"/></linearGradient>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#bgL)"/>`);

defs.push(`<radialGradient id="glowA" cx="0.88" cy="0.10" r="0.52"><stop offset="0" stop-color="#1B4C8F" stop-opacity="0.10"/><stop offset="1" stop-color="#1B4C8F" stop-opacity="0"/></radialGradient>`);
defs.push(`<radialGradient id="glowB" cx="0.08" cy="0.86" r="0.5"><stop offset="0" stop-color="#5C6B80" stop-opacity="0.10"/><stop offset="1" stop-color="#5C6B80" stop-opacity="0"/></radialGradient>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#glowA)"/>`);
a.push(`<rect width="${W}" height="${H}" fill="url(#glowB)"/>`);

// 細軌道弧
a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 72}" ry="${RY + 58}" fill="none" stroke="#C9D6E4" stroke-width="1" stroke-dasharray="5 9" opacity="0.5"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 150}" ry="${RY + 130}" fill="none" stroke="#D7E1EC" stroke-width="1" stroke-dasharray="4 12" opacity="0.4"/>`);

// 水印
const wm = CFG.watermark;
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', fill: C.ink, ls: 6 })}</g>`);

// 右上 handle pill
const handle = '@onepagemarket';
const pw = Math.round(handle.length * 17.6) + 44;
a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="#FAEEDA"/>`);
a.push(t(W - M - pw / 2, 101, handle, { size: 32, weight: 500, fill: '#854F0B', anchor: 'middle' }));

// SpaceX 深色 wordmark
{
  const b64 = fs.readFileSync(A('spacex-dark.png')).toString('base64');
  const lw = 188, lh = Math.round(188 * 41 / 332);
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
defs.push(`<radialGradient id="floorG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#0B1220" stop-opacity="0.16"/><stop offset="0.72" stop-color="#0B1220" stop-opacity="0.07"/><stop offset="1" stop-color="#0B1220" stop-opacity="0"/></radialGradient>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH + 42}" rx="${RX + 140}" ry="66" fill="url(#floorG)"/>`);

/* --- 3D 空心環 --- */
// 1) 外側壁
segs.forEach((s) => {
  const w = wallPath(s);
  if (w) a.push(`<path d="${w}" fill="${shade(s.color, -0.34)}"/>`);
});
// 2) 洞內壁（遠側）
a.push(`<path d="${holeWallPath()}" fill="${shade('#6F7A89', -0.25)}"/>`);
// 3) 中心 X logo 金屬圓盤
{
  const DX = CX, DY = CY + 16, DRX = 108, DRY = 62, DD = 18;
  const g1 = `discTop${uid++}`, g2 = `discRim${uid++}`;
  defs.push(`<radialGradient id="${g1}" cx="0.38" cy="0.30" r="0.75">` +
    `<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#CBD3DD"/><stop offset="1" stop-color="#8B96A4"/></radialGradient>`);
  defs.push(`<linearGradient id="${g2}" x1="${DX - DRX}" y1="0" x2="${DX + DRX}" y2="0" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#6E7887"/><stop offset="0.5" stop-color="#A5AFBC"/><stop offset="1" stop-color="#5A6472"/></linearGradient>`);
  // 盤緣（側面）
  a.push(`<path d="M ${DX - DRX} ${DY} A ${DRX} ${DRY} 0 1 0 ${DX + DRX} ${DY} ` +
         `L ${DX + DRX} ${DY + DD} A ${DRX} ${DRY} 0 1 1 ${DX - DRX} ${DY + DD} Z" fill="url(#${g2})"/>`);
  a.push(`<ellipse cx="${DX}" cy="${DY + DD}" rx="${DRX}" ry="${DRY}" fill="#8C97A5" opacity="0.5"/>`);
  // 盤在洞內的投影
  a.push(`<ellipse cx="${DX}" cy="${DY + DD + 12}" rx="${DRX * 0.92}" ry="14" fill="#0B1220" opacity="0.13"/>`);
  // 盤頂面
  a.push(`<ellipse cx="${DX}" cy="${DY}" rx="${DRX}" ry="${DRY}" fill="url(#${g1})" stroke="#FFFFFF" stroke-width="1.5"/>`);
  a.push(`<ellipse cx="${DX}" cy="${DY}" rx="${DRX - 7}" ry="${DRY - 5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.2"/>`);
  // X logo
  const b64 = fs.readFileSync(A('x-mark.png')).toString('base64');
  const lw = 96, lh = Math.round(96 * 246 / 630);
  a.push(`<image x="${DX - lw / 2 - 2}" y="${DY - lh / 2 - 2}" width="${lw}" height="${lh}" href="data:image/png;base64,${b64}"/>`);
}
// 4) 頂面（環形扇區）
segs.forEach((s) => {
  a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
});
// 5) 輪廓
a.push(`<ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="#0B1220" stroke-opacity="0.10" stroke-width="1.5"/>`);
// 6) 全局光澤（環形）
{
  const id = `gloss${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/>` +
    `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0B1220" stop-opacity="0.14"/></linearGradient>`);
  a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 1 1 ${px(270)} ${py(270)} ` +
         `L ${px(270, IX)} ${py(270, IY)} A ${IX} ${IY} 0 1 0 ${px(-90, IX)} ${py(-90, IY)} Z" fill="url(#${id})"/>`);
}
// 7) 前緣高光
a.push(`<path d="M ${px(0)} ${py(0)} A ${RX} ${RY} 0 0 1 ${px(180)} ${py(180)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>`);

/* --- 標籤（badge + 名稱 + % pill + Tesla 式折線）--- */
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
           x0, w };
};

// label block：回傳 { out, P }
//   touch: 'right' 接 badge 右緣（左列標籤）| 'left' 接 badge 左緣（mirror 標籤）
//          | 'bottom' 接 badge 底緣（頂行標籤，線從下方上來）| 'top' 接 badge 頂緣（線從上方下來）
function block(s, x, bt, opt = {}) {
  const { nfs = 25, pfs = 36, bsize = 54, lines = null, badgeName = s.badge, role = null, mirror = false, touch = 'right' } = opt;
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
  const P = touch === 'bottom' ? [x, badgeCy + bsize / 2 + 4]
          : touch === 'top'    ? [x, badgeCy - bsize / 2 - 4]
          : touch === 'left'  ? [x - bsize / 2 - 4, badgeCy]
          :                     [x + bsize / 2 + 4, badgeCy];
  return { out, P };
}

function drawLabel(s, x, bt, opt = {}) {
  const ex = px(s.aMid, RX + 6);
  let ey = py(s.aMid, RY + 6);
  if (Math.sin(rad(s.aMid)) > 0) ey += DEPTH;
  const { out, P } = block(s, x, bt, opt);
  const K = opt.touch === 'bottom' ? [P[0], P[1] + 36]
          : opt.touch === 'top'    ? [P[0], P[1] - 36]
          : [P[0] + (opt.touch === 'left' ? -36 : 36), P[1]];
  a.push(`<polyline points="${ex.toFixed(1)},${ey.toFixed(1)} ${K[0]},${K[1]} ${P[0]},${P[1]}" fill="none" stroke="#9AA5B1" stroke-width="1.2"/>`);
  a.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.5" fill="#FFFFFF" stroke="${C.ink}" stroke-width="1.4"/>`);
  a.push(out);
}

const segByName = {};
segs.forEach((s) => { segByName[s.name.split('|')[0]] = s; });

/* --- 槽位（v3.1：就近扇區、列內等距、離環距離均勻、折線不交叉不穿塊）--- */
// 頂行（錨點都在頂部弧）——等距 ~235
drawLabel(segByName['Vy Capital'], 300, 250, { touch: 'bottom' });
drawLabel(segByName['Gigafund'], 545, 255, { touch: 'bottom' });
drawLabel(segByName['Saudi PIF'], 770, 270, { touch: 'bottom' });
// 左列弧形（錨點在左上弧，隨錨點高度漸落）
drawLabel(segByName['Fidelity (FMR)'], 150, 480, { lines: ['Fidelity', '(FMR)'] });
drawLabel(segByName['Founders Fund'], 110, 610, { lines: ['Founders', 'Fund'] });
drawLabel(segByName['Valor Equity'], 150, 800, { lines: ['Valor', 'Equity'] });
drawLabel(segByName['Alphabet'], 300, 1010, {});
// 右列（mirror，badge 在右）
drawLabel(segByName['Baron Capital'], 880, 430, { mirror: true, touch: 'left' });
drawLabel(segByName['Sequoia Capital'], 950, 545, { mirror: true, touch: 'left' });
drawLabel(segByName['Elon Musk'], 988, 800, { mirror: true, touch: 'top', nfs: 32, pfs: 46, bsize: 88, role: 'Founder · CEO' });
// 底部（All Other，線從上方下來接 badge 頂緣）
drawLabel(segByName['All Other'], 760, 1020, { touch: 'top', nfs: 25, pfs: 40 });

/* --- 星艦 Starship（底部矢量）--- */
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
a.push(`<g>${starship(540, 1198, 178)}</g>`);

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
