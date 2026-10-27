/**
 * Who Owns Apple? — 3D 立體空心環股權卡（淺底 · 石墨色階）
 *   數據：13F Q2-2026（ADVFN 口徑，institutions 65.69% / insiders 0.06% / public 34.25%）
 *   引擎：scripts/lib/ownership_card.js
 *   用法：node scripts/build_ownership_aapl.js
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-aapl.json'), 'utf8'));

/* iPhone 主體（底部矢量）：金屬中框 + 深色屏幕 + 白色 Apple 標記 */
const LOGO_W = fs.readFileSync(path.join(BASE, 'assets', 'aapl', 'apple-logo-white.png')).toString('base64');

function iPhone(cx, baseY, h, ctx) {
  const { defs, uid } = ctx;
  const bw = Math.round(h * 0.46);
  const x0 = cx - bw / 2, x1 = cx + bw / 2, top = baseY - h;
  const r = Math.round(bw * 0.27);
  const gBody = `phB${uid()}`, gScr = `phS${uid()}`, gHi = `phH${uid()}`;
  defs.push(`<linearGradient id="${gBody}" x1="${x0}" y1="0" x2="${x1}" y2="0" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#6E7683"/><stop offset="0.10" stop-color="#C8D1DC"/>` +
    `<stop offset="0.34" stop-color="#EFF3F8"/><stop offset="0.62" stop-color="#AEB8C5"/>` +
    `<stop offset="0.88" stop-color="#7E8794"/><stop offset="1" stop-color="#565E6A"/></linearGradient>`);
  defs.push(`<linearGradient id="${gScr}" x1="0" y1="${top}" x2="0" y2="${baseY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#1B2330"/><stop offset="0.42" stop-color="#0A0E15"/><stop offset="1" stop-color="#141B26"/></linearGradient>`);
  defs.push(`<linearGradient id="${gHi}" x1="${x0}" y1="${top}" x2="${x1}" y2="${baseY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0.07"/></linearGradient>`);

  let s = '';
  s += `<ellipse cx="${cx}" cy="${baseY + 4}" rx="${bw * 1.18}" ry="7" fill="#7C93B4" opacity="0.16"/>`;
  // 側鍵
  s += `<rect x="${x1 - 1.8}" y="${top + h * 0.22}" width="2.8" height="${h * 0.085}" rx="1.4" fill="#8E97A4"/>`;
  s += `<rect x="${x0 - 1.0}" y="${top + h * 0.19}" width="2.8" height="${h * 0.055}" rx="1.4" fill="#7C8592"/>`;
  s += `<rect x="${x0 - 1.0}" y="${top + h * 0.255}" width="2.8" height="${h * 0.055}" rx="1.4" fill="#7C8592"/>`;
  // 中框
  s += `<rect x="${x0}" y="${top}" width="${bw}" height="${h}" rx="${r}" fill="url(#${gBody})"/>`;
  // 屏幕
  const ip = 8;
  s += `<rect x="${x0 + ip}" y="${top + ip}" width="${bw - ip * 2}" height="${h - ip * 2}" rx="${r - ip * 0.7}" fill="url(#${gScr})"/>`;
  // 屏幕內容：白色 Apple 標記
  const lw = Math.round(h * 0.245), lh = Math.round(lw * 300 / 244);
  s += `<image x="${(cx - lw / 2).toFixed(1)}" y="${(top + h * 0.50 - lh / 2).toFixed(1)}" width="${lw}" height="${lh}" opacity="0.92" href="data:image/png;base64,${LOGO_W}"/>`;
  // 靈動島
  s += `<rect x="${cx - bw * 0.14}" y="${top + h * 0.052}" width="${bw * 0.28}" height="${Math.max(7, h * 0.040)}" rx="${h * 0.020}" fill="#04060A"/>`;
  // 玻璃反光
  s += `<path d="M ${x0 + ip} ${top + h * 0.62} L ${x0 + ip} ${baseY - ip} L ${x0 + ip + bw * 0.42} ${baseY - ip} Z" fill="url(#${gHi})"/>`;
  s += `<rect x="${x0 + ip + 3.5}" y="${top + h * 0.17}" width="2" height="${h * 0.30}" rx="1" fill="#FFFFFF" opacity="0.14"/>`;
  return s;
}

build({
  data: D,
  assetsDir: path.join(BASE, 'assets', 'aapl'),
  outBase: 'aapl',
  start: -106,
  caption: "Insiders own 0.06% of Apple. Nobody controls it.\nInstitutions hold 65.7% — Vanguard 9.4%, BlackRock 8.0%, State Street 4.2%.\nBerkshire 1.6%. Full breakdown, one page ↓",
  relaxCost: { even: 0.45, mid: 1.2 },
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  wallShade: -0.30,
  hero: 'Berkshire Hathaway',
  heroRole: 'Warren Buffett',
  heroSize: { badge: 78, nfs: 24, pfs: 40 },
  noteSize: 20,
  palette: {
    bgTop: '#FFFFFF', bgMid: '#FAFAFC', bgBot: '#EFF1F4',
    glowA: ['#0071E3', 0.08], glowB: ['#86868B', 0.10],
    orbitStroke1: '#D6DAE0', orbitStroke2: '#E2E5EA',
    title2: ['#0B1220', '#7A828E'],
    handlePill: '#F5F5F7', handleInk: '#1D1D1F',
    lead: '#9AA5B1', anchorFill: '#FFFFFF',
  },
  wordmark: { file: 'apple-logo-black.png', w: 37, h: Math.round(37 * 600 / 488), y: 124 },
  obstacles: [{ x0: 488, y0: 1004, x1: 592, y1: 1212 }],
  // 左側標籤曾貼到 x=21（比 SPCX/META 的 40 更貼邊），收一點安全框；右側也比照收
  bounds: { x0: 38, x1: 1042, y0: 254, y1: 1220 },
  nameLines: {
    'Other Institutions': ['Other', 'Institutions'],
    'Public & Other': ['Public &', 'Other'],
    'Vanguard Group': ['Vanguard', 'Group'],
    'State Street': ['State', 'Street'],
    'Geode Capital': ['Geode', 'Capital'],
    'Fidelity (FMR)': ['Fidelity', '(FMR)'],
    'Berkshire Hathaway': ['Berkshire', 'Hathaway'],
    'Norges Bank': ['Norges', 'Bank'],
    'T. Rowe Price': ['T. Rowe', 'Price'],
  },
  disc: {
    dx: 0, dy: 15, drx: 112, dry: 65, dd: 18,
    top: ['#FFFFFF', '#E4E9EF', '#AEB9C6'],
    rim: ['#5F6B7A', '#C8D2DD', '#4E5A68'],
    under: '#4A5460', underOp: 0.42,
    hole: '#6B7683', holeShade: -0.30,
    file: 'apple-logo-black.png',
    imgW: 64, imgH: Math.round(64 * 600 / 488), imgDx: 1, imgDy: 0,
  },
  figure: { svg: (ctx) => iPhone(540, 1198, 190, ctx) },
});
