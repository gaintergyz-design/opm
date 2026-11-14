/**
 * OPM 專題卡：Founder stakes vs. control · 1080x1350
 *
 * 觸發：把「圖解財經／東方財富」〈三大創始人 CEO 持股對比〉(2026-11-13)
 *       重製為 OPM 格式；阿澤要求「頭像要大」。
 * 數據：人工核實後寫在 data/founder-stakes-20261114.json（禁止手改卡面文字）。
 * 版式：標題下不放三欄 chips（SKILL §5 路徑依賴紅線）；三個人物列，
 *       每列一顆 250px 直徑大頭像 + 右側餅狀環形圖（一個數字一環，中心寫百分比）。
 *       🔴 全英文、無斜紋水印、綠往藍偏／紅往橙偏／亮金亮橙。
 * 頭像：scripts/prepare_founder_avatars.py 從原圖裁出白底半身像，
 *       SVG 端用圓形 clipPath 直接融入白圓底，不做 alpha 去背。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_founder_stakes.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_founder_stakes.js  # → out/_preview/
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'founder-stakes-20261114.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#EDF0F4', soft: '#F6F7F9',
  gold: '#FFB01C', goldDeep: '#FF8A1E', goldInk: '#854F0B', goldBg: '#FAEEDA',
};
const ACC = {
  teal:   { solid: '#00A98C', soft: '#9FE3D7', ink: '#06705E', bg: '#E6F7F3' },
  orange: { solid: '#F1541E', soft: '#FBC1AC', ink: '#B63A0F', bg: '#FEEDE7' },
  gold:   { solid: '#FFB01C', soft: '#FFE0A3', ink: '#8A5A05', bg: '#FFF4DE' },
};

/* ---- 大頭像素材（白底 RGB；圓形裁切在 SVG 做）---- */
const AV = {};
for (const p of D.people) {
  const f = path.join(BASE, 'assets', 'founders', p.avatar + '.png');
  if (!fs.existsSync(f)) throw new Error('缺少頭像素材：' + f);
  const buf = fs.readFileSync(f);
  // PNG IHDR：寬高在 offset 16/20（big-endian）
  AV[p.avatar] = {
    uri: 'data:image/png;base64,' + buf.toString('base64'),
    w: buf.readUInt32BE(16), h: buf.readUInt32BE(20),
  };
}

/* ---- 版式常數 ---- */
const TOP = 326, ROW_H = 270, GAP = 16;
const CARD_X = M + 300;                 // 右側文字區起點
const BAR_W = W - M - CARD_X;           // 對比帶全寬（684）
const R = 125;                          // 頭像內圓半徑（直徑 250）
const CX = M + 140;                     // 頭像圓心 x

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/></linearGradient>`);
D.people.forEach((p, i) => {
  const cy = TOP + i * (ROW_H + GAP) + ROW_H / 2;
  defs.push(`<clipPath id="av${i}"><circle cx="${CX}" cy="${cy}" r="${R}"/></clipPath>`);
});
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 不加斜紋水印 */

/* ---- 手柄 pill ---- */
const handle = '@onepagemarket';
const pillW = 38 + 27 * 0.62 * handle.length;
svg.push(rrect(W - M - pillW, 56, pillW, 50, 12, C.goldBg));
svg.push(t(W - M - pillW / 2, 89, handle, { size: 27, weight: 500, fill: C.goldInk, anchor: 'middle' }));

/* ---- 標題（短標題放到 84px，空間還給字級）---- */
svg.push(t(M, 190, D.headline, { size: 84, weight: 700, ls: -2 }));
svg.push(t(M, 238, D.subtitle[0], { size: 25, fill: C.gray }));
svg.push(t(M, 272, D.subtitle[1], { size: 25, fill: C.gray }));
svg.push(`<rect x="${M}" y="300" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

