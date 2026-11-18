/**
 * OPM-專題卡：Buffett's Q3 book（Berkshire Hathaway Q3 2026 13F）· 1080×1350
 *
 * 觸發：阿澤提供富途牛牛「伯克希爾Q3持倉揭曉」參考圖（2026-11-18），指定
 *   「做成 OPM 格式、巴菲特頭像要大、百分比後面用箭頭表示增持／減持」。
 *
 * 數據：SEC EDGAR 13F-HR 原始 infotable（非二手圖表）——
 *   Q3 2026  filing 0001193125-26-463399（2026-11-16，quarter ended 2026-09-30）
 *   Q2 2026  filing 0001193125-26-352200（2026-08-14，quarter ended 2026-06-30）
 *   按 CUSIP 聚合後：Q3 總市值 $304.197B（對得上參考圖 $3041.97億）、30 個部位。
 *   箭頭＝Q3 vs Q2 的「股數」變化（13F 口徑），非市值變化。
 *
 * 頭像：Wikimedia Commons「Warren Buffett at the 2015 SelectUSA Investment Summit」
 *   （Public domain），裁成 640×640 存 assets/founders/buffett.png。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_berkshire_q3.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_berkshire_q3.js
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
  line: '#E4E7EC', sep: '#F2F4F7',
  up: '#007A66', upFill: '#00A98C', upTint: '#F1FBF8',
  down: '#D1400F', downFill: '#F1541E', downTint: '#FEF3EE',
  cream: '#FBEFDD', amber: '#BA7517', flat: '#CFD6DF'
};

const uri = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, p)).toString('base64');
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);
const BUFFETT_URI = uri('assets/founders/buffett.png');
const URI_CACHE = {};

/* ---- 數據（SEC 13F 原始表，$B / 權重 % / Q3 股數變化 %）---- */
const TOTAL = 304.197, QOQ = 4.94, POSITIONS = 30;
const ROWS = [
  ['AAPL', 'Apple', 75.90, 24.95, 0],
  ['AXP', 'American Express', 46.10, 15.16, 0],
  ['KO', 'Coca-Cola', 34.43, 11.32, 0],
  ['GOOGL', 'Alphabet \u00b7 Class A', 27.11, 8.91, 0],
  ['BAC', 'Bank of America', 24.81, 8.16, -5.7],
  ['CVX', 'Chevron', 17.23, 5.66, 0],
  ['OXY', 'Occidental Petroleum', 14.66, 4.82, 0],
  ['MCO', "Moody's", 11.20, 3.68, 0],
  ['CB', 'Chubb', 11.14, 3.66, 0],
  ['GOOG', 'Alphabet \u00b7 Class C', 9.26, 3.05, 0],
];
const OTHER = ['OTHER', '20 smaller positions', 32.36, 10.63];

const CAPTION =
  'Did Buffett even move in Q3? Of his top 10, only Bank of America changed \u2014 trimmed 5.7%. ' +
  'New stake: Bending Spoons, $0.69B. Total book $304.2B. One page \u2193';

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$%]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.53 : 0.6), 0) * sz;

/* ---- 版面常量 ---- */
const LX = M, LW = 360;                          // 左欄（頭像 + 書本摘要）
const RX = M + LW + 32, RW = W - M - RX;         // 右欄（持倉表）
const ROW_H = 74, TABLE_TOP = 296;
const COL_VALUE = RX + RW - 236;                 // 市值右對齊
const COL_WEIGHT = RX + RW - 130;                // 權重右對齊
const COL_MOVE = RX + RW;                        // 箭頭 / 變化右對齊

function logo(defs, ticker, cx, cy, r, id) {
  const p = path.join(BASE, 'assets', 'logos', `${ticker}.png`);
  if (!fs.existsSync(p)) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#EDF0F4"/>` +
      t(cx, cy + r * 0.34, ticker.slice(0, 2), { size: r * 0.9, weight: 700, fill: C.gray, anchor: 'middle' });
  }
  const bw = (r - 3) * 2;
  if (!URI_CACHE[p]) URI_CACHE[p] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  defs.push(`<clipPath id="lg${id}"><circle cx="${cx}" cy="${cy}" r="${r - 1.5}"/></clipPath>`);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1"/>` +
    `<image x="${cx - bw / 2}" y="${cy - bw / 2}" width="${bw}" height="${bw}" href="${URI_CACHE[p]}"` +
    ` clip-path="url(#lg${id})" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/>`;
}

