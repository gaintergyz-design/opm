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
const { CX, CY, RX, RY, IX, IY, D: DEPTH } = CFG.ring;

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

const estW = (txt, fs_) => txt.length * 0.62 * fs_;
const pillW = (disp, pfs) => disp.length * 0.6 * pfs + 34;

const chip = (x, y, txt, anchor, fs_, h) => {
  const w = Math.round(pillW(txt, fs_));
  const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return { rect: `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="${Math.round(h * 0.24)}" fill="${C.ink}"/>`,
           txt: t(x0 + w / 2, y + h / 2 + fs_ * 0.365, txt + '%', { size: fs_, weight: 700, fill: '#FFFFFF', anchor: 'middle' }),
           x0, w };
};

// 統一的區塊量測：render 與碰撞盒共用，避免「畫出來的和算的不一致」
function metrics(s, opt) {
  const { nfs = 23, pfs = 34, role = null, lines = null } = opt;
  const nameLines = lines || s.name.split('|');
  const nameH = Math.round(nfs * 1.3);
  const pillH = Math.max(50, Math.round(pfs * 1.32));
  const roleH = role ? 22 : 0;
  const gap = 8, padT = 3, padB = 3;
  const tw = Math.max(...nameLines.map((l) => estW(l, nfs)), role ? estW(role, 17) : 0, pillW(s.disp, pfs));
  const lastBase = padT + nfs + (nameLines.length - 1) * nameH;
  const pillY = lastBase + roleH + gap;
  return { nameLines, nameH, pillH, tw, pillY, blockH: pillY + pillH + padB, padT };
}

function block(s, badgeCx, badgeCy, opt = {}) {
  const { bsize = 46, nfs = 23, pfs = 34, badgeName = s.badge, role = null, mirror = false } = opt;
  const m = metrics(s, opt);
  const bs = badgeName ? bsize : 0;
  const top = badgeCy - m.blockH / 2;
  const tx = mirror ? badgeCx - bs / 2 - 12 : badgeCx + bs / 2 + 12;
  const anc = mirror ? 'end' : 'start';
  let out = badgeName
    ? `<g transform="translate(${badgeCx.toFixed(1)} ${badgeCy.toFixed(1)})">${badgeImg(badgeName, bsize)}</g>`
    : '';
  m.nameLines.forEach((ln, j) => {
    out += t(tx, top + m.padT + nfs + j * m.nameH, ln, { size: nfs, weight: 500, fill: C.ink, anchor: anc });
  });
  if (role) out += t(tx, top + m.padT + nfs + (m.nameLines.length - 1) * m.nameH + 20, role, { size: 17, fill: C.dim, anchor: anc });
  const c = chip(tx, top + m.pillY, s.disp, anc, pfs, m.pillH);
  return out + c.rect + c.txt;
}

function blockBox(s, badgeCx, badgeCy, opt) {
  const { bsize = 46, badgeName = s.badge, mirror = false } = opt;
  const m = metrics(s, opt);
  const bs = badgeName ? bsize : 0;
  const x0 = mirror ? badgeCx - bs / 2 - 12 - m.tw : badgeCx - bs / 2;
  return { x0, y0: badgeCy - m.blockH / 2, x1: x0 + bs + 12 + m.tw, y1: badgeCy + m.blockH / 2 };
}

/* --- 軌道槽位：11 個標籤等角落在與環「同心等比放大」的橢圓軌道上（moneywise 式），
       標籤到環邊緣的視覺間距處處一致。循環序 = 扇區錨點序 → 引線保序不相交。
       程式搜索放大量 g / 圓心 x / 起始角；硬約束：不越界、互不重疊、不壓環、
       避開星艦與副題行。 --- */
const NAME_LINES = {
  'Elon Musk': ['Elon', 'Musk'],
  'All Other|Institutions|& Public': ['All Other', '& Public'],
  'Fidelity (FMR)': ['Fidelity', '(FMR)'],
  'Founders Fund': ['Founders', 'Fund'],
  'Valor Equity': ['Valor', 'Equity'],
  'Vy Capital': ['Vy', 'Capital'],
  'Saudi PIF': ['Saudi', 'PIF'],
  'Baron Capital': ['Baron', 'Capital'],
  'Sequoia Capital': ['Sequoia', 'Capital'],
};
const boxesHit = (a, b, gap = 0) => !(a.x1 + gap < b.x0 || b.x1 + gap < a.x0 || a.y1 + gap < b.y0 || b.y1 + gap < a.y0);

