/**
 * Who Owns Tesla? — 3D 立體空心環股權卡（淺底 · 特斯拉紅色階）
 *   數據：13F Q2-2026（Yahoo / SEC 交叉核對）institutions 43.69%
 *         Musk 19.9%（SEC 13G 修訂版 2026-06-16：717,112,739 股 beneficial ownership，
 *         含 2018 期權獎勵行權股；2025 Performance Award 受 Voting Agreement 未計入）
 *   引擎：scripts/lib/ownership_card.js
 *   用法：node scripts/build_ownership_tsla.js
 *
 * 2026-10-26 阿澤：TSLA 卡。版式沿用 MSFT 定稿（take 模式底部一行 takeaway）。
 *   顏色只留一個來源 = 本檔的 RAMP；hero（Musk）另釘品牌紅 E31937 做亮點。
 */
const fs = require('fs');
const path = require('path');
const build = require('./lib/ownership_card');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ownership-tsla.json'), 'utf8'));

/* 特斯拉紅階：深酒紅 → 淺粉，steps 由大到小（不含 hero 那格） */
const RAMP = ['#7F1D2B', '#96182B', '#AC1A2E', '#C22738', '#D14A55', '#DE737B', '#EAA2A8'];
const HERO_RED = '#E31937';           // 特斯拉品牌紅，只給 Musk 那格當亮點
{
  let ri = 0;
  D.segments.forEach((s) => {
    s.color = s.hero ? HERO_RED : RAMP[Math.min(ri++, RAMP.length - 1)];
  });
}

const TAKE_A = 'Founder-heavy register';
const TAKE_B = ' · Musk 19.9% vs institutions 43.7%';

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
  assetsDir: path.join(BASE, 'assets', 'tsla'),
  outBase: 'tsla',
  start: -80,
  caption: 'Who owns Tesla? Elon Musk holds 19.9% per his June 13G — the largest individual stake. Institutions hold 43.7%: Vanguard 5.9%, BlackRock 5.4%, State Street 3.0%. Nearly 40% sits with retail and other holders. 🧵',
  relaxCost: { even: 0.55, mid: 1.15 },
  ring: { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
  wallShade: -0.30,
  hero: 'Elon Musk',
  heroRole: 'CEO · Co-founder',
  heroSize: { badge: 78, nfs: 24, pfs: 40 },
  noteSize: 20,
  palette: {
    bgTop: '#FFFFFF', bgMid: '#FBF4F5', bgBot: '#F5E4E6',
    glowA: ['#E31937', 0.08], glowB: ['#8C1D2C', 0.07],
    orbitStroke1: '#E8CCD1', orbitStroke2: '#F0DDE0',
    title2: ['#0B1220', '#E31937'],
    handlePill: '#FBE7EA', handleInk: '#8C1D2C',
    lead: '#C29AA1', anchorFill: '#FFFFFF',
  },
  wordmark: { file: 'tsla-mark.png', w: 40, h: 40, y: 126 },
  nameLines: {
    'Elon Musk': ['Elon', 'Musk'],
    'Other Institutions': ['Other', 'Institutions'],
    'Public & Other': ['Public &', 'Other'],
    'Vanguard Group': ['Vanguard', 'Group'],
    'State Street': ['State', 'Street'],
    'Geode Capital': ['Geode', 'Capital'],
  },
  disc: {
    dx: 0, dy: 15, drx: 112, dry: 65, dd: 18,
    top: ['#FFFFFF', '#EAE4E5', '#BDB0B2'],
    rim: ['#705A5E', '#AC9A9D', '#5E4C4F'],
    under: '#504549', underOp: 0.42,
    hole: '#6E5F62', holeShade: -0.30,
    file: 'tsla-mark.png',
    imgW: 62, imgH: 62, imgDx: 0, imgDy: 0,
  },
};

OPTS.figure = { svg: () => takeaway() };
OPTS.obstacles = [{ x0: 170, y0: 1164, x1: 910, y1: 1206 }];

build(OPTS);
