/**
 * OPM 專題卡影片版 ·「CUDA's moat is crumbling」動效 · 1080×1350 MP4
 *
 * 動效（2026-11-23 阿澤欽定）：
 *   1. 甜甜圈 6 個片段從 0 同步增長到各自份額位置，片內 % 數字從 0 同步跳到目標值；
 *   2. 右側 6 行公司圖例由上到下逐行淡入；
 *   3. 其餘元素（標題、副標、中心總量、takeaway、OPM 標識、頁腳）全程靜止。
 *
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_cuda_moat_video.js
 *   出幀 out/_video/f_####.png → ffmpeg 合成 out/cuda-moat-20261123.mp4（30fps，4s）
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'cuda-moat-20261123.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', body: '#3A4453',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

const FPS = 30, DUR = 4.0;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, op = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}
const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

function cw(s, size, weight = 400) {
  let w = 0;
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c >= 0x2E80 && c <= 0xFFEF) w += 100;
    else if (c >= 32 && c <= 126) w += textWidth(ch, 100, weight);
    else w += 60;
  }
  return w * size / 100;
}
const fit = (s, size, max, weight = 700) =>
  cw(s, size, weight) > max ? Math.floor(size * max / cw(s, size, weight)) : size;

/* ---------------- logo ---------------- */
function logoUri(tick) {
  const p = path.join(BASE, 'assets', 'logos', `${tick}.png`);
  return fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p).toString('base64')}` : null;
}
function logoBadge(a, defs, cx, cy, r, uri) {
  const id = `lg${cx.toFixed(0)}${cy.toFixed(0)}`;
  defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
  a.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.4"/>`);
  const inset = r * 0.36;
  a.push(`<g clip-path="url(#${id})"><image x="${cx - r + inset}" y="${cy - r + inset}" width="${(r - inset) * 2}" height="${(r - inset) * 2}" href="${uri}" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/></g>`);
}

/* ---------------- 甜甜圈片段 ---------------- */
const TAU = Math.PI * 2;
function seg(cx, cy, r0, r1, a0, a1) {
  const p = (r, ang) => `${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p(r1, a0)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}`,
    `L ${p(r0, a1)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}`,
    'Z',
  ].join(' ');
}

/* 動效曲線 */
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
/* 甜甜圈與圖例同時進行（2026-11-24 阿澤欽定：左右同時出現，不要一前一後）：
   甜甜圈 0 → 1.7s（含緩出）；圖例第 i 行 0s 起每行錯開 0.15s、淡入 0.4s */
const donutP = (ts) => easeOutCubic(clamp01(ts / 1.7));
const rowAlpha = (ts, i) => clamp01((ts - i * 0.15) / 0.4);