const MUSK = 'Elon Musk';
function buildSlot(s, th, ORB) {
  const cosT = Math.cos(rad(th)), sinT = Math.sin(rad(th));
  const big = s.name === MUSK;
  const bsize = big ? 84 : 46;
  const opt = {
    bsize,
    mirror: cosT < -0.15,
    nfs: big ? 31 : 23,
    pfs: big ? 44 : 34,
    lines: NAME_LINES[s.name] || null,
    role: big ? 'Founder · CEO' : null,
  };
  const slot = { x: ORB.cx + ORB.rxg * cosT, y: ORB.cy + ORB.ryg * sinT };
  const badgeC = { x: slot.x + cosT * bsize / 2, y: slot.y + sinT * bsize / 2 };
  const box = blockBox(s, badgeC.x, badgeC.y, opt);
  return { s, th, badgeC, bsize, opt, box };
}

const circDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

function violCount(slots, ringBox, shipBox, noteBox) {
  let v = 0; const det = { bounds: 0, ring: 0, ship: 0, note: 0, pair: 0 };
  for (const sl of slots) {
    const b = sl.box;
    if (b.x0 < 20 || b.x1 > 1062 || b.y0 < 254 || b.y1 > 1220) { v += 4; det.bounds++; }
    if (boxesHit(b, ringBox)) { v += 6; det.ring++; }
    if (boxesHit(b, shipBox)) { v += 6; det.ship++; }
    if (boxesHit(b, noteBox)) { v += 6; det.note++; }
  }
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      if (boxesHit(slots[i].box, slots[j].box, 3)) { v += 3; det.pair++; }
  return { v, det };
}

// 單槽抖動微調：在 ±jitter 內逐槽搜角度；先消違反，同分時優先保持等角（最小 |dj|）
function refine(slots0, ORB, ringBox, shipBox, noteBox) {
  const slots = slots0.slice();
  const base = slots.map((sl) => sl.th);
  for (let pass = 0; pass < 2; pass++) {
    let passBest = Infinity;
    for (let i = 0; i < slots.length; i++) {
      let bestTh = slots[i].th, bestScore = Infinity;
      for (let dj = -10; dj <= 10; dj += 1) {
        const th = base[i] + dj;
        const trial = slots.map((sl, k) => (k === i ? buildSlot(sl.s, th, ORB) : sl));
        const { v } = violCount(trial, ringBox, shipBox, noteBox);
        const score = v * 1000 + Math.abs(dj);
        if (score < bestScore) { bestScore = score; bestTh = th; }
      }
      slots[i] = buildSlot(slots[i].s, bestTh, ORB);
      passBest = Math.min(passBest, Math.floor(bestScore / 1000));
    }
    if (passBest === 0) break;
  }
  return slots;
}

const RINGBOX = { x0: CX - RX - 3, y0: CY - RY - 3, x1: CX + RX + 3, y1: CY + RY + DEPTH + 3 };
const SHIPBOX = { x0: 502, y0: 1012, x1: 578, y1: 1206 };
const NOTEBOX = { x0: 486, y0: 203, x1: 1018, y1: 248 };

// 松弛：在「零違反、保持環序」的前提下，把每個標籤朝自己扇區錨角拉近（縮短引線）
function relax(slots0, ORB, ringBox, shipBox, noteBox) {
  const th = slots0.map((sl) => sl.th);
  const base = th.slice();          // 等角基準，避免逐輪漂移
  const N = th.length;
  const rebuild = (i, t) => slots0.map((sl, k) => (k === i ? buildSlot(sl.s, t, ORB) : sl));
  const ok = (arr) => violCount(arr, ringBox, shipBox, noteBox).v === 0;
  for (let pass = 0; pass < 24; pass++) {
    let improved = false;
    for (let i = 0; i < N; i++) {
      const prev = i === 0 ? th[N - 1] - 360 : th[i - 1];
      const next = i === N - 1 ? th[0] + 360 : th[i + 1];
      const lo = Math.max(prev + 2, base[i] - 34), hi = Math.min(next - 2, base[i] + 34);
      if (hi - lo < 0.5) continue;
      let bestT = th[i], bestC = circDiff(th[i], slots0[i].s.aMid);
      for (let t = lo; t <= hi; t += 0.5) {
        const c = circDiff(t, slots0[i].s.aMid) + Math.abs(t - th[i]) * 0.02;
        if (c < bestC - 1e-9) {
          const trial = rebuild(i, t);
          if (ok(trial)) { bestC = c; bestT = t; improved = true; }
        }
      }
      th[i] = bestT;
    }
    if (!improved) break;
  }
  return slots0.map((sl, i) => buildSlot(sl.s, th[i], ORB));
}

