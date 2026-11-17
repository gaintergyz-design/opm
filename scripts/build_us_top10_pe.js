/**
 * OPM-專題卡：US Top 10 by Forward P/E（橫向條形圖）· 1080×1350
 *
 * 觸發：阿澤提供「Magnificent 7 Ranked by Forward PE」meme 圖，
 *       重製為 OPM 格式＋橫向排列條形圖（2026-11-17）。
 * 數據：分析師一致預期 Forward P/E（2026-11-16/17 快照，多源交叉：
 *       GoodStockTrack / StockUpside / StockAnalysis / TGMCharts）。
 *       市值 Top10 美股（剔除台積電），內嵌於 DATA，禁止手改。
 *
 * 🔴 遵守：全英文、右上 assets/opm-logo.png、統一頁尾聲明、無斜紋水印、
 *   不做「標題 → 三欄 chips」路徑依賴、無高亮條堆砌、留白充足、字級放大。
 * 柱色＝個股主題色（阿澤欽定）。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_us_top10_pe.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_us_top10_pe.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7', nameGray: '#6B7684',
};

/* ---- 數據：市值 Top10 美股（excl. TSMC），Forward P/E 降冪 ---- */
const DATA = [
  { ticker: 'TSLA',  name: 'Tesla',             pe: 155.5, label: '156x', color: '#E82127' },
  { ticker: 'AAPL',  name: 'Apple',             pe: 30.3,  label: '30x',  color: '#8E8E93' },
  { ticker: 'LLY',   name: 'Eli Lilly',         pe: 28.5,  label: '29x',  color: '#ED1B2E' },
  { ticker: 'GOOGL', name: 'Alphabet',          pe: 28.4,  label: '28x',  color: '#34A853' },
  { ticker: 'AMZN',  name: 'Amazon',            pe: 27.4,  label: '27x',  color: '#FF9900' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway',pe: 26.0,  label: '26x',  color: '#0C2340' },
  { ticker: 'AVGO',  name: 'Broadcom',          pe: 23.2,  label: '23x',  color: '#CC092F' },
  { ticker: 'MSFT',  name: 'Microsoft',         pe: 21.5,  label: '22x',  color: '#00A4EF' },
  { ticker: 'NVDA',  name: 'Nvidia',            pe: 17.7,  label: '18x',  color: '#76B900' },
  { ticker: 'META',  name: 'Meta Platforms',    pe: 16.9,  label: '17x',  color: '#0866FF' },
];
const PE_MAX = DATA[0].pe;
const MEDIAN = 24.6;   // (23.2 + 26.0) / 2

/* 🔴 右上角品牌標識＝OPM 字標圖片（resvg 只認 data URI）*/
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

/* logo：先 logos.json，缺了讀 assets/logos/<ticker>.png 兜底 */
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));
function logoUri(ticker) {
  if (LOGOS[ticker]) return LOGOS[ticker];
  const f = path.join(BASE, 'assets', 'logos', `${ticker}.png`);
  if (fs.existsSync(f)) return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  return null;
}

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fitTitle = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 畫布 ---- */
const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區：只兩行，不加 chips ---- */
/* ---- 標題區：兩行大標（可折行）＋副標，不加 chips ---- */
const TITLE_L1 = 'The 10 biggest US stocks,';
const TITLE_L2 = 'ranked by price';
const TS = Math.min(fitTitle(TITLE_L1, 80, CW), fitTitle(TITLE_L2, 80, CW));
svg.push(t(M, 168, TITLE_L1, { size: TS, weight: 700, ls: -2 }));
svg.push(t(M, 238, TITLE_L2, { size: TS, weight: 700, ls: -2 }));
svg.push(t(M, 288, 'Forward P/E, analyst consensus · Nov 16–17, 2026',
  { size: 24, fill: C.gray }));

/* ---- 橫向條形圖 ---- */
const TOP = 336, ROW_H = 83, BAR_H = 32;
const LBL_X = M;                 // logo + ticker 區起點
const TRACK_X = 268, TRACK_W = 622;   // 軌道起點／滿格寬（156x）
const xEnd = (pe) => TRACK_X + (TRACK_W * pe) / PE_MAX;

/* median 參考線（畫在底層） */
{
  const mx = xEnd(MEDIAN);
  svg.push(`<line x1="${mx}" y1="${TOP - 14}" x2="${mx}" y2="${TOP + ROW_H * DATA.length + 10}" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="5 6"/>`);
  svg.push(t(mx, TOP - 24, 'median 25x', { size: 18, fill: C.dim, anchor: 'middle' }));
}

DATA.forEach((r, i) => {
  const cy = TOP + ROW_H * i + ROW_H / 2;

  /* logo 圓 */
  const R = 32, lx = LBL_X + 8 + R, lcy = cy;
  const uri = logoUri(r.ticker);
  if (uri) {
    const cid = `lg${i}`;
    defs.push(`<clipPath id="${cid}"><circle cx="${lx}" cy="${lcy}" r="${R}"/></clipPath>`);
    const ein = R * 2 * 0.94, eoff = (R * 2 - ein) / 2;
    svg.push(`<g clip-path="url(#${cid})"><image x="${lx - R + eoff}" y="${lcy - R + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
    svg.push(`<circle cx="${lx}" cy="${lcy}" r="${R}" fill="none" stroke="#DDE6EF" stroke-width="1.4"/>`);
  } else {
    svg.push(`<circle cx="${lx}" cy="${lcy}" r="${R}" fill="#E7EBF0"/>`);
    svg.push(t(lx, lcy + 8, r.ticker[0], { size: 24, weight: 700, fill: C.gray, anchor: 'middle' }));
  }

  /* ticker + 公司名 */
  const tx = lx + R + 16;
  svg.push(t(tx, cy - 6, r.ticker, { size: 25, weight: 700, fill: C.ink, ls: -0.5 }));
  svg.push(t(tx, cy + 18, r.name, { size: 15, fill: C.nameGray }));

  /* 軌道 + 色條 */
  const by = cy - BAR_H / 2;
  svg.push(rrect(TRACK_X, by, TRACK_W, BAR_H, BAR_H / 2, C.track));
  const bw = Math.max(BAR_H, (TRACK_W * r.pe) / PE_MAX);
  svg.push(rrect(TRACK_X, by, bw, BAR_H, BAR_H / 2, r.color));

  /* 端值大字 */
  svg.push(t(TRACK_X + bw + 18, cy + 10, r.label, { size: 31, weight: 700, fill: r.color }));
});

/* ---- 口徑註 ---- */
svg.push(t(M, 1216,
  'Universe: 10 largest US-listed companies by market cap (TSMC excluded).',
  { size: 15, fill: C.dim }));
svg.push(t(M, 1240,
  'Forward P/E = price / consensus forward EPS, Nov 16–17, 2026 snapshots.',
  { size: 15, fill: C.dim }));

/* ---- 頁尾（統一聲明）---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'US top 10 · forward estimates · Nov 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('\n')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'us-top10-pe-20261117';
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);

/* gen-times（畫廊時間戳第一層） */
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案（疑問句開頭、簡短、活人感、≤280） */
const CAPTION =
  `Why does the most expensive stock in America keep climbing?\n` +
  `Tesla trades at 156x forward earnings — 6x the group median. Meta is the cheapest of the top 10 at 17x.\n` +
  `One page ↓`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
