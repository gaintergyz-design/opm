/**
 * OPM 專題卡：Global Foundry Top 10（Q2 2026 營收排名）
 *
 * 需求（2026-11-18 阿澤）：只要排名、不要餅圖；每行＝大 logo＋名稱＋代碼＋營收＋市佔；
 *   全英文、淺色底、OPM 版式（右上角字標）。
 *
 * 數據：TrendForce，2026 年第二季全球晶圓代工前十（百萬美元 / 市佔）。
 *   註：Q3 2026 的市佔排名 TrendForce 尚未公布（2026-11 中旬查證），故 Q2 為最新一期。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_foundry_top10.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_foundry_top10.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'foundry-top10-2026q2.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#ECEFF3', teal: '#00A98C', tealInk: '#00806B', tint: '#F2FBF8',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&'.,]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fit = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
const t = (x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;

const comma = (n) => n.toLocaleString('en-US');

/* logo：assets/foundry/<KEY>.png，讀 PNG 頭取原始寬高，contain 進固定框 */
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const LOGOS = {};
function logo(key) {
  if (LOGOS[key] !== undefined) return LOGOS[key];
  const f = path.join(BASE, 'assets', 'foundry', key + '.png');
  if (!fs.existsSync(f)) { LOGOS[key] = null; return null; }
  const buf = fs.readFileSync(f);
  const { w, h } = pngSize(buf);
  LOGOS[key] = { uri: 'data:image/png;base64,' + buf.toString('base64'), w, h };
  return LOGOS[key];
}

/* ---- 版面常量 ---- */
const KICK_Y = 128, T1_Y = 202, T2_Y = 270, SUB_Y = 312;
const BAR_Y = 342, BAR_H = 30;
const CAP_Y = 398;
const COL_Y = 444;
const GRID_TOP = 462, GRID_BOT = 1206;
const RANK_X = M, LOGO_X = 92, LOGO_W = 172, LOGO_H = 60, NAME_X = 300;
const REV_X = 862, SHARE_X = W - M;