// 兩段式：粗網格打分（便宜）→ 只精修前 N 個候選（貴）
function searchOrbit() {
  const N = segs.length, step = 360 / N;
  const cands = [];
  for (let g = 132; g >= 104; g -= 4) {
    for (let Cc = 590; Cc >= 490; Cc -= 5) {
      for (let th0 = -80; th0 <= 80; th0 += 2) {
        const ORB = { cx: Cc, cy: CY, rxg: RX + g, ryg: RY + g };
        const slots = segs.map((s, i) => buildSlot(s, th0 + i * step, ORB));
        const { v } = violCount(slots, RINGBOX, SHIPBOX, NOTEBOX);
        let dev = 0; slots.forEach((sl) => { dev += circDiff(sl.th, sl.s.aMid); });
        cands.push({ v, fit: dev + (132 - g) * 0.2 + Math.abs(Cc - 540) * 0.2, ORB, th0 });
      }
    }
  }
  cands.sort((x, y) => x.v - y.v || x.fit - y.fit);
  let best = null;
  for (const c of cands.slice(0, 60)) {
    let slots = refine(segs.map((s, i) => buildSlot(s, c.th0 + i * step, c.ORB)), c.ORB, RINGBOX, SHIPBOX, NOTEBOX);
    if (violCount(slots, RINGBOX, SHIPBOX, NOTEBOX).v === 0) {
      slots = relax(slots, c.ORB, RINGBOX, SHIPBOX, NOTEBOX);
    }
    const { v, det } = violCount(slots, RINGBOX, SHIPBOX, NOTEBOX);
    let dev = 0; slots.forEach((sl) => { dev += circDiff(sl.th, sl.s.aMid); });
    const fit = dev + (132 - (c.ORB.rxg - RX)) * 0.2 + Math.abs(c.ORB.cx - 540) * 0.2;
    if (!best || v < best.v || (v === best.v && fit < best.fit)) best = { v, det, fit, ORB: c.ORB, slots };
  }
  if (process.env.DIAG) {
    console.log('top5:', cands.slice(0, 5).map((c) => `g${c.ORB.rxg - RX}/C${c.ORB.cx}/t${c.th0} v${c.v}`).join('  '));
  }
  return best;
}

const ORBIT = searchOrbit();
if (!ORBIT) throw new Error('orbit layout: no candidate');
console.log('orbit:', JSON.stringify(ORBIT.ORB), 'viol', ORBIT.v, JSON.stringify(ORBIT.det));
ORBIT.slots.forEach((sl) => {
  const ed = Math.hypot((sl.badgeC.x - ORBIT.ORB.cx) / ORBIT.ORB.rxg, (sl.badgeC.y - ORBIT.ORB.cy) / ORBIT.ORB.ryg);
  if (process.env.DIAG) console.log(`  ${sl.s.name.padEnd(20)} th=${sl.th.toFixed(1).padStart(6)} ed=${ed.toFixed(3)}`);
});

/* --- 引導線：橫平豎直（moneywise 式）：斜段出環 → 垂直段 → 水平段接徽章。
       逐標籤搜索路徑（短刺長度 × 車道橫移 × 接點高度），三重檢測：
       ① 不切進環體（下半圓計入側壁厚度）② 不穿其他標籤塊 ③ 不與已畫線重疊。
       全部候選失敗才退回純斜線。 --- */
