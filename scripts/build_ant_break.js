/**
 * OPM 專題卡：Anthropic 上市破發 · 2026-11-24 走勢 · 1080×1350
 *
 * 阿澤 2026-11-25 欽定：標題中文（「Anthropic破发一度暴跌14%！创始人套现逾5.6亿美元，
 * 黄仁勋回归加剧AI路线之争。」），走勢圖旁放創始人 Dario 頭像。
 * 數據：data/ant-break-20261124.json（Yahoo 5m 收盤價，禁止手改卡面數字）。
 * 頭像：assets/founders/dario.jpg（Wikimedia Commons 實拍，方裁切）。
 * 走勢圖：盤中 5m 折線＋面積，前收 $87.64 與發行價 $83 兩條虛線，
 *         標注盤中最低 $75.61（-13.7%）與收盤 $81.90（-6.55%）。
 * 右欄：Dario 圓形頭像＋姓名＋兩塊數據（套現 >$5.6億／市值一度失守 $1T）。
 * OPM 規格：淺色底、右上 OPM 字標、統一頁尾聲明（lib/disclaimer）。
 * 配色走 OPM 欽定色板：跌＝橘紅 #F1541E，禁純綠／土黃。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_ant_break.js
 *       PREVIEW=1 NODE_PATH=./node_modules node scripts/build_ant_break.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ant-break-20261124.json'), 'utf8'));

const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

const ANT_LOGO_URI = 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'logos', 'ANT.png')).toString('base64');
const DARIO_URI = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BASE, 'assets', 'founders', 'dario.jpg')).toString('base64');

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', trough: '#EEF1F5',
  red: '#F1541E', redDeep: '#D1400F', redTint: '#FFF1E8',
  gold: '#FFB01C', goldInk: '#C35C06', goldDeep: '#5A3200',
};
const HANDLE = '@onepagemarket';

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, opacity = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
/* 字寬估算：CJK 全形 1em，ASCII 按比例 */
function approx(s, sz) {
  return [...String(s)].reduce((a, ch) => {
    if (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch)) return a + 1.0 * sz;
    if (/[A-Z0-9]/.test(ch)) return a + 0.62 * sz;
    if (/[a-z]/.test(ch)) return a + 0.52 * sz;
    if (ch === ' ') return a + 0.28 * sz;
    return a + 0.55 * sz;
  }, 0);
}
function fit(s, base, maxW) {
  const w = approx(s, base);
  return w <= maxW ? base : Math.max(14, Math.floor(base * (maxW - 6) / w));
}

const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

/* ---- 背景 ---- */
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#F1541E" stop-opacity="0.22"/>
  <stop offset="1" stop-color="#F1541E" stop-opacity="0.02"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 左上：ANT 圓形 logo 徽章＋公司名 ---- */
{
  const cy = 91, r = 34, cx = M + r;
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.2"/>`);
  svg.push(`<image x="${cx - r + 7}" y="${cy - r + 7}" width="${(r - 7) * 2}" height="${(r - 7) * 2}" href="${ANT_LOGO_URI}" image-rendering="optimizeQuality"/>`);
  svg.push(t(M + 84, 84, 'Anthropic', { size: 36, weight: 700, fill: C.ink }));
  svg.push(t(M + 84, 114, 'ANT · Nasdaq · Nov 24, 2026', { size: 19, fill: C.gray, ls: 0.5 }));
}

/* ---- 標題區（全英文；由阿澤中文欽定標題翻譯）---- */
const TITLE_L1 = 'Anthropic breaks IPO price, plunges 14%!';
const TITLE_L2 = 'Founders cash out over $560M next day';
const TITLE_L3 = 'Jensen Huang\u2019s return escalates AI route fight';
svg.push(t(M, 216, TITLE_L1, { size: fit(TITLE_L1, 58, CW), weight: 700, fill: C.red, ls: -1 }));
svg.push(t(M, 274, TITLE_L2, { size: fit(TITLE_L2, 38, CW), weight: 700, fill: C.ink, ls: -0.5 }));
svg.push(t(M, 324, TITLE_L3, { size: fit(TITLE_L3, 38, CW), weight: 700, fill: C.ink, ls: -0.5 }));

