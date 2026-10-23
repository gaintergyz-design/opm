/**
 * Who Owns SpaceX? — 3D 立體空心環股權卡（淺底）
 *   v6.2（2026-10-22）：引擎抽到 scripts/lib/ownership_card.js，
 *   本檔只留 SpaceX 專屬素材：鋼灰漸層、X logo 金屬盤、星艦矢量、雙行名稱。
 *   用法：node scripts/build_ownership_spcx.js
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-spcx.json'), 'utf8'));

/* 星艦 Starship（底部矢量，灰色金屬） */
function starship(cx, baseY, h, ctx) {
  const { defs, uid } = ctx;
  const bw = h * 0.185;
  const noseH = h * 0.24;
  const bodyTop = baseY - h + noseH;
  const bodyBot = baseY - h * 0.05;
  const g = `sg${uid()}`;
  defs.push(`<linearGradient id="${g}" x1="${cx - bw / 2}" y1="0" x2="${cx + bw / 2}" y2="0" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#2A313B"/><stop offset="0.26" stop-color="#7C8695"/><stop offset="0.48" stop-color="#C7CFD9"/><stop offset="0.72" stop-color="#6E7887"/><stop offset="1" stop-color="#1F252E"/></linearGradient>`);
  const tileG = `st${uid()}`;
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

build({
  data: D,
  assetsDir: path.join(BASE, 'assets', 'spcx'),
  outBase: 'spcx',
  caption: "Who owns SpaceX? Musk 44.7% — and ~82% of the votes via Class B. Institutions hold 30.0% — top: Alphabet 4.1%, Valor Equity 3.4%, Founders Fund 3.2%, Fidelity 2.2%. Everyone else: 36.0%. 🧵",
  start: -106,
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  ramp: ['#0E131B', '#6F7A89', '#8A94A2', '#9DA7B4', '#AEB7C3', '#BDC5D0',
         '#C9D0D9', '#D3D9E1', '#DBE0E7', '#E2E6EC', '#E8EBF0'],
  hero: 'Elon Musk',
  heroRole: 'Founder · CEO',
  wordmark: { file: 'spacex-dark.png', w: 188, h: Math.round(188 * 41 / 332) },
  noteBox: { x0: 486, y0: 203, x1: 1018, y1: 248 },
  obstacles: [{ x0: 502, y0: 1012, x1: 578, y1: 1206 }],
  nameLines: {
    'Elon Musk': ['Elon', 'Musk'],
    'All Other|Institutions|& Public': ['All Other', '& Public'],
    'Fidelity (FMR)': ['Fidelity', '(FMR)'],
    'Founders Fund': ['Founders', 'Fund'],
    'Valor Equity': ['Valor', 'Equity'],
    'Vy Capital': ['Vy', 'Capital'],
    'Saudi PIF': ['Saudi', 'PIF'],
    'Baron Capital': ['Baron', 'Capital'],
    'Sequoia Capital': ['Sequoia', 'Capital'],
  },
  disc: {
    dx: 0, dy: 16, drx: 108, dry: 62, dd: 18,
    top: ['#FFFFFF', '#CBD3DD', '#8B96A4'],
    rim: ['#6E7887', '#A5AFBC', '#5A6472'],
    under: '#8C97A5', underOp: 0.5,
    hole: '#6F7A89', holeShade: -0.25,
    file: 'x-mark.png', imgW: 96, imgH: Math.round(96 * 246 / 630), imgDx: -2, imgDy: -2,
  },
  figure: { svg: (ctx) => starship(540, 1198, 178, ctx) },
});
