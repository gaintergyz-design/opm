/**
 * OPM 專題卡 ·「CUDA's moat is crumbling」甜甜圈餅圖 · 1080×1350
 *
 * 資料：data/cuda-moat-20261123.json（Major Frontier Lab announced compute agreements，
 *       announced capacity with deployment 2026 or later）
 * 版式：淺色底 · 大甜甜圈（片內大字 %）＋ 右側公司 logo 徽章圖例（GW / %）
 *       中心放總量 · 底部一句 takeaway · 右上角 OPM 標識 · 統一頁腳聲明。
 *
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_cuda_moat.js
 */
const fs = require('fs');
const path = require('path');
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

/* ---------------- logo（assets/logos/<TICK>.png，白底圓徽章） ---------------- */
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

/* ---------------- 共用骨架 ---------------- */
function start(ruleStops) {
  const a = [], defs = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
    <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">${ruleStops}</linearGradient>`);
  a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
  brandMark(a);
  return { a, defs };
}

function header(a, { kicker, title, subtitle }) {
  a.push(t(M, 76, kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
  const TS = 66, avail = CW - 104;
  a.push(t(M, 154, title, { size: fit(title, TS, avail), weight: 700, ls: -1.6 }));
  a.push(t(M, 198, subtitle, { size: fit(subtitle, 22, CW, 400), fill: C.gray }));
  a.push(rr(M, 218, CW, 6, 3, 'url(#ruleG)'));
}

function finish(a, defs, stem) {
  pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.meta, handle });
  a.push('</svg>');
  a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  const svgStr = a.join('\n');
  const outDir = path.join(BASE, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

  const sub = path.join(BASE, 'assets', 'fonts');
  const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
  const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
    .map((f) => [path.join(sub, f), path.join(full, f)].find((p) => fs.existsSync(p)))
    .filter(Boolean);
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
    background: C.bg,
  }).render().asPng();
  const out = path.join(outDir, `${stem}.png`);
  fs.writeFileSync(out, png);
  console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
}

/* ================= 卡片 ================= */
{
  const stops = `<stop offset="0" stop-color="#00A98C"/><stop offset="0.28" stop-color="#00A98C"/>
    <stop offset="0.28" stop-color="#F1541E"/><stop offset="0.51" stop-color="#F1541E"/>
    <stop offset="0.51" stop-color="#2B6FE8"/><stop offset="0.69" stop-color="#2B6FE8"/>
    <stop offset="0.69" stop-color="#FFB01C"/><stop offset="0.85" stop-color="#FFB01C"/>
    <stop offset="0.85" stop-color="#7C5CE0"/><stop offset="1" stop-color="#7C5CE0"/>`;
  const { a, defs } = start(stops);
  header(a, { kicker: D.kicker, title: D.title, subtitle: D.subtitle });

  /* --- 甜甜圈（左） --- */
  const DCX = 330, DCY = 665, R1 = 292, R0 = 176;
  const totalGW = D.vendors.reduce((s, v) => s + v.gw, 0);
  const GOLD_INK = '#5A3200';
  let ang = -Math.PI / 2;                       // 12 點鐘起，順時針，由大到小
  D.vendors.forEach((v) => {
    const sweep = TAU * v.gw / totalGW;
    const a0 = ang, a1 = ang + sweep;
    a.push(`<path d="${seg(DCX, DCY, R0, R1, a0 + 0.006, a1 - 0.006)}" fill="${v.color}"/>`);
    // 片內大字 %（Cerebras 2% 片太窄，不放）
    if (sweep > 0.16) {
      const mid = (a0 + a1) / 2, rm = (R0 + R1) / 2;
      const tx = DCX + rm * Math.cos(mid), ty = DCY + rm * Math.sin(mid);
      const inkin = v.key === 'amzn' ? GOLD_INK : '#FFFFFF';
      a.push(t(tx, ty + 14, `${v.pct}%`, { size: 44, weight: 700, fill: inkin, anchor: 'middle' }));
    }
    ang = a1;
  });
  a.push(`<circle cx="${DCX}" cy="${DCY}" r="${R0 - 3}" fill="#FFFFFF"/>`);

  /* --- 圖例（右）：logo 徽章 + 名稱 + GW + % --- */
  const LX = 690, RX = W - M, ROWH = 88;
  const LY0 = DCY - (D.vendors.length * ROWH) / 2 + 10;
  D.vendors.forEach((v, i) => {
    const cy = LY0 + ROWH * i + ROWH / 2;
    // logo 徽章（加大版，去色點）
    const uri = logoUri(v.ticker);
    if (uri) logoBadge(a, defs, LX + 34, cy, 32, uri);
    // 名稱 + GW
    a.push(t(LX + 80, cy - 6, v.name, { size: fit(v.name, 24, RX - (LX + 80) - 86), weight: 700 }));
    a.push(t(LX + 80, cy + 22, v.gw_disp, { size: 18, fill: C.gray }));
    // 右側 %
    a.push(t(RX, cy + 12, `${v.pct}%`, { size: 34, weight: 700, fill: v.ink, anchor: 'end' }));
    // 分隔線
    if (i < D.vendors.length - 1) a.push(`<line x1="${LX}" y1="${cy + ROWH / 2}" x2="${RX}" y2="${cy + ROWH / 2}" stroke="${C.line}" stroke-width="1"/>`);
  });

  /* --- 底部 takeaway --- */
  const TY = 1012, TH = 76;
  a.push(rr(M, TY, CW, TH, 16, '#F5F8FC', `stroke="#E7ECF3" stroke-width="1"`));
  a.push(rr(M, TY + 14, 6, TH - 28, 3, '#F1541E'));
  const pre = '72% of announced 2026+ frontier compute';
  const post = 'now goes to custom silicon & non-NVIDIA accelerators';
  const px = M + 26;
  a.push(t(px, TY + 33, pre, { size: 24, weight: 700, fill: '#C93C10' }));
  a.push(t(px, TY + 61, post, { size: 19, weight: 500, fill: C.body }));

  finish(a, defs, `cuda-moat-${D.stamp}`);
}
