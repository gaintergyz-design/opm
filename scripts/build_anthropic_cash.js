/**
 * OPM 專題卡：Anthropic 現金儲備排行 · 1080×1350
 *
 * 來源：阿澤提供的富途牛牛〈Anthropic 坐擁 1320 億美元現金儲備〉卡，
 *       數據見 data/anthropic-cash-20261114.json（禁止手改卡面文字）。
 * 🔴 2026-11-14 阿澤：「參考中間內容區域的排版，還是用白色底」——
 *       只借排行榜那一塊的結構：列頭 → 七行（圓形 logo＋公司名／代碼＋比例橫條
 *       ＋末端標記＋右側金額）＋整行高亮；標題、右上字標、頁尾仍按 OPM 規則，
 *       不照抄原圖的深色底、富途字標、QR code 與長篇註釋。
 *       不套「標題下三欄 chips」路徑依賴，不加水印。
 * OPM 規格：全英文、$B 口徑、右上 assets/opm-logo.png、統一頁尾聲明。
 * 七個圓形 logo 由 scripts/prepare_cash_logos.py 從參考圖裁切去背（白圓＋透明外）。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_anthropic_cash.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_anthropic_cash.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'anthropic-cash-20261114.json'), 'utf8'));

/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* 七個圓形 logo（白圓透明 PNG，直接貼即可）*/
const CASH_LOGOS = {};
D.rows.forEach((r) => {
  const p = path.join(BASE, 'assets', 'cash-logos', `${r.logo}.png`);
  if (!CASH_LOGOS[r.logo]) {
    CASH_LOGOS[r.logo] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }
});

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', trough: '#EEF1F5',
  orange: '#F1541E', orangeDeep: '#D1400F',
  hiBg: '#FFF4E9', hiEdge: '#FFD9B8',
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
function approx(s, sz) {
  return [...String(s)].reduce((a, ch) =>
    a + (/[A-Z0-9]/.test(ch) ? 0.62 : /[a-z]/.test(ch) ? 0.52 : ch === ' ' ? 0.28 : 0.55), 0) * sz;
}
/* 字寬自適應：長字串自動縮級，永不溢出欄位 */
function fit(s, base, maxW) {
  const w = approx(s, base);
  return w <= maxW ? base : Math.max(14, Math.floor(base * (maxW - 6) / w));
}

const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
/* 一般行：柔和藍灰（對應原圖藍條的資訊層級，但走淺色系）*/
defs.push(`<linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#A9C1E8"/><stop offset="1" stop-color="#6E8FC9"/></linearGradient>`);
/* 高亮行：OPM 欽定橙金 */
defs.push(`<linearGradient id="barOrange" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#FFB01C"/><stop offset="1" stop-color="#F1541E"/></linearGradient>`);

/* ---- 背景（OPM 白底；不加斜紋水印、不加光帶）---- */
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區（疑問句開頭，呼應新文案規則；無三欄 chips）---- */
svg.push(t(M, 152, D.headline, { size: fit(D.headline, 72, CW), weight: 700, fill: C.orange, ls: -1.5 }));
svg.push(t(M, 232, D.subhead, { size: fit(D.subhead, 60, CW), weight: 700, fill: C.ink, ls: -1 }));

/* ---- 列頭 ---- */
svg.push(t(M, 322, D.col_left, { size: 19, weight: 600, fill: C.gray, ls: 1.2 }));
svg.push(t(W - M, 322, D.col_right, { size: 19, weight: 600, fill: C.gray, ls: 1.2, anchor: 'end' }));
svg.push(`<line x1="${M}" y1="342" x2="${W - M}" y2="342" stroke="${C.line}" stroke-width="1.2"/>`);

/* ---- 七行排行榜（參考圖中間內容區）---- */
const MAX = Math.max(...D.rows.map((r) => r.value));
const ROW_0 = 436, ROW_H = 100;
const LOGO_X = 104, LOGO_R = 32;
const NAME_X = 152, NAME_W = 205;
const BAR_X = 400, BAR_W = 456, BAR_H = 34;
const AMT_X = 1016;

D.rows.forEach((r, i) => {
  const cy = ROW_0 + i * ROW_H;
  const hi = !!r.highlight;

  /* 高亮整行底（先畫，壓在白底之上、其餘元素之下）*/
  if (hi) svg.push(rrect(M, cy - 44, CW, 88, 16, C.hiBg, `stroke="${C.hiEdge}" stroke-width="1.2"`));

  /* 統一白底圓形 badge（裁切圖本身的白圓會融進白卡，先墊一圈淡描邊讓 7 個一致）*/
  svg.push(`<circle cx="${LOGO_X}" cy="${cy}" r="34" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.2"/>`);
  svg.push(`<image x="${LOGO_X - LOGO_R}" y="${cy - LOGO_R}" width="${LOGO_R * 2}" height="${LOGO_R * 2}" href="${CASH_LOGOS[r.logo]}" image-rendering="optimizeQuality"/>`);

  /* 公司名（上）＋代碼（下）*/
  svg.push(t(NAME_X, cy - 3, r.name, { size: fit(r.name, 28, NAME_W), weight: 700, fill: hi ? C.orangeDeep : C.ink }));
  svg.push(t(NAME_X, cy + 26, r.ticker, { size: 18, fill: C.gray }));

  /* 底槽＋比例橫條＋末端白色標記 */
  svg.push(rrect(BAR_X, cy - BAR_H / 2, BAR_W, BAR_H, BAR_H / 2, C.trough));
  const bw = Math.max(38, BAR_W * (r.value / MAX));
  svg.push(rrect(BAR_X, cy - BAR_H / 2, bw, BAR_H, BAR_H / 2, hi ? 'url(#barOrange)' : 'url(#barBlue)'));
  svg.push(rrect(BAR_X + bw - 5, cy - BAR_H / 2 + 4, 3, BAR_H - 8, 1.5, '#FFFFFF', 'opacity="0.92"'));

  /* 右側金額 */
  svg.push(t(AMT_X, cy + 11, r.amount, { size: 32, weight: 700, fill: hi ? C.orange : C.ink, anchor: 'end' }));
});

/* ---- 口徑小字（頁尾免責區仍只放統一三段文字，不寫 Source）---- */
svg.push(t(M, 1120, D.note, { size: 17, fill: C.dim }));

/* ---- OPM 統一頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, meta: D.as_of, handle: HANDLE });

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

/* gen-times（畫廊時間戳第一層；推送前另與遠端 union）*/
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案：2026-11-14 新規則＝疑問句開頭、簡短、活人感、不說教；硬約束仍檢查 */
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