/* ---- 走勢圖（左）＋ 創始人欄（右）---- */
const CH = { x0: 116, x1: 742, y0: 470, y1: 980 };        // 繪圖區
const P = D.series;
const yMin = 74.5, yMax = 89.5;
const X = (i) => CH.x0 + (CH.x1 - CH.x0) * (i / (P.length - 1));
const Y = (v) => CH.y1 - (CH.y1 - CH.y0) * ((v - yMin) / (yMax - yMin));

svg.push(t(M, 432, 'Intraday move · 5-min', { size: 19, weight: 600, fill: C.gray, ls: 1 }));
svg.push(t(CH.x1, 432, 'USD', { size: 17, fill: C.dim, anchor: 'end' }));

/* 網格＋價格軸刻度 */
[75, 80, 85].forEach((v) => {
  svg.push(`<line x1="${CH.x0}" y1="${Y(v)}" x2="${CH.x1}" y2="${Y(v)}" stroke="${C.line}" stroke-width="1"/>`);
  svg.push(t(CH.x0 - 12, Y(v) + 5, '$' + v, { size: 15, fill: C.dim, anchor: 'end' }));
});

/* 前收虛線（灰）＋發行價虛線（橘）*/
svg.push(`<line x1="${CH.x0}" y1="${Y(D.prev_close)}" x2="${CH.x1}" y2="${Y(D.prev_close)}" stroke="${C.gray}" stroke-width="1.6" stroke-dasharray="7 6"/>`);
svg.push(t(CH.x0 + 8, Y(D.prev_close) - 8, 'Prev close $87.64', { size: 16, weight: 600, fill: C.gray }));
svg.push(`<line x1="${CH.x0}" y1="${Y(D.ipo_price)}" x2="${CH.x1}" y2="${Y(D.ipo_price)}" stroke="${C.goldInk}" stroke-width="1.6" stroke-dasharray="7 6"/>`);
svg.push(t(CH.x0 + 8, Y(D.ipo_price) - 8, 'IPO price $83', { size: 16, weight: 600, fill: C.goldInk }));

/* 面積＋折線 */
const linePts = P.map((p, i) => `${X(i).toFixed(1)},${Y(p.c).toFixed(1)}`).join(' ');
const areaPts = `${CH.x0},${CH.y1} ${linePts} ${CH.x1},${CH.y1}`;
svg.push(`<polygon points="${areaPts}" fill="url(#areaG)"/>`);
svg.push(`<polyline points="${linePts}" fill="none" stroke="${C.red}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`);

/* X 軸時間刻度 */
svg.push(`<line x1="${CH.x0}" y1="${CH.y1}" x2="${CH.x1}" y2="${CH.y1}" stroke="${C.line}" stroke-width="1.4"/>`);
const hourIdx = P.map((p, i) => [p.t, i]).filter(([tt]) => ['10:00', '12:00', '14:00', '16:00'].includes(tt));
hourIdx.forEach(([tt, i]) => {
  svg.push(`<line x1="${X(i)}" y1="${CH.y1}" x2="${X(i)}" y2="${CH.y1 + 6}" stroke="${C.line}" stroke-width="1.2"/>`);
  svg.push(t(X(i), CH.y1 + 28, tt, { size: 15, fill: C.dim, anchor: 'middle' }));
});

/* 盤中最低標注（氣泡置於谷上方，細線連到低點）*/
{
  const li = P.findIndex((p) => p.c === Math.min(...P.map((x) => x.c)));
  const lx = X(li), ly = Y(D.day_low);
  svg.push(`<circle cx="${lx}" cy="${ly}" r="7" fill="${C.redDeep}" stroke="#FFFFFF" stroke-width="2.5"/>`);
  const bx = lx - 92, by = ly - 210, bw = 184, bh2 = 66;
  svg.push(`<line x1="${lx}" y1="${by + bh2}" x2="${lx}" y2="${ly - 12}" stroke="${C.redDeep}" stroke-width="1.4"/>`);
  svg.push(rrect(bx, by, bw, bh2, 12, C.redTint, `stroke="#F8C6A8" stroke-width="1"`));
  svg.push(t(lx, by + 27, 'Intraday low $75.61', { size: 17, weight: 700, fill: C.redDeep, anchor: 'middle' }));
  svg.push(t(lx, by + 55, '-13.7%', { size: 20, weight: 700, fill: C.redDeep, anchor: 'middle' }));
}

