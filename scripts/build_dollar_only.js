/**
 * OPM-專題卡：Only the dollar was up（2026-11-20 五大核心資產破位）· 1080×1350
 *
 * 來源：阿澤提供中文全景帳卡（富途牛牛），要求做成 OPM 格式：圖形化、注重價格變化、去掉原因分析列。
 * 版式：五行資產行卡（名稱｜關鍵價位｜詳情｜大字變化＋箭頭＋迷你走勢線），
 *       美元行青綠高亮＝唯一上漲。右上 assets/opm-logo.png、無手柄 pill、無水印、統一頁尾。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_dollar_only.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_dollar_only.js   # 寫 out/_preview/
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
  line: '#E4E7EC', panel: '#F8F9FB', panelLine: '#ECEDF1',
  down: '#F1541E', downInk: '#D1400F',        /* 跌：橙紅（亮色做面積、深版做文字） */
  up: '#00A98C', upInk: '#00786B',            /* 漲：teal */
  upPanel: '#F0FAF7', upPanelLine: '#C9E9DD',
};
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* ---- 數據（阿澤中文卡逐項翻譯，截至 2026-11-20）---- */
const ROWS = [
  {
    name: 'US stocks', tag: 'S&P 500 · Dow Jones', dir: 'down',
    level: 'S&P 7,175 · Dow 49,097',
    d1: 'S&P down six straight days', d2: 'Dow -1,101 points in one day',
    big: '-8.2%', bigLabel: 'S&P off its high',
  },
  {
    name: 'Gold', tag: 'spot, $/oz', dir: 'down',
    level: 'Broke $3,600/oz',
    d1: 'Touched $3,542-3,552', d2: 'Lowest in 14 months',
    big: '-30%+', bigLabel: 'from 2026 high',
  },
  {
    name: 'Silver', tag: 'spot, $/oz', dir: 'down',
    level: 'Slid with gold all week',
    d1: '', d2: '',
    big: '$42.22', bigLabel: 'and still sinking',
  },
  {
    name: 'Bitcoin', tag: 'BTC/USD', dir: 'down',
    level: 'Lost $62,000',
    d1: 'Touched $61,300-61,580', d2: '',
    big: '-20%+', bigLabel: 'in one month',
  },
  {
    name: 'US dollar', tag: 'the only winner', dir: 'up', highlight: true,
    level: '19-month high',
    d1: 'DXY 103.70-103.96', d2: '10Y Treasury yield back above 5%',
    big: '104', bigLabel: 'DXY pressing higher',
  },
];

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* 迷你走勢線：110×44 盒內的抖動下行/上行折線 */
function spark(x0, y0, dir, color) {
  const down = [[0, 7], [24, 15], [42, 11], [62, 26], [80, 24], [106, 38]];
  const up = down.map(([x, y]) => [x, 45 - y]);
  const pts = (dir === 'down' ? down : up).map(([x, y]) => `${x0 + x},${y0 + y}`).join(' ');
  const [ex, ey] = (dir === 'down' ? down : up)[5];
  const [sx, sy] = (dir === 'down' ? down : up)[0];
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${x0 + sx}" cy="${y0 + sy}" r="3.5" fill="#FFFFFF" stroke="${color}" stroke-width="2"/>` +
    `<circle cx="${x0 + ex}" cy="${y0 + ey}" r="4.5" fill="${color}" stroke="#FFFFFF" stroke-width="1.5"/>`;
}
/* 方向三角（畫在大數字左側） */
function arrow(cx, cy, dir, color, s = 11) {
  if (dir === 'down') {
    return `<polygon points="${cx - s},${cy - s * 0.7} ${cx + s},${cy - s * 0.7} ${cx},${cy + s * 0.9}" fill="${color}"/>`;
  }
  return `<polygon points="${cx - s},${cy + s * 0.7} ${cx + s},${cy + s * 0.7} ${cx},${cy - s * 0.9}" fill="${color}"/>`;
}

/* ---- 畫布 ---- */
const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 全產線禁用斜紋水印（2026-11-13 欽定） */

/* ---- 右上 OPM 字標（取代手柄 pill）---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區 ---- */
{
  svg.push(t(M, 148, 'Only the dollar was up', { size: 76, weight: 700, ls: -2 }));
  svg.push(t(M, 194, 'Stocks, gold, silver and bitcoin broke together as cash ran to the dollar',
    { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="220" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 五行資產行卡 ---- */
const RW = 984, RH = 168, RGAP = 14, RY0 = 252;
ROWS.forEach((r, i) => {
  const x0 = M, y0 = RY0 + i * (RH + RGAP);
  const fill = r.highlight ? C.upPanel : C.panel;
  const stroke = r.highlight ? C.upPanelLine : C.panelLine;
  svg.push(rrect(x0, y0, RW, RH, 20, fill, `stroke="${stroke}" stroke-width="1"`));

  /* 左：資產名 + 標籤 */
  svg.push(t(x0 + 28, y0 + 64, r.name, { size: 30, weight: 700 }));
  svg.push(t(x0 + 28, y0 + 94, r.tag, {
    size: 16, weight: r.highlight ? 700 : 400, fill: r.highlight ? C.upInk : C.gray,
  }));
  /* 分隔豎線 */
  svg.push(`<rect x="${x0 + 240}" y="${y0 + 32}" width="1" height="${RH - 64}" fill="${stroke}"/>`);

  /* 中：關鍵價位 + 詳情 */
  const mx = x0 + 272;
  svg.push(t(mx, y0 + 68, r.level, { size: 22, weight: 700 }));
  svg.push(t(mx, y0 + 102, r.d1, { size: 16, fill: C.gray }));
  if (r.d2) svg.push(t(mx, y0 + 128, r.d2, { size: 16, fill: C.gray }));

  /* 右：迷你走勢線 + 大字變化 + 箭頭 + 小標 */
  const bigColor = r.dir === 'down' ? C.downInk : C.upInk;
  const sparkColor = r.dir === 'down' ? C.down : C.up;
  svg.push(spark(x0 + RW - 320, y0 + RH / 2 - 22, r.dir, sparkColor));
  const bigRight = x0 + RW - 30;
  const bigY = y0 + 76;
  /* 箭頭放在大數字左側：先估字寬（MiSans 粗體約 0.58em/字元） */
  const bigW = r.big.length * 44 * 0.58;
  svg.push(arrow(bigRight - bigW - 34, bigY - 15, r.dir, bigColor, 11));
  svg.push(t(bigRight, bigY, r.big, { size: 44, weight: 700, fill: bigColor, anchor: 'end' }));
  svg.push(t(bigRight, y0 + 108, r.bigLabel, { size: 15, fill: C.gray, anchor: 'end' }));
});

/* ---- 收束句 ---- */
svg.push(t(M, RY0 + 5 * (RH + RGAP) + 34, 'Four assets broke. One bid.',
  { size: 19, weight: 700, fill: C.ink }));

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'Spot and index levels · as of Nov 20, 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'only-dollar-up-20261120';
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

/* gen-times（正式出圖才寫；PREVIEW 不動畫廊時間戳） */
if (!process.env.PREVIEW) {
  const genFile = path.join(BASE, 'out', 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}

/* 文案（X：疑問句開頭、簡短、活人感、≤280、結尾不加 One page ↓） */
const CAPTION =
  `Who's left standing when gold drops 30% off its high, BTC loses $62K and the S&P ` +
  `falls six straight days? The dollar \u2014 DXY pressing 104, a 19-month high.`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