/* ---- 三個人物列：大頭像 + 大數字 + 單條對比帶 ---- */
D.people.forEach((p, i) => {
  const y = TOP + i * (ROW_H + GAP);
  const cy = y + ROW_H / 2;
  const a = ACC[p.accent];

  /* 大頭像：淡色外環 + 白圓底 + 圓形裁切人像 */
  svg.push(`<circle cx="${CX}" cy="${cy}" r="${R + 5}" fill="${a.bg}"/>`);
  svg.push(`<circle cx="${CX}" cy="${cy}" r="${R}" fill="#FFFFFF"/>`);
  const im = AV[p.avatar];
  /* zoom 讓三張臉在圓內的視覺大小一致（黃仁勳原圖是半身，頭部佔比較小）*/
  const dispH = R * 2 * 1.04 * (p.zoom || 1);
  const dispW = dispH * im.w / im.h;
  /* 頭頂固定在圓內同一高度，放大時只往下裁掉較多的身體 */
  const ix = CX - dispW / 2, iy = cy - R + 20 - 0.04 * dispH;
  svg.push(`<g clip-path="url(#av${i})"><image x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" `
    + `width="${dispW.toFixed(1)}" height="${dispH.toFixed(1)}" `
    + `preserveAspectRatio="none" href="${im.uri}" image-rendering="optimizeQuality"/></g>`);

  /* 姓名 / 角色 */
  svg.push(t(CARD_X, y + 58, p.name, { size: 40, weight: 700, ls: -0.5 }));
  svg.push(t(CARD_X, y + 90, p.role, { size: 21, fill: C.gray }));

  /* 餅狀圖（環形）：一個數字一環，中心寫百分比、環下寫公司；環組在右側區置中 */
  const RING_D = 136, RING_SW = 16, RING_GAP = 20;
  const rr = (RING_D - RING_SW) / 2;
  const CIRC = 2 * Math.PI * rr;
  const groupW = p.charts.length * RING_D + (p.charts.length - 1) * RING_GAP;
  const startX = CARD_X + (BAR_W - groupW) / 2;
  const ringTop = y + 112;
  const rcy = ringTop + RING_D / 2;
  p.charts.forEach((c, ci) => {
    const cx = startX + ci * (RING_D + RING_GAP) + RING_D / 2;
    svg.push(`<circle cx="${cx.toFixed(1)}" cy="${rcy}" r="${rr}" fill="none" stroke="${C.track}" stroke-width="${RING_SW}"/>`);
    const dash = CIRC * c.value / 100;
    svg.push(`<circle cx="${cx.toFixed(1)}" cy="${rcy}" r="${rr}" fill="none" stroke="${a.solid}" stroke-width="${RING_SW}" `
      + `stroke-dasharray="${dash.toFixed(2)} ${CIRC.toFixed(2)}" transform="rotate(-90 ${cx.toFixed(1)} ${rcy})"/>`);
    svg.push(t(cx, rcy + 8, `${c.value.toFixed(1)}%`, { size: 30, weight: 700, fill: a.ink, anchor: 'middle', ls: -1 }));
    svg.push(t(cx, rcy + 30, c.metric, { size: 11, weight: 600, fill: C.gray, anchor: 'middle', ls: 0.4 }));
    svg.push(t(cx, ringTop + RING_D + 18, c.ticker, { size: 15, weight: 700, fill: C.ink, anchor: 'middle', ls: 0.8 }));
  });

  /* 列間極淡分隔線（不加高亮條） */
  if (i < D.people.length - 1) {
    svg.push(`<line x1="${M}" y1="${y + ROW_H + GAP / 2}" x2="${W - M}" `
      + `y2="${y + ROW_H + GAP / 2}" stroke="${C.line}" stroke-width="1"/>`);
  }
});

/* ---- 餅圖口徑（純文字一行，不另做色塊／帶狀模組）---- */
{
  const ly = TOP + D.people.length * ROW_H + (D.people.length - 1) * GAP + 38;
  svg.push(t(M, ly, 'Each ring = the founder\'s share  ·  Grey = everyone else  ·  Equity and votes shown side by side',
    { size: 15, fill: C.dim }));
}

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle, meta: D.as_of });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = D.stem;
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
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB, ${W}x${H} @2x)`);

/* gen-times（畫廊時間戳第一層；推送前另與遠端 union） */
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ 單句超過 90 字元：', line.length, line);
});
