/**
 * Who Owns Microsoft? — 3D 立體空心環股權卡（淺底 · 石墨色階 + 微軟藍強調）
 *   數據：13F Q2-2026（Yahoo Finance / StockVane / Stockrow 交叉核對）
 *         institutions 75.2% · 現任董監高 0.08% · Ballmer 4.4%（最大個人）· Gates 1.4%
 *   引擎：scripts/lib/ownership_card.js
 *   用法：node scripts/build_ownership_msft.js
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-msft.json'), 'utf8'));

/* Windows 四色方塊（底部矢量）：品牌主體，扁平 + 地面投影 + 玻璃反光 */
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

const PANES = [
  { c: '#F25022', col: 0, row: 0 },
  { c: '#7FBA00', col: 1, row: 0 },
  { c: '#00A4EF', col: 0, row: 1 },
  { c: '#FFB900', col: 1, row: 1 },
];

function windowsMark(cx, baseY, h, ctx) {
  const { defs, uid } = ctx;
  const gap = Math.round(h * 0.052);
  const sq = Math.round((h - gap) / 2);
  const total = sq * 2 + gap;
  const x0 = Math.round(cx - total / 2);
  const top = Math.round(baseY - total);
  const r = Math.round(sq * 0.055);

  let s = '';
  // 地面投影
  s += `<ellipse cx="${cx}" cy="${baseY + 6}" rx="${total * 0.60}" ry="8" fill="#7C93B4" opacity="0.18"/>`;
  s += `<ellipse cx="${cx}" cy="${baseY + 3}" rx="${total * 0.42}" ry="4.5" fill="#5C6E86" opacity="0.16"/>`;

  const clip = `wmC${uid()}`;
  const gloss = `wmG${uid()}`;
  const rects = PANES.map((p) => {
    const gid = `wmP${uid()}`;
    defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0.85" y2="1">` +
      `<stop offset="0" stop-color="${mixHex(p.c, '#FFFFFF', 0.26)}"/>` +
      `<stop offset="0.55" stop-color="${p.c}"/>` +
      `<stop offset="1" stop-color="${mixHex(p.c, '#000000', 0.12)}"/></linearGradient>`);
    const x = x0 + p.col * (sq + gap);
    const y = top + p.row * (sq + gap);
    return { x, y, gid };
  });
  defs.push(`<clipPath id="${clip}">` +
    rects.map((q) => `<rect x="${q.x}" y="${q.y}" width="${sq}" height="${sq}" rx="${r}"/>`).join('') +
    `</clipPath>`);
  defs.push(`<linearGradient id="${gloss}" x1="${x0}" y1="${top}" x2="${x0 + total * 0.7}" y2="${top + total}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"/>` +
    `<stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.04"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`);

  rects.forEach((q) => {
    s += `<rect x="${q.x}" y="${q.y}" width="${sq}" height="${sq}" rx="${r}" fill="url(#${q.gid})"/>`;
  });
  // 玻璃反光（裁在方塊內）
  s += `<g clip-path="url(#${clip})"><rect x="${x0}" y="${top}" width="${total}" height="${total}" fill="url(#${gloss})"/></g>`;
  return s;
}

/* 底部：兩種收尾方案（9 段標籤很滿，靠 MODE 切換試版）
   fig = Windows 四色方塊主體（家族慣例）；take = 一行 takeaway 文字（META 慣例） */
const MODE = 'take';   // 'take' = 底部一行 takeaway（定稿）；'fig' = 底部四色方塊主體
const TAKE_A = 'No controlling shareholder';
const TAKE_B = ' · Ballmer 4.4% is the largest individual stake';

function takeaway() {
  const fs_ = 20, W = 1080;
  // MiSans 平均字寬 ≈ 0.55em（英文 + 數字混合），用保守值避免出界
  const wA = TAKE_A.length * 0.56 * fs_, wB = TAKE_B.length * 0.56 * fs_;
  const x0 = W / 2 - (wA + wB) / 2;
  return `<text x="${x0.toFixed(1)}" y="1194" font-family="MiSans" font-size="${fs_}" font-weight="600" fill="#0B1220" letter-spacing="0.2">${TAKE_A}` +
    `<tspan font-weight="400" fill="#5C6675">${TAKE_B}</tspan></text>`;
}

const OPTS = {
  data: D,
  assetsDir: path.join(BASE, 'assets', 'msft'),
  outBase: 'msft',
  start: -80,
  caption: 'Who owns Microsoft? Institutions hold 75.2% — Vanguard 9.8%, BlackRock 8.2%, State Street 4.3%. Ballmer is the largest individual shareholder at 4.4%; Gates is down to 1.4% after his foundation exited in early 2026. 🧵',
  relaxCost: { even: 0.55, mid: 1.15 },
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  wallShade: -0.30,
  hero: 'Steve Ballmer',
  heroRole: 'Former CEO · 2000–2014',
  heroSize: { badge: 78, nfs: 24, pfs: 40 },
  noteSize: 20,
  palette: {
    bgTop: '#FFFFFF', bgMid: '#FAFBFC', bgBot: '#EDF0F4',
    glowA: ['#0078D4', 0.08], glowB: ['#5C6B7A', 0.10],
    orbitStroke1: '#D3D9E1', orbitStroke2: '#E0E5EB',
    title2: ['#0B1220', '#7A828E'],
    handlePill: '#E9F3FC', handleInk: '#0B4A82',
    lead: '#96A2B0', anchorFill: '#FFFFFF',
  },
  wordmark: { file: 'msft-mark.png', w: 44, h: 44, y: 126 },
  nameLines: {
    'Other Institutions': ['Other', 'Institutions'],
    'Public & Other': ['Public &', 'Other'],
    'Vanguard Group': ['Vanguard', 'Group'],
    'Steve Ballmer': ['Steve', 'Ballmer'],
    'State Street': ['State', 'Street'],
    'Geode Capital': ['Geode', 'Capital'],
    'Fidelity (FMR)': ['Fidelity', '(FMR)'],
    'Bill Gates': ['Bill', 'Gates'],
  },
  disc: {
    dx: 0, dy: 15, drx: 112, dry: 65, dd: 18,
    top: ['#FFFFFF', '#E4E9EF', '#AEB9C6'],
    rim: ['#5F6B7A', '#C8D2DD', '#4E5A68'],
    under: '#4A5460', underOp: 0.42,
    hole: '#6B7683', holeShade: -0.30,
    file: 'msft-mark.png',
    imgW: 74, imgH: 74, imgDx: 0, imgDy: 0,
  },
};

if (MODE === 'take') {
  OPTS.figure = { svg: () => takeaway() };
  OPTS.obstacles = [{ x0: 170, y0: 1164, x1: 910, y1: 1206 }];
} else {
  const FX = 470, FH = 118;
  OPTS.labelSize = { badge: 42, nfs: 21, pfs: 31 };
  OPTS.obstacles = [{ x0: FX - FH / 2 - 6, y0: 1204 - FH - 6, x1: FX + FH / 2 + 6, y1: 1216 }];
  OPTS.figure = { svg: (ctx) => windowsMark(FX, 1204, FH, ctx) };
}

build(OPTS);
