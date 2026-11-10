/**
 * OPM-宏觀前瞻卡（Macro Preview · CPI）· 1080×1350
 *
 * 版式參考富途「美國10月CPI前瞻」，改成 OPM 淺色風格：
 *   頁首   kicker + 大標 + 發布日 / 美東時間 pill（右上不放 @onepagemarket 標記）
 *   ①     三張關鍵數據卡：共識大字 + 近兩月實際 vs 本月共識的迷你柱
 *          （年率本月官方不公布 → 卡片下緣放資料缺口說明，不畫假柱）
 *   ②     情境分析表：情境 / 核心月率門檻 / 市場反應三欄，色帶區分 soft·in line·hot
 *   頁腳   統一聲明（不寫 Source）
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_cpi.js
 *   PREVIEW=1 CPI_DATA=data/cpi-oct2026.json node scripts/build_cpi.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const DATA_PATH = process.env.CPI_DATA || path.join(BASE, 'data', 'cpi-oct2026.json');
const D = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#EDF1F6', cardLine: '#E7EDF4',
  accent: '#C2410C', accentDeep: '#9A3412', accentBg: '#FFF4ED', accentLine: '#F7DAC9',
  soft: '#0E8A5F', softBg: '#F1F8F4', softLine: '#D8EBE1',
  mid: '#2F6FB0', midBg: '#F2F6FC', midLine: '#DCE7F4',
  hot: '#C0392B', hotBg: '#FDF3F1', hotLine: '#F3DCD7',
  barOld: '#C9D8E6',
};
const FONT = 'MiSans';
const TONE = { soft: C.soft, mid: C.mid, hot: C.hot };
const TONEBG = { soft: C.softBg, mid: C.midBg, hot: C.hotBg };
const TONELINE = { soft: C.softLine, mid: C.midLine, hot: C.hotLine };

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

const warnings = [];
/** 文字寬度硬檢查：超寬就報，不讓它靜默壓到隔壁欄 */
function fitCheck(tag, s, size, weight, avail) {
  const w = tw(s, size, weight);
  if (w > avail) warnings.push(`${tag}: "${s}" ${Math.round(w)} > ${Math.round(avail)}`);
  return w;
}
const pct = (v) => `${v.toFixed(1)}%`;

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FCFDFE"/>
  <stop offset="1" stop-color="#F3F6FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.accent}"/><stop offset="0.55" stop-color="#E1662A"/>
  <stop offset="1" stop-color="#F0B27A"/></linearGradient>`);
defs.push(`<linearGradient id="barNew" x1="0" y1="1" x2="0" y2="0">
  <stop offset="0" stop-color="${C.accentDeep}"/><stop offset="1" stop-color="#E1662A"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, '@onepagemarket', { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

const handle = '@onepagemarket';

/* ---------------- 頁首 ---------------- */
svg.push(t(M, 96, D.kicker, { size: 17, weight: 500, fill: C.accent, ls: 3.2 }));

let titleSize = 78;
const titleMax = CW;
while (tw(D.title, titleSize, 700) > titleMax && titleSize > 54) titleSize -= 2;
svg.push(t(M, 186, D.title, { size: titleSize, weight: 700, ls: -2 }));

const subSize = 25;
svg.push(t(M, 234, D.subtitle, { size: subSize, fill: C.gray }));
{
  const bx = M + tw(D.subtitle, subSize) + 18;
  const bw = Math.round(tw(D.badge, 19, 600)) + 34;
  svg.push(rrect(bx, 210, bw, 34, 9, C.accentBg, `stroke="${C.accentLine}" stroke-width="1.2"`));
  svg.push(t(bx + bw / 2, 234, D.badge, { size: 19, weight: 600, fill: C.accent, anchor: 'middle' }));
}
svg.push(`<rect x="${M}" y="268" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- 模塊標題 ---------------- */
function sectionLabel(x, y, label, right) {
  svg.push(`<rect x="${x}" y="${y - 21}" width="6" height="25" fill="${C.accent}"/>`);
  svg.push(t(x + 18, y, label, { size: 26, weight: 500 }));
  if (right) svg.push(t(W - M, y, right, { size: 17, fill: C.dim, anchor: 'end' }));
}
sectionLabel(M, 330, 'What consensus expects', 'grey = actual · orange = consensus');

/* ---------------- ① 三張關鍵數據卡 ---------------- */
const CY = 352, CH = 320, GAP = 20;
const cardW = (CW - GAP * 2) / 3;

function printCard(x, p) {
  const g = [];
  const cx0 = x + 24, innerW = cardW - 48;
  g.push(rrect(x, CY, cardW, CH, 20, '#FFFFFF', `stroke="${C.cardLine}" stroke-width="1.5"`));
  // 頂部細色條（卡與卡之間只有這一處品牌色，其余留白）
  g.push(rrect(x + 24, CY + 20, 34, 4, 2, C.accent));

  g.push(t(x + 24, CY + 60, p.name, { size: 24, weight: 500 }));
  fitCheck('desc', p.desc, 14, 400, innerW);
  g.push(t(x + 24, CY + 84, p.desc, { size: 14, fill: C.dim }));

  if (p.consensus != null) {
    g.push(t(x + 24, CY + 120, 'CONSENSUS', { size: 11, weight: 500, fill: C.dim, ls: 2.2 }));
    const num = pct(p.consensus);
    g.push(t(x + 24, CY + 194, num, { size: 70, weight: 700, fill: C.accent, ls: -2 }));
  } else {
    g.push(t(x + 24, CY + 120, 'NOT PUBLISHED', { size: 11, weight: 500, fill: C.dim, ls: 2.2 }));
    g.push(t(x + 24, CY + 190, 'n/a', { size: 56, weight: 700, fill: '#BFC8D4', ls: -1 }));
  }

  g.push(`<line x1="${x + 24}" y1="${CY + 214}" x2="${x + cardW - 24}" y2="${CY + 214}" stroke="${C.line}" stroke-width="1"/>`);

  if (p.bars) {
    // 迷你柱：Aug / Sep 實際（灰藍）+ Oct 共識（橘）；同一卡內同一尺度
    const baseY = CY + 282, maxH = 48;
    const hi = Math.max(...p.bars.map((b) => b.v)) * 1.18;
    const n = p.bars.length;
    const slot = innerW / n, bw = Math.min(58, slot * 0.56);
    // 基線：讓迷你柱有落腳點，不然浮在卡片下緣
    g.push(`<line x1="${cx0}" y1="${baseY + 2}" x2="${cx0 + innerW}" y2="${baseY + 2}" stroke="${C.line}" stroke-width="1"/>`);
    p.bars.forEach((b, i) => {
      const h = Math.max(6, Math.round(b.v / hi * maxH));
      const bx = cx0 + slot * i + (slot - bw) / 2;
      g.push(rrect(bx, baseY - h, bw, h, 5, b.fcst ? 'url(#barNew)' : C.barOld));
      g.push(t(bx + bw / 2, baseY - h - 10, pct(b.v),
        { size: 16, weight: 600, fill: b.fcst ? C.accent : C.gray, anchor: 'middle' }));
      g.push(t(bx + bw / 2, baseY + 22, b.l, { size: 14, fill: b.fcst ? C.accent : C.dim, anchor: 'middle' }));
    });
  } else if (p.gap) {
    const gy = CY + 230, gh = 68;
    g.push(rrect(x + 24, gy, innerW, gh, 12, '#F7F9FB', `stroke="#E9EEF4" stroke-width="1.2"`));
    g.push(t(x + 38, gy + 26, p.gap.a, { size: 12, weight: 500, fill: C.dim, ls: 1.2 }));
    g.push(t(x + 38, gy + 52, p.gap.b, { size: 15.5, weight: 500, fill: C.gray }));
  }
  return g.join('');
}
D.prints.forEach((p, i) => svg.push(printCard(M + i * (cardW + GAP), p)));

/* ---------------- ①-b 資料缺口說明條 ---------------- */
{
  const NY = 692, NH = 76;
  svg.push(rrect(M, NY, CW, NH, 14, '#F7F9FB', `stroke="#E9EEF4" stroke-width="1.2"`));
  svg.push(rrect(M, NY + 14, 4, NH - 28, 2, C.accent));
  fitCheck('note.a', D.note.a, 16, 400, CW - 56);
  fitCheck('note.b', D.note.b, 16, 400, CW - 56);
  svg.push(t(M + 22, NY + 33, D.note.a, { size: 16, fill: C.gray }));
  svg.push(t(M + 22, NY + 58, D.note.b, { size: 16, fill: C.gray }));
}

/* ---------------- ② 情境分析 ---------------- */
const TY = 812;
sectionLabel(M, TY, 'Scenario analysis', 'core CPI · month over month');

const HEAD_Y = TY + 24, HEAD_H = 44;
const ROW_H = 100;
const COL1 = M + 24, COL2 = M + 300, COL3 = M + 588;

svg.push(rrect(M, HEAD_Y, CW, HEAD_H, 10, '#F2F5F8'));
svg.push(t(COL1, HEAD_Y + 29, 'SCENARIO', { size: 12, weight: 500, fill: C.gray, ls: 2 }));
svg.push(t(COL2, HEAD_Y + 29, 'CORE CPI M/M', { size: 12, weight: 500, fill: C.gray, ls: 2 }));
svg.push(t(COL3, HEAD_Y + 29, 'MARKET REACTION', { size: 12, weight: 500, fill: C.gray, ls: 2 }));

D.scenarios.forEach((s, i) => {
  const ry = HEAD_Y + HEAD_H + 6 + i * (ROW_H + 6);
  const tone = TONE[s.tone] || C.mid;
  svg.push(rrect(M, ry, CW, ROW_H, 12, TONEBG[s.tone] || C.midBg, `stroke="${TONELINE[s.tone] || C.midLine}" stroke-width="1.2"`));
  svg.push(rrect(M, ry + 10, 5, ROW_H - 20, 2.5, tone));

  const midY = ry + ROW_H / 2;
  svg.push(t(COL1, midY + 9, s.name, { size: 27, weight: 700, fill: tone }));
  svg.push(t(COL2, midY + 10, s.threshold, { size: 30, weight: 700, fill: tone, ls: 0.5 }));

  // 反應欄：三行字 + 方向箭頭（箭頭用情境色，文字用墨色）
  s.rows.forEach((r, j) => {
    const y = ry + 30 + j * 26;
    fitCheck(`react.${s.tone}.${j}`, r[0], 16, 400, CW - (COL3 - M) - 40);
    svg.push(t(COL3 + 24, y, r[1], { size: 17, weight: 700, fill: tone }));
    svg.push(t(COL3 + 46, y, r[0], { size: 16, fill: C.ink }));
  });
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.CPI_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `cpi-${stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'),
                   path.join(process.env.HOME || '', 'Library', 'Fonts')];
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
if (warnings.length) console.log('LAYOUT WARN:', warnings.join(' | '));
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
