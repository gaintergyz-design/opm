/**
 * Who Owns NVIDIA? — 3D 立體空心環股權卡（淺底 · NVIDIA 綠色階）
 *   數據：13F Q2-2026（Yahoo Finance / Stockrow 交叉核對）
 *         institutions 71.4% · insiders 4.01%（含 Jensen Huang）· All Other 59.4%
 *   引擎：scripts/lib/ownership_card.js（正交引導線 + 同心橢圓軌道 + hero 照片徽章）
 *   用法：node scripts/build_ownership_nvda.js
 *
 * 2026-11-09 依新版式重出：hero = Jensen & Insiders（照片徽章）、
 *   機構用品牌色字母牌（meta 卡慣例：wordmark 在 46px 不可讀）。
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-nvda.json'), 'utf8'));

/* NVIDIA 綠階：深綠 → 淺黃綠（不含 hero 那格），順序照 JSON 分段次序 */
const RAMP = ['#3E6E08', '#52850C', '#649A12', '#76B900', '#89C224', '#9DCA40', '#B1D25C',
              '#C4DA78', '#D6E293', '#E5EAAC', '#EFF0C0'];
const HERO_GREEN = '#76B900';           // NVIDIA 品牌綠，只給 hero（Jensen & Insiders）
{
  let ri = 0;
  D.segments.forEach((s) => {
    if (s.hero) s.color = HERO_GREEN;
    else s.color = RAMP[Math.min(ri++, RAMP.length - 1)];
  });
}

/* 底部 takeaway（msft/meta 慣例：一行結論，非圖例重複） */
const TAKE_A = 'No controlling shareholder';
const TAKE_B = ' · the top 3 funds (Vanguard, BlackRock, Fidelity) hold 21.9%';

function takeaway() {
  const fs_ = 20, W = 1080;
  const wA = TAKE_A.length * 0.56 * fs_, wB = TAKE_B.length * 0.56 * fs_;
  const x0 = W / 2 - (wA + wB) / 2;
  return `<text x="${x0.toFixed(1)}" y="1194" font-family="MiSans" font-size="${fs_}" font-weight="600" fill="#0B1220" letter-spacing="0.2">${TAKE_A}` +
    `<tspan font-weight="400" fill="#5C6675">${TAKE_B}</tspan></text>`;
}
const TAKE_W = (TAKE_A.length + TAKE_B.length) * 0.56 * 20;
const TAKEBOX = { x0: 540 - TAKE_W / 2 - 8, y0: 1194 - 26, x1: 540 + TAKE_W / 2 + 8, y1: 1194 + 12 };

build({
  data: D,
  assetsDir: path.join(BASE, 'assets', 'nvda'),
  outBase: 'nvda',
  start: -106,
  caption: "Who actually owns NVIDIA? Vanguard + BlackRock hold ~17.7% combined — that's 4x all insiders (4.0%, Jensen included).\nThe other 59.4%? Just everyone else.\nNo single fund controls it.",
  relaxCost: { even: 0.3, mid: 1.2 },
  labelSize: { badge: 40, nfs: 20, pfs: 30 },
  orbit: { g0: 165, g1: 125, c0: 620, c1: 460 },
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  wallShade: -0.30,
  hero: 'Jensen & Insiders',
  heroRole: 'Co-founder · CEO',
  heroSize: { badge: 78, nfs: 25, pfs: 40 },
  noteSize: 20,
  palette: {
    bgTop: '#FFFFFF', bgMid: '#F8FCF4', bgBot: '#EAF3DC',
    glowA: ['#76B900', 0.10], glowB: ['#4E7B2B', 0.09],
    orbitStroke1: '#CFE0B4', orbitStroke2: '#DDEAC6',
    title2: ['#0B1220', '#76B900'],
    handlePill: '#FAEEDA', handleInk: '#854F0B',
    lead: '#9CAE8A', anchorFill: '#FFFFFF',
  },
  wordmark: { file: 'nvda-mark.png', w: 60, h: 60, y: 126 },
  nameLines: {
    'All Other|Institutions|& Public': ['All Other', 'Institutions', '& Public'],
    'Jensen & Insiders': ['Jensen &', 'Insiders'],
    'Fidelity (FMR)': ['Fidelity', '(FMR)'],
    'JPMorgan Chase': ['JPMorgan', 'Chase'],
    'Capital Group': ['Capital', 'Group'],
    'T. Rowe Price': ['T. Rowe', 'Price'],
    'Other Managers': ['Other', 'Managers'],
  },
  disc: {
    dx: 0, dy: 15, drx: 112, dry: 65, dd: 18,
    top: ['#FFFFFF', '#E6EFE0', '#B4C7AB'],
    rim: ['#5F7A56', '#C9DCC0', '#4E6A46'],
    under: '#48613F', underOp: 0.42,
    hole: '#66805C', holeShade: -0.30,
    file: 'nvda-mark.png',
    imgW: 64, imgH: 64, imgDx: 0, imgDy: 0,
  },
  figure: { svg: () => takeaway() },
  obstacles: [TAKEBOX],
});