/* ---------------- 一幀 ---------------- */
function frame(ts) {
  const a = [], defs = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
    <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#00A98C"/><stop offset="0.28" stop-color="#00A98C"/>
    <stop offset="0.28" stop-color="#F1541E"/><stop offset="0.51" stop-color="#F1541E"/>
    <stop offset="0.51" stop-color="#2B6FE8"/><stop offset="0.69" stop-color="#2B6FE8"/>
    <stop offset="0.69" stop-color="#FFB01C"/><stop offset="0.85" stop-color="#FFB01C"/>
    <stop offset="0.85" stop-color="#7C5CE0"/><stop offset="1" stop-color="#7C5CE0"/></linearGradient>`);
  a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
  brandMark(a);

  /* header（靜止） */
  a.push(t(M, 76, D.kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
  const TS = 66, avail = CW - 104;
  a.push(t(M, 154, D.title, { size: fit(D.title, TS, avail), weight: 700, ls: -1.6 }));
  a.push(t(M, 198, D.subtitle, { size: fit(D.subtitle, 22, CW, 400), fill: C.gray }));
  a.push(rr(M, 218, CW, 6, 3, 'url(#ruleG)'));

  /* --- 甜甜圈（增長動畫） --- */
  const DCX = 330, DCY = 665, R1 = 292, R0 = 176;
  const totalGW = D.vendors.reduce((s, v) => s + v.gw, 0);
  const GOLD_INK = '#5A3200';
  const p = donutP(ts);
  let ang = -Math.PI / 2;
  D.vendors.forEach((v) => {
    const full = TAU * v.gw / totalGW;
    const sweep = full * p;
    if (sweep > 0.004) {
      const a0 = ang, a1 = ang + sweep;
      a.push(`<path d="${seg(DCX, DCY, R0, R1, a0 + 0.006, a1 - 0.006)}" fill="${v.color}"/>`);
      if (sweep > 0.16) {
        const mid = (a0 + a1) / 2, rm = (R0 + R1) / 2;
        const tx = DCX + rm * Math.cos(mid), ty = DCY + rm * Math.sin(mid);
        const inkin = v.key === 'amzn' ? GOLD_INK : '#FFFFFF';
        a.push(t(tx, ty + 14, `${Math.round(v.pct * p)}%`, { size: 44, weight: 700, fill: inkin, anchor: 'middle' }));
      }
    }
    ang += full;   // 每段的起始錨點不動，只長掃角
  });
  a.push(`<circle cx="${DCX}" cy="${DCY}" r="${R0 - 3}" fill="#FFFFFF"/>`);

  /* --- 圖例（逐行淡入） --- */
  const LX = 690, RX = W - M, ROWH = 88;
  const LY0 = DCY - (D.vendors.length * ROWH) / 2 + 10;
  D.vendors.forEach((v, i) => {
    const op = rowAlpha(ts, i);
    if (op <= 0) return;
    const cy = LY0 + ROWH * i + ROWH / 2;
    const g = [`<g opacity="${op.toFixed(3)}">`];
    const uri = logoUri(v.ticker);
    if (uri) {
      const tmp = [], d2 = [];
      logoBadge(tmp, d2, LX + 34, cy, 32, uri);
      d2.forEach((d) => defs.push(d));
      tmp.forEach((x) => g.push(x));
    }
    g.push(t(LX + 80, cy - 6, v.name, { size: fit(v.name, 24, RX - (LX + 80) - 86), weight: 700 }));
    g.push(t(LX + 80, cy + 22, v.gw_disp, { size: 18, fill: C.gray }));
    g.push(t(RX, cy + 12, `${v.pct}%`, { size: 34, weight: 700, fill: v.ink, anchor: 'end' }));
    if (i < D.vendors.length - 1) g.push(`<line x1="${LX}" y1="${cy + ROWH / 2}" x2="${RX}" y2="${cy + ROWH / 2}" stroke="${C.line}" stroke-width="1"/>`);
    g.push('</g>');
    a.push(g.join('\n'));
  });

  /* --- takeaway（靜止） --- */
  const TY = 1012, TH = 76;
  a.push(rr(M, TY, CW, TH, 16, '#F5F8FC', `stroke="#E7ECF3" stroke-width="1"`));
  a.push(rr(M, TY + 14, 6, TH - 28, 3, '#F1541E'));
  a.push(t(M + 26, TY + 33, '72% of announced 2026+ frontier compute', { size: 24, weight: 700, fill: '#C93C10' }));
  a.push(t(M + 26, TY + 61, 'now goes to custom silicon & non-NVIDIA accelerators', { size: 19, weight: 500, fill: C.body }));

  /* footer（靜止） */
  pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.meta, handle });

  a.push('</svg>');
  a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return a.join('\n');
}

/* ---------------- 主流程：出幀 + 合成 ---------------- */
const outDir = path.join(BASE, 'out', '_video');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const sub = path.join(BASE, 'assets', 'fonts');
const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => [path.join(sub, f), path.join(full, f)].find((p) => fs.existsSync(p)))
  .filter(Boolean);

const N = Math.round(DUR * FPS);
for (let i = 0; i < N; i++) {
  const ts = i / FPS;
  const svgStr = frame(ts);
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
    background: C.bg,
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `f_${String(i).padStart(4, '0')}.png`), png);
  if (i % 30 === 0) console.log(`frame ${i}/${N} (t=${ts.toFixed(2)}s)`);
}

const ffmpeg = require('ffmpeg-static');
const out = path.join(BASE, 'out', 'cuda-moat-20261123.mp4');
execFileSync(ffmpeg, [
  '-y', '-framerate', String(FPS),
  '-i', path.join(outDir, 'f_%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
  '-movflags', '+faststart',
  out,
], { stdio: 'inherit' });
console.log('MP4 ->', out, `(${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${DUR}s @ ${FPS}fps)`);
