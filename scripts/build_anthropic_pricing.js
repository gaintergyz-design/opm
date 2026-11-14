/**
 * OPM 專題卡：Anthropic IPO — Pricing Revealed · 1080×1350
 *
 * 來源：阿澤提供的富途牛牛〈Anthropic IPO 定價曝光〉卡（製圖 2026-11-11），
 *       數據見 data/anthropic-pricing-20261114.json（禁止手改卡面文字）。
 * 🔴 版式「完全參考」原圖（2026-11-14 阿澤）：由上到下的模組順序與視覺結構照抄 —
 *       大標 → 四格 IPO 數字面板 → 亮金認購緞帶壓在排名面板上沿
 *       → 七條橫向 bar（圓形 logo＋公司名＋金額）→ 四格算力帳單面板 → 統一頁尾。
 *       不套 OPM scaffold 的「標題下三欄 chips」路徑依賴，不加水印。
 * 第三輪（2026-11-14 阿澤）：右上 @onepagemarket pill 換成 assets/opm-logo.png；
 *       刪右側兩行小字與左下品牌行，騰出的空間加大上下間距、放大 7 家公司 logo。
 * 🔴 配色不參考原圖（2026-11-14 阿澤：「我說的是排版，顏色不要參考，還是做成白底」）：
 *       白底＋白色面板／OPM 欽定橙金色系（#FF8A1E / #FFB01C / #F1541E），
 *       文字用同色系深版 ink 保對比、亮金底配深棕字；移除原圖的深色底與橙色背景光帶。
 * OPM 規格：1080×1350、全英文、$B/$T 口徑、右上 OPM 字標、統一頁尾聲明。
 *       原圖的富途牛牛字標／QR code 全部移除；頁尾右下 handle 依統一頁尾保留。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_anthropic_pricing.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_anthropic_pricing.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'anthropic-pricing-20261114.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', panel: '#FFFFFF', edge: '#E4E7EC', trough: '#EEF1F5',
  logoBg: '#F1F3F6',
  ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC',
  orange: '#F1541E', orange2: '#FF8A1E', orangeDeep: '#D1400F',
  gold: '#854F0B', goldBg: '#FAEEDA', goldInk: '#4A2B05',
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
    a + (/[A-Z0-9$]/.test(ch) ? 0.62 : /[a-z]/.test(ch) ? 0.52 : ch === ' ' ? 0.28 : 0.55), 0) * sz;
}
/* 字寬自適應：長數字自動縮級，永不溢出欄位 */
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
defs.push(`<linearGradient id="barG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.orange2}"/><stop offset="1" stop-color="${C.orangeDeep}"/></linearGradient>`);
defs.push(`<linearGradient id="bannerG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#FFB01C"/><stop offset="1" stop-color="#FF8A1E"/></linearGradient>`);

/* ---- 背景（OPM 白底；🔴 不加斜紋水印、不加原圖的橙色背景光帶）---- */
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

/* ---- 右上 OPM 字標（取代 @onepagemarket 手柄 pill）---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區：橙色大標＋深色副標（🔴 不放右側小字）---- */
svg.push(t(M, 136, D.headline, { size: 78, weight: 700, fill: C.orange, ls: -2 }));
svg.push(t(M, 222, D.subhead, { size: 68, weight: 700, fill: C.ink, ls: -2 }));

/* ---- 四格 IPO 數字面板底色（先畫，讓 Claude 徽章浮在面板之上）---- */
const KPI_Y = 300, KPI_H = 190;
svg.push(rrect(M, KPI_Y, CW, KPI_H, 18, C.panel, `stroke="${C.edge}" stroke-width="1.2"`));

/* ---- 右上 Claude 徽章（純 SVG，壓在 KPI 面板上沿，對應原圖 3D 方塊）---- */
{
  const gx = 866, gy = 190;
  const inner = [];
  inner.push(rrect(8, 12, 156, 156, 34, '#0B1220', 'opacity="0.10"'));
  inner.push(rrect(0, 0, 156, 156, 34, '#FFFFFF', `stroke="${C.edge}" stroke-width="1.5"`));
  const cx = 78, cy = 64;
  for (let k = 0; k < 16; k++) {
    const a = (k * 22.5 - 90) * Math.PI / 180;
    const r1 = 13, r2 = k % 2 === 0 ? 40 : 33;
    inner.push(`<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="#E1541A" stroke-width="7" stroke-linecap="round"/>`);
  }
  inner.push(t(cx, 134, 'Claude', { size: 26, weight: 600, fill: '#1B1714', anchor: 'middle' }));
  svg.push(`<g transform="translate(${gx},${gy}) rotate(-9 78 78)">${inner.join('')}</g>`);
}

