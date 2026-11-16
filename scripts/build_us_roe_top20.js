/**
 * OPM 專題卡：America's 20 Largest · Ranked by ROE（拆成兩張，各 10 家）
 *
 * 需求（2026-11-16 阿澤）：橫向柱狀圖、柱子末端放公司 logo（logo 要大）、
 *   美股市值前 20 按 ROE 排序、白底全英文；後續：柱用品牌色、負值圓角反向、
 *   數值放 logo 右側、公司名貼近柱子；最後拆成兩張（各 10 家、標題相同），正方形優先。
 *
 * 數據：data/us-roe-top20.json（市值 CompaniesMarketCap 2026-11-13；
 *       ROE stockanalysis.com 財報比率頁，TTM 口徑，缺失者用最近完整財年）。
 * 輸出：out/us-roe-top20-20261116-p1.png / -p2.png（同一 post 組，畫廊自動併組）
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_us_roe_top20.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_us_roe_top20.js
 *   TALL=1 ...  # 退回 1080x1920 版
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'us-roe-top20.json'), 'utf8'));

const TALL = !!process.env.TALL;
const PER = 10;

/* ---- 尺寸：正方形 1080x1080 優先，TALL=1 退回 1080x1920 ---- */
const W = 1080, M = 48, CW = W - M * 2;
const S = TALL
  ? { H: 1920, T1: 176, T1S: 72, T2: 286, T2S: 100, SUB: 334, SUBS: 25, TOP: 392, BOT: 1762,
      BAR: 32, LOGO: 64, TK: 26, NM: 12.5, VAL: 26, XR: 812, OPMH: 54, OPMY: 54, TICK: 19 }
  : { H: 1080, T1: 118, T1S: 58, T2: 198, T2S: 90, SUB: 234, SUBS: 19, TOP: 300, BOT: 934,
      BAR: 26, LOGO: 54, TK: 23, NM: 11.5, VAL: 23, XR: 848, OPMH: 42, OPMY: 44, TICK: 16 };

const H = S.H;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', grid: '#EFF2F5',
  teal: '#00A98C', orange: '#F1541E',
};

/* 🔴 右上角品牌標識＝OPM 字標圖片（resvg 只認 data URI）*/
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&'.,]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fitTitle = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const fmt = (v) => (v < 0 ? '-' : '') +
  (Math.abs(v) >= 1000 ? Math.round(Math.abs(v)).toLocaleString('en-US') : Math.abs(v).toFixed(1)) + '%';

/* logo：源圖內容只佔 1/1.47（fetch_logos 為圓裁切預留的留白），
   渲染時把圖放大 1.47 倍，內容剛好撐滿視覺方框，溢出部分是透明 — 無需 clipPath。 */
const LOGO_FIT = 1.47;
const logoURI = (tk) => {
  const f = path.join(BASE, 'assets', 'logos', tk.replace(/\./g, '-') + '.png');
  if (!fs.existsSync(f)) return null;
  return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
};

const LOGO_IMG = Math.round(S.LOGO * LOGO_FIT);
/* 每張卡各自定軸：20 家一把尺會讓第二張（最大值 32%）右邊空掉三分之二 */
const AXIS = {
  1: { max: 160, step: 40, gutter: 0 },
  2: { max: 40, step: 10, gutter: 999 },   // gutter＝負值柱可用留白（0 線已按負值長度右移，不再切斷）
};