function render() {
  const a = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  a.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  brandMark(a, { W, M, cy: 88, h: 34 });

  /* 頁首 */
  a.push(t(M, KICK_Y, D.kicker, { size: 17, weight: 500, fill: C.dim, ls: 2.4 }));
  a.push(t(M, T1_Y, D.headline[0], { size: fit(D.headline[0], 62, CW - 150), weight: 700, fill: C.ink, ls: -1.6 }));
  a.push(t(M, T2_Y, D.headline[1], { size: fit(D.headline[1], 62, CW), weight: 700, fill: C.teal, ls: -1.8 }));
  a.push(t(M, SUB_Y, D.subtitle, { size: 20, fill: C.gray }));

  /* 100% 份額條：一眼看出龍頭體量（分母＝全球市場，故右段含前十以外的 3.6%） */
  const totalShare = D.rows.reduce((s, r) => s + r.share, 0);
  const tsmc = D.rows[0];
  const wTop = CW * tsmc.share / 100;
  const r = BAR_H / 2;
  /* 整條兩端圓角、中間接縫直角：TSMC 段＝左圓右直；其餘段＝左直右圓 */
  const LJ = M + wTop;   /* 兩段接縫 x */
  a.push(`<path d="M${M + r} ${BAR_Y} H${LJ} V${BAR_Y + BAR_H} H${M + r} A${r} ${r} 0 0 1 ${M} ${BAR_Y + BAR_H - r} V${BAR_Y + r} A${r} ${r} 0 0 1 ${M + r} ${BAR_Y} Z" fill="${C.teal}"/>`);
  a.push(`<path d="M${LJ} ${BAR_Y} H${W - M - r} A${r} ${r} 0 0 1 ${W - M} ${BAR_Y + r} V${BAR_Y + BAR_H - r} A${r} ${r} 0 0 1 ${W - M - r} ${BAR_Y + BAR_H} H${LJ} Z" fill="#E7ECF1"/>`);
  a.push(t(M + 16, BAR_Y + BAR_H / 2 + 6, `${tsmc.name} ${tsmc.share}%`, { size: 17, weight: 700, fill: '#FFFFFF' }));
  const restLabel = `Everyone else  ${(100 - tsmc.share).toFixed(1)}%`;
  a.push(t(M + wTop + 14, BAR_Y + BAR_H / 2 + 6, restLabel, { size: 15, weight: 500, fill: C.gray }));
  a.push(t(M, CAP_Y, D.barCaption, { size: 15, fill: C.dim }));
  a.push(t(W - M, CAP_Y, D.barTotal, { size: 15, weight: 500, fill: C.dim, anchor: 'end' }));

  /* 欄頭 */
  a.push(t(NAME_X, COL_Y, 'COMPANY', { size: 13, weight: 500, fill: C.dim, ls: 1.6 }));
  a.push(t(REV_X, COL_Y, 'REVENUE  US$M', { size: 13, weight: 500, fill: C.dim, anchor: 'end', ls: 1.6 }));
  a.push(t(SHARE_X, COL_Y, 'SHARE', { size: 13, weight: 500, fill: C.dim, anchor: 'end', ls: 1.6 }));

  /* 排名列 */
  const ROW_H = (GRID_BOT - GRID_TOP) / D.rows.length;
  a.push(`<rect x="${M - 12}" y="${GRID_TOP}" width="${CW + 24}" height="${ROW_H}" rx="14" fill="${C.tint}"/>`);
  D.rows.forEach((row, i) => {
    const top = GRID_TOP + ROW_H * i;
    const cy = top + ROW_H / 2;
    if (i > 0) a.push(`<line x1="${M}" y1="${top}" x2="${W - M}" y2="${top}" stroke="${C.line}" stroke-width="1"/>`);

    a.push(t(RANK_X, cy + 9, String(row.rank), { size: 25, weight: 700, fill: i === 0 ? C.teal : '#C2C9D3' }));

    const L = logo(row.logo);
    if (L) {
      const k = Math.min(LOGO_W / L.w, LOGO_H / L.h);
      const w = L.w * k, h = L.h * k;
      a.push(`<image x="${(LOGO_X + (LOGO_W - w) / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" href="${L.uri}"/>`);
    }

    const nmSize = fit(row.name, 28, REV_X - 150 - NAME_X);
    a.push(t(NAME_X, cy - 2, row.name, { size: nmSize, weight: 700, fill: C.ink, ls: -0.4 }));
    a.push(t(NAME_X, cy + 23, row.code, { size: 15, weight: 500, fill: C.dim, ls: 0.9 }));

    a.push(t(REV_X, cy + 10, comma(row.rev), { size: 33, weight: 700, fill: C.ink, anchor: 'end', ls: -0.6 }));
    a.push(t(SHARE_X, cy + 10, row.share.toFixed(1) + '%', { size: 27, weight: 700, fill: i === 0 ? C.tealInk : C.ink, anchor: 'end' }));
  });

  pushFooter(t, a, { M, W, H, C, handle: '@onepagemarket', meta: D.meta });
  a.push('</svg>');
  return a.join('\n');
}

/* ---- 輸出 ---- */
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'foundry-top10-20261118';

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const svgStr = render();
/* 全英文自檢：卡片上不得出現 CJK */
const cjk = svgStr.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g);
if (cjk) throw new Error('卡片出現中日韓字元：' + [...new Set(cjk)].join(''));

fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
fs.writeFileSync(path.join(outDir, `${stem}.png`), png);
console.log('PNG ->', path.join(outDir, `${stem}.png`), `(${(png.length / 1024).toFixed(0)} KB)`, `${W}x${H}`);

fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), D.caption);
console.log('caption chars:', D.caption.length);

const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap, null, 0));