/* ---- 四格 IPO 數字面板文字 ---- */
svg.push(t(76, 340, D.kpi_title, { size: 22, weight: 700, fill: C.gold, ls: 1.4 }));
{
  const colX = [76, 306, 522, 738];
  const colW = [218, 204, 204, 294];
  [294, 510, 726].forEach((x) => {
    svg.push(`<line x1="${x}" y1="364" x2="${x}" y2="470" stroke="${C.edge}" stroke-width="1"/>`);
  });
  D.kpis.forEach((k, i) => {
    svg.push(t(colX[i], 392, k.label, { size: fit(k.label, 18, colW[i]), fill: C.gray }));
    svg.push(t(colX[i], 452, k.value, { size: fit(k.value, 34, colW[i]), weight: 700, fill: C.ink, ls: -0.5 }));
  });
}

/* ---- 七條橫向 bar 面板（先畫面板，緞帶再壓上去）---- */
const RANK_Y = 508, RANK_H = 492;
svg.push(rrect(M, RANK_Y, CW, RANK_H, 18, C.panel, `stroke="${C.edge}" stroke-width="1.2"`));
{
  const BAR_X = 276, BAR_W = 584, BAR_H = 30, MAX = 10, ROW_H = 64, ROW_0 = 580;
  let uid = 0;
  D.bars.forEach((r, i) => {
    const cy = ROW_0 + i * ROW_H;
    /* 底槽 + 實際長度 */
    svg.push(rrect(BAR_X, cy - BAR_H / 2, BAR_W, BAR_H, BAR_H / 2, C.trough));
    const bw = Math.max(28, BAR_W * (r.value / MAX));
    svg.push(rrect(BAR_X, cy - BAR_H / 2, bw, BAR_H, BAR_H / 2, 'url(#barG)'));
    /* 圓形公司 logo（放大：直徑 42 → 56；淺灰圓底、無外框）*/
    const lx = 92, R = 28;
    svg.push(`<circle cx="${lx}" cy="${cy}" r="${R}" fill="${C.logoBg}"/>`);
    const uri = LOGOS[r.ticker];
    if (uri) {
      const cid = `lg${uid++}`;
      const ein = R * 2 * 0.84, eoff = (R * 2 - ein) / 2;
      defs.push(`<clipPath id="${cid}"><circle cx="${lx}" cy="${cy}" r="${R}"/></clipPath>`);
      svg.push(`<g clip-path="url(#${cid})"><image x="${lx - R + eoff}" y="${cy - R + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
    } else {
      svg.push(t(lx, cy + 8, 'TS', { size: 22, weight: 700, fill: '#B23A2E', anchor: 'middle' }));
    }
    svg.push(t(132, cy + 9, r.name, { size: 26, weight: 600, fill: C.ink }));
    svg.push(t(1016, cy + 9, r.amount, { size: 27, weight: 700, fill: C.ink, anchor: 'end' }));
  });
}

/* ---- 亮金認購緞帶，壓在排名面板上沿（對應原圖米金色標題條）---- */
{
  const bw = 470, by = 478, bh = 60;
  svg.push(rrect(M, by, bw, bh, 14, 'url(#bannerG)'));
  svg.push(t(M + 24, by + 40, D.banner, { size: fit(D.banner, 24, bw - 44), weight: 700, fill: C.goldInk }));
}

/* ---- 四格算力帳單面板 ---- */
const BILL_Y = 1022, BILL_H = 176;
svg.push(rrect(M, BILL_Y, CW, BILL_H, 18, C.panel, `stroke="${C.edge}" stroke-width="1.2"`));
svg.push(t(76, 1056, D.bill_title, { size: 22, weight: 700, fill: C.gold, ls: 1.2 }));
{
  const colX = [76, 320, 560, 790];
  const colW = [232, 228, 218, 242];
  [308, 548, 778].forEach((x) => {
    svg.push(`<line x1="${x}" y1="1072" x2="${x}" y2="1186" stroke="${C.edge}" stroke-width="1"/>`);
  });
  D.bill.forEach((b, i) => {
    svg.push(t(colX[i], 1096, b.label, { size: fit(b.label, 18, colW[i]), fill: C.gray }));
    svg.push(t(colX[i], 1148, b.value, { size: fit(b.value, 34, colW[i]), weight: 700, fill: C.ink, ls: -0.5 }));
    if (b.note) svg.push(t(colX[i], 1178, b.note, { size: fit(b.note, 16, colW[i]), fill: C.dim }));
  });
}

/* ---- OPM 統一頁尾（🔴 左下品牌行已移除，空間還給上下間距與 logo）---- */
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

/* 文案（X：只寫數字與事實、單句 <=90、全文 <=280）*/
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ single line > 90 chars:', line.length, line);
});