const distPtSeg = (px0, py0, x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px0 - x1) * dx + (py0 - y1) * dy) / L2));
  return Math.hypot(px0 - (x1 + dx * t), py0 - (y1 + dy * t));
};
const drawnSegs = [];
const segPts = (x1, y1, x2, y2, cb) => {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 9));
  for (let k = 0; k <= n; k++) cb(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n);
};
const hitRing = (x, y) => {
  const ryE = (y > CY ? RY + DEPTH : RY) + 3;
  return ((x - CX) / (RX + 3)) ** 2 + ((y - CY) / ryE) ** 2 < 1;
};
const segClear = (x1, y1, x2, y2, slots, self, gap) => {
  let ok = true;
  segPts(x1, y1, x2, y2, (x, y) => {
    if (!ok) return;
    if (x < 14 || x > 1066 || y < 256 || y > 1222 || hitRing(x, y)) { ok = false; return; }
    for (const so of slots) {
      if (so === self) continue;
      const b = so.box;
      if (x > b.x0 - gap && x < b.x1 + gap && y > b.y0 - gap && y < b.y1 + gap) { ok = false; return; }
    }
    for (const b of [SHIPBOX, NOTEBOX]) {   // 星艦與副題行也是障礙
      if (x > b.x0 - gap && x < b.x1 + gap && y > b.y0 - gap && y < b.y1 + gap) { ok = false; return; }
    }
  });
  return ok;
};
const segFree = (x1, y1, x2, y2) => {
  const thr = Math.hypot(x2 - x1, y2 - y1) > 120 ? 18 : 3;   // 長線段要拉開走廊，避免兩條平行線像雙線
  for (const sg of drawnSegs) {
    let bad = false;
    segPts(x1, y1, x2, y2, (x, y) => { if (distPtSeg(x, y, sg[0], sg[1], sg[2], sg[3]) < thr) bad = true; });
    if (bad) return false;
  }
  return true;
};