/* ---- 一張卡 ---- */
function render(rows, part) {
  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

  /* 右上 OPM 字標 */
  {
    const h = S.OPMH, w = OPM_W / OPM_H * h;
    svg.push(`<image x="${W - M - w}" y="${S.OPMY}" width="${w}" height="${h}" href="${OPM_URI}"/>`);
  }

  /* 標題（兩張完全一致） */
  const T1 = D.headline[0], T2 = D.headline[1];
  svg.push(t(M, S.T1, T1, { size: fitTitle(T1, S.T1S, CW), weight: 700, fill: C.ink, ls: -1.2 }));
  svg.push(t(M, S.T2, T2, { size: fitTitle(T2, S.T2S, CW), weight: 700, fill: C.teal, ls: -2 }));
  svg.push(t(M, S.SUB, D.subtitle, { size: S.SUBS, fill: C.gray }));
  svg.push(t(W - M, S.SUB, `PART ${part} OF 2`, { size: S.SUBS - 3, fill: C.dim, anchor: 'end', ls: 1.2 }));

  /* 版面常量：左列寬按實際字寬量，0 線緊貼公司名 */
  const GRID_TOP = S.TOP, GRID_BOT = S.BOT;
  const ROW_H = (GRID_BOT - GRID_TOP) / rows.length;
  const BAR_H = S.BAR;
  const LEFT_W = Math.max(...rows.map((r) =>
    Math.max(approx(r.ticker, S.TK) * 1.06, approx(r.name, S.NM) * 1.04)));
  const X_RIGHT = S.XR;
  const AX = AXIS[part];
  /* 0 線位置：預設貼著公司名；若有負值，整張圖右移，剛好容納真實長度的負柱 */
  let X0 = Math.round(M + LEFT_W + (TALL ? 30 : 26));
  const negRow = rows.find((r) => r.roe < 0);
  if (negRow) {
    const f = Math.abs(negRow.roe) / AX.max;              // 負值佔軸的比例
    const L = M + approx(negRow.ticker, S.TK) * 1.06 + 22; // 負柱左端至少要離開名稱這麼遠
    X0 = Math.max(X0, Math.ceil((f * X_RIGHT + L) / (1 + f)));
  }
  const K = (X_RIGHT - X0) / AX.max;
  const X = (v) => X0 + v * K;

  /* 刻度 */
  for (let v = 0; v <= AX.max; v += AX.step) {
    const x = X(v);
    if (v > 0) svg.push(`<line x1="${x}" y1="${GRID_TOP}" x2="${x}" y2="${GRID_BOT}" stroke="${C.grid}" stroke-width="1"/>`);
    svg.push(t(x, GRID_TOP - 14, v + '%', { size: S.TICK, weight: 500, fill: C.dim, anchor: 'middle' }));
  }
  svg.push(`<line x1="${X0}" y1="${GRID_TOP}" x2="${X0}" y2="${GRID_BOT}" stroke="#C3CBD5" stroke-width="1.5"/>`);

  /* 行 */
  rows.forEach((r, i) => {
    const cy = GRID_TOP + ROW_H * (i + 0.5);
    const neg = r.roe < 0;
    const needNeg = neg ? Math.abs(r.roe) * K : 0;
    /* 負值柱最多伸到公司名右側 14px，超出就切斷（斜紋） */
    const gut = Math.min(AX.gutter, X0 - (M + approx(r.ticker, S.TK) * 1.06 + 22));
    const cutNeg = neg && needNeg > gut + 1.5;
    const px0 = neg ? X0 - Math.min(needNeg, gut) : X0;
    const px1 = neg ? X0 : X0 + Math.min(r.roe, AX.max) * K;
    const w = Math.max(px1 - px0, 3);
    const tail = px1;
    const color = r.color || (neg ? C.orange : C.ink);

    svg.push(t(M, cy - 3, r.ticker, { size: S.TK, weight: 700, fill: C.ink, ls: -0.3 }));
    svg.push(t(M, cy + 17, r.name, { size: S.NM, weight: 400, fill: C.dim }));

    /* 圓角一律在「數據端」——正值右端、負值左端 */
    const rad = Math.min(7, w / 2);
    const tip = Math.min(10, w * 0.4);
    svg.push(neg
      ? (cutNeg
        /* 超出左界：數據端收成箭頭，表示「還要更左」 */
        ? `<path d="M${px1} ${cy - BAR_H / 2} H${px0 + tip} L${px0} ${cy} L${px0 + tip} ${cy + BAR_H / 2} H${px1} Z" fill="${color}"/>`
        : `<path d="M${px1} ${cy - BAR_H / 2} H${px0 + rad} a${rad} ${rad} 0 0 0 -${rad} ${rad} v${BAR_H - rad * 2} a${rad} ${rad} 0 0 0 ${rad} ${rad} H${px1} Z" fill="${color}"/>`)
      : `<path d="M${px0} ${cy - BAR_H / 2} h${w - rad} a${rad} ${rad} 0 0 1 ${rad} ${rad} v${BAR_H - rad * 2} a${rad} ${rad} 0 0 1 -${rad} ${rad} h-${w - rad} Z" fill="${color}"/>`);

    if (r.truncate) {
      for (let k = 0; k < 3; k++) {
        const ox = X_RIGHT - 8 - k * 14;
        svg.push(`<line x1="${ox}" y1="${cy + BAR_H / 2 + 1}" x2="${ox + 14}" y2="${cy - BAR_H / 2 - 1}" stroke="${C.bg}" stroke-width="3.4"/>`);
      }
    }

    /* logo 緊貼柱尾；數值排 logo 右側 */
    const uri = logoURI(r.ticker);
    const cx = tail + (neg ? 15 : 9) + S.LOGO / 2;
    if (uri) {
      svg.push(`<image x="${cx - LOGO_IMG / 2}" y="${cy - LOGO_IMG / 2}" width="${LOGO_IMG}" height="${LOGO_IMG}" href="${uri}"/>`);
    } else {
      svg.push(`<circle cx="${cx}" cy="${cy}" r="${S.LOGO / 2 - 4}" fill="${C.grid}"/>`);
      svg.push(t(cx, cy + 8, r.ticker[0], { size: S.TK, weight: 700, fill: C.gray, anchor: 'middle' }));
    }
    svg.push(t(cx + S.LOGO / 2 + 11, cy + 9, fmt(r.roe), { size: S.VAL, weight: 700, fill: C.ink }));
  });

  pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: part === 1 ? D.meta : D.meta2 });
  svg.push('</svg>');
  return svg.join('\n');
}

/* ---- 輸出 ---- */
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'us-roe-top20-20261116';

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}

for (let p = 0; p < 2; p++) {
  const rows = D.rows.slice(p * PER, (p + 1) * PER);
  const svgStr = render(rows, p + 1);
  const name = `${stem}-p${p + 1}`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svgStr);
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
    background: C.bg,
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `${name}.png`), png);
  console.log('PNG ->', path.join(outDir, `${name}.png`), `(${(png.length / 1024).toFixed(0)} KB)`, `${W}x${H}`);

  genMap[`${name}.png`] = Math.floor(Date.now() / 1000);
  const cap = p === 0 ? D.caption : D.caption2;
  fs.writeFileSync(path.join(outDir, `caption-${name}.txt`), cap);
  console.log(`caption p${p + 1} chars:`, cap.length);
}
fs.writeFileSync(genFile, JSON.stringify(genMap, null, 0));
