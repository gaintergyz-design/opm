/**
 * Who Owns Meta? — 3D 立體空心環股權卡（淺底 · Meta 藍為主）
 *   數據：13F Q2-2026 前八大機構 + Meta 2026 proxy（Zuckerberg Class B 投票權）
 *   引擎：scripts/lib/ownership_card.js（與 SpaceX 卡共用）
 *   用法：node scripts/build_ownership_meta.js
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');

/* 底部結論行（放標籤下方、頁腳上方，作為 takeaway 而非重複圖例） */
const TAKE = 'Institutions hold 67.8% in total · these 7 managers account for 29.1%';
const TAKE_Y = 1194, TAKE_FS = 20;
const TAKE_W = TAKE.length * 0.6 * TAKE_FS;
const TAKEBOX = { x0: 540 - TAKE_W / 2 - 8, y0: TAKE_Y - 26, x1: 540 + TAKE_W / 2 + 8, y1: TAKE_Y + 12 };

function takeawaySvg(ctx) {
  const { t } = ctx;
  return t(540, TAKE_Y, TAKE, { size: TAKE_FS, weight: 500, fill: '#5C6675', anchor: 'middle' }) +
         `<line x1="${(540 - TAKE_W / 2).toFixed(0)}" y1="${TAKE_Y + 18}" x2="${(540 + TAKE_W / 2).toFixed(0)}" y2="${TAKE_Y + 18}" stroke="#D8E2F0" stroke-width="1"/>`;
}
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-meta.json'), 'utf8'));

build({
  data: D,
  assetsDir: path.join(BASE, 'assets', 'meta'),
  outBase: 'meta',
  start: -106,
  relaxCost: { even: 0.35, mid: 1.2 },
  obstacles: [TAKEBOX],
  ring: { CX: 550, CY: 760, RX: 250, RY: 165, D: 50, IX: 117, IY: 67 },
  wallShade: -0.28,
  ramp: ['#0B3D91', '#1E5AC6', '#0866FF', '#4A8AE9', '#5F9EED', '#74B0F0', '#88BEF2', '#9BCBF5', '#ADD6F7', '#BFE0F9'],
  hero: 'Mark Zuckerberg',
  heroRole: 'Founder · CEO',
  heroSize: { badge: 78, nfs: 25, pfs: 40 },
  palette: {
    bgTop: '#FFFFFF', bgMid: '#F7FAFE', bgBot: '#E9F0FB',
    glowA: ['#0866FF', 0.11], glowB: ['#3F6FB5', 0.09],
    orbitStroke1: '#C6D8F2', orbitStroke2: '#D6E2F5',
    title2: ['#0B1220', '#0866FF'],
    handlePill: '#E7F0FF', handleInk: '#0B4BB8',
    lead: '#93A6C0', anchorFill: '#FFFFFF',
  },
  // 右上：Meta 無限環（藍）
  wordmark: { file: 'meta-mark-blue.png', w: 92, h: Math.round(92 * 254 / 377), y: 126 },
  nameLines: {
    'Other Institutions': ['Other', 'Institutions'],
    'Public & Other': ['Public &', 'Other'],
    'Mark Zuckerberg': ['Mark', 'Zuckerberg'],
    'Vanguard Group': ['Vanguard', 'Group'],
    'Capital Research': ['Capital', 'Research'],
    'State Street': ['State', 'Street'],
    'Fidelity (FMR)': ['Fidelity', '(FMR)'],
    'Geode Capital': ['Geode', 'Capital'],
    'T. Rowe Price': ['T. Rowe', 'Price'],
  },
  disc: {
    dx: 0, dy: 15, drx: 112, dry: 65, dd: 18,
    top: ['#FFFFFF', '#E2EBF6', '#A7BCD4'],
    rim: ['#5C7A9E', '#CBDBEC', '#4A6889'],
    under: '#3C5A7C', underOp: 0.45,
    hole: '#5A7799', holeShade: -0.30,
    file: 'meta-mark-blue.png',
    imgW: 116, imgH: Math.round(116 * 254 / 377), imgDx: 0, imgDy: 0,
  },
  figure: { svg: takeawaySvg },
});
