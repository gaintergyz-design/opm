/**
 * OPM 專題卡：Anthropic After the IPO — Ten Dates to Watch · 1080×1350
 *
 * 來源：阿澤提供的富途牛牛〈Anthropic 上市之後 哪些事件值得關注?〉時間線卡
 *       （製圖 2026-11-20），數據見 data/timeline-anthropic-ipo.json。
 * 三個維度照阿澤要求全部保留：時間（ET）／事件／影響維度。
 * 版式：白底 OPM 淺色系＋垂直時間軸（左日期 → 軸點 → 中事件 → 右影響），
 *       事件類別用軸點顏色編碼（橙=交易與解禁、青=指數納入、金=財報）＋面板標題右側小圖例。
 *       🔴 不套「標題下三欄 chips」路徑依賴；不加水印；右上 OPM 字標圖片。
 * 🔴 配色不參考原圖（原圖為富途深色底）：白底＋OPM 欽定橙金色系。
 * OPM 規格：1080×1350、全英文、右上 OPM 字標、統一頁尾聲明；富途字標／QR code 全部移除。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_anthropic_timeline.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_anthropic_timeline.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'timeline-anthropic-ipo.json'), 'utf8'));
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', panel: '#FFFFFF', edge: '#E4E7EC', trough: '#EEF1F5',
  ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC',
  orange: '#F1541E', orange2: '#FF8A1E', orangeDeep: '#D1400F',
  teal: '#00A98C', gold: '#FFB01C',
  goldText: '#854F0B',
};
const HANDLE = '@onepagemarket';
const CAT_COLOR = { trade: C.orange, index: C.teal, earnings: C.gold };

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
    a + (/[A-Z0-9$]/.test(ch) ? 0.66 : /[a-z]/.test(ch) ? 0.58 : ch === ' ' ? 0.30 : ch === '—' || ch === '–' ? 0.6 : 0.58), 0) * sz;
}
function fit(s, base, maxW) {
  const w = approx(s, base);
  return w <= maxW ? base : Math.max(13, Math.floor(base * (maxW - 6) / w));
}
/* 簡易英文換行（最多 maxLines 行） */
function wrap(s, sz, maxW, maxLines = 2) {
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const cand = cur ? cur + ' ' + wd : wd;
    if (approx(cand, sz) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = wd; if (lines.length === maxLines) break; }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  return lines;
}

const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);

/* ---- 背景（OPM 白底；不加斜紋水印）---- */
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標 ---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區：橙色大標＋深色副標 ---- */
svg.push(t(M, 128, D.headline, { size: fit(D.headline, 72, 900), weight: 700, fill: C.orange, ls: -2 }));
svg.push(t(M, 208, D.subhead, { size: 58, weight: 700, fill: C.ink, ls: -1.5 }));

/* ---- 時間線面板 ---- */
const P_Y = 252, P_B = 1210, P_H = P_B - P_Y;
svg.push(rrect(M, P_Y, CW, P_H, 18, C.panel, `stroke="${C.edge}" stroke-width="1.2"`));

/* 面板標題 + 右側類別圖例 */
svg.push(t(76, P_Y + 42, D.panel_title, { size: 21, weight: 700, fill: C.goldText, ls: 1.4 }));
{
  let lx = W - M - 36;
  for (let i = D.legend.length - 1; i >= 0; i--) {
    const g = D.legend[i];
    const tw = approx(g.label, 15);
    svg.push(t(lx, P_Y + 42, g.label, { size: 15, fill: C.gray, anchor: 'end' }));
    lx -= tw + 10;
    svg.push(`<circle cx="${lx}" cy="${P_Y + 36}" r="6" fill="${g.color}"/>`);
    lx -= 24;
  }
}
svg.push(`<line x1="76" y1="${P_Y + 62}" x2="${W - M - 36}" y2="${P_Y + 62}" stroke="${C.trough}" stroke-width="1.5"/>`);

/* 欄位幾何：日期 | 軸 | 事件 | 影響 */
const DATE_X = 76, RAIL_X = 300, EV_X = 326, EV_W = 366, IM_X = 716, IM_W = 292;
const ROWS_TOP = P_Y + 78, ROWS_BOT = P_B - 10;

/* 行高：帶 note 的行更高 */
const rowH = D.rows.map((r) => (r.note ? 104 : 86));
const totalH = rowH.reduce((a, b) => a + b, 0);
const slack = (ROWS_BOT - ROWS_TOP) - totalH;
const gap = slack / D.rows.length;   /* 行間留白均分 */

/* 垂直軸（貫穿首尾行圓心） */
let y = ROWS_TOP;
const centers = [];
D.rows.forEach((r, i) => { centers.push(y + rowH[i] / 2); y += rowH[i] + gap; });
svg.push(`<line x1="${RAIL_X}" y1="${centers[0]}" x2="${RAIL_X}" y2="${centers[centers.length - 1]}" stroke="${C.edge}" stroke-width="2.5"/>`);

y = ROWS_TOP;
D.rows.forEach((r, i) => {
  const cy = centers[i];
  const col = CAT_COLOR[r.cat] || C.orange;

  /* 行間分隔線 */
  if (i > 0) svg.push(`<line x1="76" y1="${(cy - rowH[i] / 2 - gap / 2).toFixed(1)}" x2="${W - M - 36}" y2="${(cy - rowH[i] / 2 - gap / 2).toFixed(1)}" stroke="${C.trough}" stroke-width="1"/>`);

  /* 日期（粗體深色）＋可選 tag（金棕小字） */
  svg.push(t(DATE_X, cy + (r.tag ? -2 : 8), r.date, { size: fit(r.date, 24, 190), weight: 700, fill: C.ink }));
  if (r.tag) svg.push(t(DATE_X, cy + 26, r.tag, { size: 15, weight: 600, fill: C.goldText }));

  /* 軸點：類別色實心圓＋白描邊 */
  svg.push(`<circle cx="${RAIL_X}" cy="${cy}" r="10" fill="${col}" stroke="#FFFFFF" stroke-width="3.5"/>`);
  svg.push(`<circle cx="${RAIL_X}" cy="${cy}" r="17" fill="none" stroke="${col}" stroke-width="1.5" opacity="0.35"/>`);

  /* 事件：主標 + 可選 note */
  const evSize = fit(r.event, 24, EV_W);
  svg.push(t(EV_X, cy + (r.note ? -2 : 8), r.event, { size: evSize, weight: 600, fill: C.ink }));
  if (r.note) svg.push(t(EV_X, cy + 26, r.note, { size: fit(r.note, 15.5, EV_W), fill: C.dim }));

  /* 影響維度：右欄灰字，最多兩行 */
  const imLines = wrap(r.impact, 17.5, IM_W, 2);
  const imLh = 23;
  const imY0 = cy - ((imLines.length - 1) * imLh) / 2 + 6;
  imLines.forEach((ln, k) => {
    svg.push(t(IM_X, imY0 + k * imLh, ln, { size: fit(ln, 17.5, IM_W), weight: 600, fill: C.gray }));
  });

  y += rowH[i] + gap;
});

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

/* 文案（X：疑問句開頭、簡短、活人感；單句 <=90、全文 <=280）*/
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