function moveMark(xRight, cy, pct) {
  if (!pct) {
    return `<rect x="${xRight - 108}" y="${cy - 2.5}" width="24" height="5" rx="2.5" fill="${C.flat}"/>`;
  }
  const up = pct > 0, fill = up ? C.upFill : C.downFill, ink = up ? C.up : C.down;
  const ax = xRight - 92, ay = cy - 1;
  const tri = up
    ? `${ax},${ay - 8} ${ax + 9},${ay + 6} ${ax - 9},${ay + 6}`
    : `${ax},${ay + 8} ${ax + 9},${ay - 6} ${ax - 9},${ay - 6}`;
  const label = `${up ? '+' : '\u2212'}${Math.abs(pct).toFixed(1)}%`;
  return `<polygon points="${tri}" fill="${fill}"/>` +
    t(xRight, cy + 6, label, { size: 18, weight: 700, fill: ink, anchor: 'end', ls: -0.3 });
}

function renderCard() {
  const defs = [];
  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
  svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

  /* 右上品牌標識 */
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="30" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);

  /* 標題 */
  const avail = W - M - lw - 40 - M;
  const TITLE = "Buffett's $304B book";
  const ts = Math.min(76, Math.floor(76 * avail / approx(TITLE, 76)));
  svg.push(t(M, 146, TITLE, { size: ts, weight: 700, ls: -2 }));
  svg.push(t(M, 190, 'Berkshire Hathaway 13F \u00b7 Q3 2026 \u00b7 all 30 positions', { size: 23, fill: C.gray }));
  svg.push(`<rect x="${M}" y="216" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

  /* ---------- 左欄：大頭像 ---------- */
  const cx = LX + LW / 2, pr = 176, cy = 474;
  defs.push(`<clipPath id="pf"><circle cx="${cx}" cy="${cy}" r="${pr}"/></clipPath>`);
  svg.push(`<circle cx="${cx + 18}" cy="${cy + 18}" r="${pr}" fill="${C.cream}"/>`);
  svg.push(`<image x="${cx - pr}" y="${cy - pr}" width="${pr * 2}" height="${pr * 2}" href="${BUFFETT_URI}" clip-path="url(#pf)" preserveAspectRatio="xMidYMid slice" image-rendering="optimizeQuality"/>`);
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${pr}" fill="none" stroke="#EBDCC0" stroke-width="1.5"/>`);

  svg.push(t(LX, 704, 'Warren Buffett', { size: 36, weight: 700, ls: -1 }));
  svg.push(t(LX, 734, 'Chairman & CEO \u00b7 Berkshire Hathaway', { size: 16, fill: C.gray }));
  svg.push(`<rect x="${LX}" y="758" width="${LW}" height="1" fill="${C.line}"/>`);

  svg.push(t(LX, 790, 'TOTAL 13F VALUE', { size: 12, weight: 700, fill: C.dim, ls: 1.4 }));
  svg.push(t(LX, 852, '$304.2B', { size: 60, weight: 700, ls: -2 }));
  svg.push(t(LX, 886, '30 positions', { size: 17, fill: C.gray }));
  svg.push(t(LX + LW, 886, '+$4.9B Q/Q', { size: 18, weight: 700, fill: C.up, anchor: 'end' }));

  /* 兩張動作卡 */
  /* Bending Spoons 是私人公司、官方標誌只有字標（無獨立圖標），用字標排版 */
  const BSP_BUF = fs.readFileSync(path.join(BASE, 'assets', 'logos', 'BSP-wordmark.png'));
  const BSP_URI = 'data:image/png;base64,' + BSP_BUF.toString('base64');
  const BSP_AR = BSP_BUF.readUInt32BE(16) / BSP_BUF.readUInt32BE(20);

  const cards = [
    { y: 924, tag: 'NEW STAKE', sub: '$0.69B \u00b7 0.23% of book',
      bg: C.upTint, bar: C.upFill, ink: C.up, wordmark: BSP_URI },
    { y: 1058, tag: 'BIGGEST CUT', head: 'Bank of America', sub: '\u22125.7% shares \u00b7 \u2212$2.7B value',
      bg: C.downTint, bar: C.downFill, ink: C.down, badge: { ticker: 'BAC' } }
  ];
  cards.forEach((c, ci) => {
    svg.push(rrect(LX, c.y, LW, 122, 16, c.bg));
    svg.push(rrect(LX + 18, c.y + 22, 4, 78, 2, c.bar));
    if (c.wordmark) {
      const wh = 26, ww = Math.round(wh * BSP_AR);
      svg.push(t(LX + 36, c.y + 34, c.tag, { size: 12, weight: 700, fill: c.ink, ls: 1.2 }));
      svg.push(`<image x="${LX + 36}" y="${c.y + 48}" width="${ww}" height="${wh}" href="${c.wordmark}" image-rendering="optimizeQuality"/>`);
      svg.push(t(LX + 36, c.y + 98, c.sub, { size: 15, fill: C.gray }));
    } else {
      /* 圓形徽章 */
      const bcx = LX + 62, bcy = c.y + 61, br = 23;
      svg.push(logo(defs, c.badge.ticker, bcx, bcy, br, 90 + ci));
      svg.push(t(LX + 98, c.y + 34, c.tag, { size: 12, weight: 700, fill: c.ink, ls: 1.2 }));
      svg.push(t(LX + 98, c.y + 68, c.head, { size: 22, weight: 700, ls: -0.4 }));
      svg.push(t(LX + 98, c.y + 96, c.sub, { size: 15, fill: C.gray }));
    }
  });

  /* ---------- 右欄：持倉表 ---------- */
  const HDRS = [
    ['POSITION', RX, 'start'],
    ['VALUE', COL_VALUE, 'end'],
    ['WEIGHT', COL_WEIGHT, 'end'],
    ['SHARES Q/Q', COL_MOVE, 'end']
  ];
  HDRS.forEach(([s, x, anchor]) => svg.push(t(x, 280, s, { size: 11, weight: 700, fill: C.dim, anchor, ls: 1.1 })));
  svg.push(`<rect x="${RX}" y="${TABLE_TOP - 4}" width="${RW}" height="1" fill="${C.line}"/>`);

  ROWS.concat([OTHER]).forEach((r, i) => {
    const [ticker, name, val, wt, chg] = r;
    const top = TABLE_TOP + i * ROW_H, mid = top + ROW_H / 2;
    const isOther = ticker === 'OTHER';
    if (isOther) svg.push(`<rect x="${RX}" y="${top}" width="${RW}" height="1" fill="${C.line}"/>`);

    if (isOther) {
      svg.push(`<circle cx="${RX + 19}" cy="${mid}" r="19" fill="#F2F4F7"/>` +
        t(RX + 19, mid + 5, '\u2026', { size: 20, weight: 700, fill: C.dim, anchor: 'middle' }));
    } else {
      svg.push(logo(defs, ticker, RX + 19, mid, 19, i));
    }
    svg.push(t(RX + 48, mid - 3, ticker, { size: isOther ? 18 : 23, weight: 700, fill: isOther ? C.gray : C.ink, ls: isOther ? 0.6 : -0.4 }));
    svg.push(t(RX + 48, mid + 20, name, { size: 14, fill: C.gray }));

    svg.push(t(COL_VALUE, mid + 8, `$${val.toFixed(1)}B`, { size: 23, weight: 700, anchor: 'end', ls: -0.5 }));
    svg.push(t(COL_WEIGHT, mid + 8, `${wt.toFixed(2)}%`, { size: 23, weight: 700, anchor: 'end', ls: -0.5, fill: isOther ? C.gray : C.ink }));
    svg.push(moveMark(COL_MOVE, mid, chg));
  });

  /* 表下註 */
  const noteY = TABLE_TOP + 11 * ROW_H + 36;
  svg.push(t(RX, noteY, 'Top 10 = 89.4% of the book \u00b7 9 of 10 held unchanged in Q3', { size: 14, fill: C.dim }));
  svg.push(t(RX, noteY + 24, 'Adds: Lennar +98.6%, Delta +12.4% \u00b7 Trims: Capital One \u221261.7%, VeriSign \u221234.1%', { size: 13, fill: C.dim }));

  pushFooter(t, svg, {
    M, W, H, C,
    meta: '13F-HR filed Nov 16, 2026 \u00b7 quarter ended Sep 30, 2026',
    handle: '@onepagemarket'
  });

  svg.push('</svg>');
  svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return svg.join('\n');
}

/* ---- 輸出 ---- */
const STEM = 'berkshire-q3-20261118';
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const svgStr = renderCard();
fs.writeFileSync(path.join(outDir, `${STEM}.svg`), svgStr);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg
}).render().asPng();
const outPng = path.join(outDir, `${STEM}.png`);
fs.writeFileSync(outPng, png);
console.log('PNG ->', outPng, `(${(png.length / 1024).toFixed(0)} KB)`);

if (!process.env.PREVIEW) {
  const genFile = path.join(outDir, 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${STEM}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}
fs.writeFileSync(path.join(outDir, `caption-${STEM}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length, '(limit 280)');