function drawOrbitLabel(sl, slots) {
  const { s, badgeC, bsize, opt } = sl;
  // 錨點（真實扇區中點，下半圓移到側壁底）
  const t0 = rad(s.aMid);
  const ax = px(s.aMid, RX + 6);
  let ay = py(s.aMid, RY + 6);
  if (Math.sin(t0) > 0) ay += DEPTH;
  const nl = Math.hypot(RY * Math.cos(t0), RX * Math.sin(t0)) || 1;
  const nx = (RY * Math.cos(t0)) / nl, ny = (RX * Math.sin(t0)) / nl;
  const bs = s.badge ? bsize : 0;
  const m = metrics(s, opt);
  // 接點落在徽章「朝環那一側」的邊緣：mirror（文字在左、徽章在右）→ 從右側進
  const nearX = bs
    ? (opt.mirror ? badgeC.x + bs / 2 + 4 : badgeC.x - bs / 2 - 4)
    : (opt.mirror ? badgeC.x - 4 : badgeC.x + 4);
  const span = bs ? bs / 2 - 8 : m.blockH / 2 - 12;
  const kys = [];                       // 水平段接徽章的高度（優先 badge 正中）
  for (let d = 0; d <= span + 0.1; d += 6) {
    kys.push(badgeC.y - d);
    if (d > 0) kys.push(badgeC.y + d);
  }
  const STUBS = [20, 32, 46, 62, 80, 100, 124];
  const SHIFTS = [0, 14, -14, 28, -28, 44, -44, 62, -62, 84, -84, 110, -110, 140, -140, 175, -175, 210, -210, 250, -250, 300, -300, 340, -340, 380, -380, 420, -420];
  const inXY = (x, y) => x >= 16 && x <= 1064 && y >= 258 && y <= 1218;
  const trySegs = (raw) => {
    const segs = raw.filter((sg) => Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) > 1.5);
    if (!segs.length) return null;
    for (const sg of segs) {
      if (!segClear(sg[0], sg[1], sg[2], sg[3], slots, sl, 2) || !segFree(sg[0], sg[1], sg[2], sg[3])) return null;
    }
    return segs;
  };
  let plan = null;
  // L1（首選，與參考圖一致）：錨點垂直段 → 到標籤高度轉水平 → 進徽章。只有一個直角。
  outerL1:
  for (const Ky of kys) {
    const f = trySegs([[ax, ay, ax, Ky], [ax, Ky, nearX, Ky]]);
    if (f) { plan = f; break outerL1; }
  }
  // L2：錨點水平段 → 到徽章邊緣轉垂直 → 進徽章。同樣只有一個直角。
  if (!plan) outerL2:
  for (const Ky of kys) {
    const f = trySegs([[ax, ay, nearX, ay], [nearX, ay, nearX, Ky]]);
    if (f) { plan = f; break outerL2; }
  }
  // B：水平 → 垂直 → 水平（兩個直角，即參考圖裡「先橫出、再上下、再橫進」的走法）
  if (!plan) outerB:
  for (const sh of SHIFTS.slice().sort((p, q) => Math.abs(ax + p - nearX) - Math.abs(ax + q - nearX))) {
    const x1 = ax + sh;
    if (!inXY(x1, ay)) continue;
    for (const Ky of kys) {
      const f = trySegs([[ax, ay, x1, ay], [x1, ay, x1, Ky], [x1, Ky, nearX, Ky]]);
      if (f) { plan = f; break outerB; }
    }
  }
  // C：垂直 → 水平 → 垂直接徽章（全直角）
  if (!plan) outerC:
  for (const dv of [30, -30, 60, -60, 90, -90, 130, -130, 170, -170, 220, -220, 280, -280, 340, -340]) {
    const y1 = ay + dv;
    if (!inXY(ax, y1)) continue;
    for (const Ky of kys) {
      const f = trySegs([[ax, ay, ax, y1], [ax, y1, nearX, y1], [nearX, y1, nearX, Ky]]);
      if (f) { plan = f; break outerC; }
    }
  }
  // A（最後手段）：短斜段出環 → 橫移 → 垂直 → 水平
  if (!plan) outerA:
  for (const t of STUBS) {
    const Dx = ax + nx * t, Dy = ay + ny * t;
    if (!inXY(Dx, Dy)) continue;
    const orderA = SHIFTS.slice().sort((p, q) => Math.abs(Dx + p - nearX) - Math.abs(Dx + q - nearX));
    for (const sh of orderA) {
      const Ex = Dx + sh;
      if (!inXY(Ex, Dy)) continue;
      for (const Ky of kys) {
        const f = trySegs([[ax, ay, Dx, Dy], [Dx, Dy, Ex, Dy], [Ex, Dy, Ex, Ky], [Ex, Ky, nearX, Ky]]);
        if (f) { plan = f; break outerA; }
      }
    }
  }
  let pts;
  if (plan) {
    pts = [[ax, ay], ...plan.map((sg) => [sg[2], sg[3]])];
    plan.forEach((sg) => drawnSegs.push(sg));
  } else {
    // 後備：自適應徑向短刺 + 直線接徽章
    let K = null;
    for (const stub of [26, 38, 52, 68, 86, 106]) {
      const cand = [ax + nx * stub, ay + ny * stub];
      if (cand[0] > 16 && cand[0] < 1064 && cand[1] > 260 && !hitRing(cand[0], cand[1]) &&
          segClear(ax, ay, cand[0], cand[1], slots, sl, 2) &&
          segClear(cand[0], cand[1], badgeC.x, badgeC.y, slots, sl, 2)) { K = cand; break; }
    }
    if (!K) K = [ax + nx * 26, ay + ny * 26];
    const dl = Math.hypot(K[0] - badgeC.x, K[1] - badgeC.y) || 1;
    const P = [badgeC.x + (K[0] - badgeC.x) / dl * (bsize / 2 + 4), badgeC.y + (K[1] - badgeC.y) / dl * (bsize / 2 + 4)];
    pts = [[ax, ay], K, P];
    drawnSegs.push([ax, ay, K[0], K[1]], [K[0], K[1], P[0], P[1]]);
  }
  const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  a.push(`<polyline points="${poly}" fill="none" stroke="#9AA5B1" stroke-width="1.2"/>`);
  a.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.5" fill="#FFFFFF" stroke="${C.ink}" stroke-width="1.4"/>`);
  a.push(block(s, badgeC.x, badgeC.y, opt));
  return !!plan;
}
// 難度優先繪製：錨點→徽章距離越遠的標籤越容易無路可走，先讓它挑路徑
let fallbackCount = 0;
ORBIT.slots
  .slice()
  .sort((p, q) => Math.hypot(q.badgeC.x - px(q.s.aMid, RX + 6), q.badgeC.y - py(q.s.aMid, RY + 6)) -
                  Math.hypot(p.badgeC.x - px(p.s.aMid, RX + 6), p.badgeC.y - py(p.s.aMid, RY + 6)))
  .forEach((sl) => { if (!drawOrbitLabel(sl, ORBIT.slots)) fallbackCount++; });
if (fallbackCount) console.log('leader fallback:', fallbackCount);

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