/* 收盤標注（尾端右上方氣泡，避開發行價虛線與折線）*/
{
  const ei = P.length - 1;
  const ex = X(ei), ey = Y(P[ei].c);
  svg.push(`<circle cx="${ex}" cy="${ey}" r="7" fill="${C.red}" stroke="#FFFFFF" stroke-width="2.5"/>`);
  const bx = ex - 190, by = ey - 120, bw = 190, bh2 = 62;
  svg.push(rrect(bx, by, bw, bh2, 12, '#FFFFFF', `stroke="${C.line}" stroke-width="1.2"`));
  svg.push(t(bx + bw / 2, by + 25, 'Close $81.90', { size: 17, weight: 700, fill: C.ink, anchor: 'middle' }));
  svg.push(t(bx + bw / 2, by + 53, '-6.55%', { size: 20, weight: 700, fill: C.red, anchor: 'middle' }));
}

/* ---- 右欄：Dario 頭像＋身份＋數據 ---- */
{
  const PX = 778, PW = W - M - PX;             // 778..1032，寬 254
  const cx = PX + PW / 2, acy = 580, ar = 100;
  /* 頭像（圓形裁切＋描邊圈）*/
  defs.push(`<clipPath id="avClip"><circle cx="${cx}" cy="${acy}" r="${ar - 5}"/></clipPath>`);
  svg.push(`<circle cx="${cx}" cy="${acy}" r="${ar}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.5"/>`);
  svg.push(`<image x="${cx - ar + 5}" y="${acy - ar + 5}" width="${(ar - 5) * 2}" height="${(ar - 5) * 2}"
    preserveAspectRatio="xMidYMid slice" clip-path="url(#avClip)" href="${DARIO_URI}" image-rendering="optimizeQuality"/>`);

  svg.push(t(cx, acy + ar + 40, 'Dario Amodei', { size: 27, weight: 700, fill: C.ink, anchor: 'middle' }));
  svg.push(t(cx, acy + ar + 68, 'Anthropic co-founder · CEO', { size: 16, fill: C.gray, anchor: 'middle' }));

  /* 數據塊 1：套現 */
  const b1y = acy + ar + 100, bh = 118;
  svg.push(rrect(PX, b1y, PW, bh, 14, C.redTint, `stroke="#F8C6A8" stroke-width="1.2"`));
  svg.push(t(cx, b1y + 34, 'Sold next day after IPO', { size: 16, weight: 600, fill: C.gray, anchor: 'middle' }));
  svg.push(t(cx, b1y + 72, '>$560M', { size: 34, weight: 700, fill: C.redDeep, anchor: 'middle' }));
  svg.push(t(cx, b1y + 100, 'combined with sister Daniela', { size: 15, fill: C.gray, anchor: 'middle' }));

  /* 數據塊 2：市值 */
  const b2y = b1y + bh + 16, bh2 = 92;
  svg.push(rrect(PX, b2y, PW, bh2, 14, '#F4F6FA', `stroke="${C.line}" stroke-width="1.2"`));
  svg.push(t(cx, b2y + 32, 'Market cap briefly', { size: 16, weight: 600, fill: C.gray, anchor: 'middle' }));
  svg.push(t(cx, b2y + 70, 'fell below $1T', { size: 26, weight: 700, fill: C.ink, anchor: 'middle' }));
}

/* ---- 圖下小注 ---- */
svg.push(t(M, 1064, 'Jensen Huang is back as Nvidia CEO \u2014 pro open-model ecosystems,', { size: 19, fill: C.gray }));
svg.push(t(M, 1092, 'against new AI rules \u2014 at odds with Dario\u2019s closed-model stance.', { size: 19, fill: C.gray }));

/* ---- OPM 統一頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, meta: 'As of Nov 24, 2026 · ET', handle: HANDLE });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = D.stem;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

/* 中文卡：只用 ~/Library/Fonts 的完整版 MiSans（repo 內子集不含 CJK）*/
const LIB = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => path.join(LIB, f))
  .filter((p) => fs.existsSync(p));

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB, ${W}x${H} @2x)`);

/* gen-times（畫廊時間戳第一層）*/
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案：全英文（疑問句 hook、≤3 行、≤280、無 One page ↓）*/
const CAPTION = [
  'Anthropic below its $83 IPO price already? Low $75.61, closed $81.90 (-6.55%).',
  'Founders Dario & Daniela Amodei sold $560M+ the day after listing.',
  'And Jensen Huang \u2014 pro open models, anti new AI rules \u2014 is back running Nvidia.',
].join('\n');
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
