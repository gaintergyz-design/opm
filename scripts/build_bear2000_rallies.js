/**
 * OPM-專題卡：2000 年熊市途中的十二次反彈 · 1080×1350
 *
 * 觸發：阿澤出題「2000年剧本：熊市途中的十二次反弹……其中一次35%、两次超过40%。
 *       制作2000年下跌走势图，标注每一次反弹幅度。标题：小心，反弹之后可能是更大的下跌。OPM格式」。
 * 🔴 OPM 卡全英文，標題按原意譯為 "Beware: the bounce may be followed by a bigger drop"。
 *
 * 數據：Nasdaq 官方歷史 API（api.nasdaq.com COMP 日 K，1999-01-01～2003-12-31），
 *       截取 2000-03-10 收市高點至 2002-10-09 收市低點，674 根日 K，
 *       重算結果寫入 data/nasdaq-bear-2000.json（禁止手改）。
 * 口徑：每日收市價；轉折點以約 8% 反向收市變動確認（實際用 8.3% 去除 2000 年 4 月兩個貼鄰轉折），
 *       上升段收市漲幅 >10% 計一次，共 12 次；+35.1% / +41.2% / +44.7% 與來源說法一致。
 *       全程高點 5,048.62 → 低點 1,114.11 = -77.9%。
 *
 * 版式：單一大圖（不走三欄模組），走勢線珊瑚紅、反彈段 teal 綠，12 個反彈幅度直接標在線上；
 *       右上 assets/opm-logo.png、無手柄 pill、無斜紋水印、統一頁尾聲明。
 *
 * 🔴 影片版：buildCardSvg(progress) 只讓 ①走勢線（含反彈段）②反弹幅度標籤 隨進度變化，
 *    其餘元素逐幀完全不動；progress=1 與靜態卡 PNG 位元組一致。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_bear2000_rallies.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_bear2000_rallies.js
 *   const { buildCardSvg } = require('./build_bear2000_rallies');  // 影片逐幀用
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
  line: '#E4E7EC', panel: '#FAFBFD', panelLine: '#ECEDF1',
  down: '#F2596B', up: '#00A98C', upInk: '#006B5A', upTint: '#E6F6F2',
};

/* 🔴 右上品牌標識：assets/opm-logo.png，resvg 只認 data URI */
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'nasdaq-bear-2000.json'), 'utf8'));
const SERIES = D.series.map(([d8, v]) => ({ d8: String(d8), v }));
const IDX = new Map(SERIES.map((p, i) => [p.d8, i]));
const d8 = (iso) => iso.replace(/-/g, '');
const isoOf = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return `${MO[m - 1]} ${dd} '${String(y % 100).padStart(2, '0')}`; };
const num = (v) => Math.round(v).toLocaleString('en-US');
const day = (s) => {
  const iso = String(s).length === 8
    ? `${String(s).slice(0, 4)}-${String(s).slice(4, 6)}-${String(s).slice(6, 8)}`
    : String(s);
  return Date.parse(iso + 'T00:00:00Z') / 86400000;
};
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 幾何（影片幀與靜態卡共用，保證除動效外逐位元組不變）---- */
const PX0 = M, PY0 = 292, PW = CW, PH = 808;
const cx0 = PX0 + 78, cx1 = PX0 + PW - 28;
const cy0 = PY0 + 44, cy1 = PY0 + PH - 58;
const yMin = 900, yMax = 5300;
const t0 = day(D.window.start), t1 = day(D.window.end);
const Xday = (dd) => cx0 + (dd - t0) / (t1 - t0) * (cx1 - cx0);
const X = (s) => Xday(day(s));
const Y = (v) => cy1 - (v - yMin) / (yMax - yMin) * (cy1 - cy0);
const POP = (t1 - t0) * 0.03;   /* 標籤彈出時間窗 ≈ 0.2 秒 */
const easeBack = (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);

const rallies = D.rallies.map((r, i) => ({
  ...r, i, big: r.gain >= 35,
  a: d8(r.trough), b: d8(r.peak),
}));
const labels = rallies.map((r) => {
  const big = r.big;
  const above = big || r.i % 2 === 0;
  return {
    ...r, above, big,
    px: X(isoOf(r.b)), py: Y(r.peak_close),
    lx: X(isoOf(r.b)),
    ly: Math.min(Math.max(Y(r.peak_close) + (above ? -36 : 38), cy0 + 24), cy1 - 24),
    w: big ? 96 : 82, h: big ? 42 : 36,
    txt: `+${Math.round(r.gain)}%`,
  };
});
for (const band of [true, false]) {
  const arr = labels.filter((l) => l.above === band).sort((a, b) => a.lx - b.lx);
  const gap = 100;
  for (let i = 1; i < arr.length; i++) arr[i].lx = Math.max(arr[i].lx, arr[i - 1].lx + gap);
  const over = arr.length ? arr[arr.length - 1].lx - (cx1 - 54) : 0;
  if (over > 0) for (const l of arr) l.lx -= over;
  for (const l of arr) l.lx = Math.min(Math.max(l.lx, cx0 + 54), cx1 - 54);
}

/* ---- 任一進度下的整卡 SVG ---- */
function buildCardSvg(progress = 1) {
  const p = Math.max(0, Math.min(1, progress));
  const anim = p < 1;
  const cut = anim ? t0 + p * (t1 - t0) : t1;

  const defs = [];
  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
  svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);

  /* 右上 OPM 字標 */
  {
    const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
    svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
  }

  /* 標題 */
  svg.push(t(M, 144, 'Beware: the bounce', { size: 70, weight: 700, ls: -2 }));
  svg.push(t(M, 204, 'may be followed by a bigger drop', { size: 50, weight: 700, ls: -1.5 }));
  svg.push(t(M, 242, `Nasdaq Composite · ${dShort(D.window.start)} - ${dShort(D.window.end)} · ${D.drawdown_pct.toFixed(0)}% peak to trough`,
    { size: 22, fill: C.gray }));
  svg.push(`<rect x="${M}" y="266" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

  /* 主圖底板、網格、軸 */
  svg.push(rrect(PX0, PY0, PW, PH, 20, C.panel, `stroke="${C.panelLine}" stroke-width="1"`));
  for (const v of [1000, 2000, 3000, 4000, 5000]) {
    const gy = Y(v).toFixed(1);
    svg.push(`<line x1="${cx0}" y1="${gy}" x2="${cx1}" y2="${gy}" stroke="${C.line}" stroke-width="1"/>`);
    svg.push(t(cx0 - 12, Number(gy) + 5, num(v), { size: 14, fill: C.dim, anchor: 'end' }));
  }
  for (const [iso, label] of [['2000-04-01', '2000'], ['2001-01-02', '2001'], ['2002-01-02', '2002']]) {
    svg.push(t(X(iso), cy1 + 32, label, { size: 15, fill: C.dim, anchor: 'middle' }));
  }

  /* 全程下跌底線：progress=1 走原路徑，保證與靜態卡完全一致 */
  if (!anim) {
    const ptsAll = SERIES.map((s) => `${X(s.d8).toFixed(1)},${Y(s.v).toFixed(1)}`).join(' ');
    svg.push(`<polyline points="${ptsAll}" fill="none" stroke="${C.down}" stroke-opacity="0.8" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  } else {
    const coords = [];
    for (let i = 0; i < SERIES.length; i++) {
      const now = SERIES[i], dn = day(now.d8);
      if (dn <= cut) {
        coords.push(`${Xday(dn).toFixed(1)},${Y(now.v).toFixed(1)}`);
      } else if (i > 0) {
        const prev = SERIES[i - 1], dp = day(prev.d8);
        const f = (cut - dp) / (dn - dp);
        coords.push(`${Xday(cut).toFixed(1)},${Y(prev.v + (now.v - prev.v) * f).toFixed(1)}`);
        break;
      }
    }
    if (coords.length > 1) {
      svg.push(`<polyline points="${coords.join(' ')}" fill="none" stroke="${C.down}" stroke-opacity="0.8" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
  }

  /* 12 段反彈：走勢線推進到哪，綠段與端點就到哪 */
  rallies.forEach((r) => {
    const ia = IDX.get(r.a), ib = IDX.get(r.b);
    if (ia == null || ib == null) throw new Error(`missing pivot ${r.a}/${r.b}`);
    const ta = day(isoOf(r.a)), tb = day(isoOf(r.b));
    if (anim && cut < ta) return;

    let seg;
    if (!anim || cut >= tb) {
      seg = SERIES.slice(ia, ib + 1).map((s) => `${X(s.d8).toFixed(1)},${Y(s.v).toFixed(1)}`).join(' ');
    } else {
      const part = [];
      for (let i = ia; i <= ib; i++) {
        const now = SERIES[i], dn = day(now.d8);
        if (dn <= cut) {
          part.push(`${Xday(dn).toFixed(1)},${Y(now.v).toFixed(1)}`);
        } else {
          const prev = SERIES[i - 1], dp = day(prev.d8);
          const f = (cut - dp) / (dn - dp);
          part.push(`${Xday(cut).toFixed(1)},${Y(prev.v + (now.v - prev.v) * f).toFixed(1)}`);
          break;
        }
      }
      seg = part.join(' ');
    }
    svg.push(`<polyline points="${seg}" fill="none" stroke="${C.up}" stroke-width="${r.big ? 5 : 3.6}" stroke-linejoin="round" stroke-linecap="round"/>`);
    svg.push(`<circle cx="${X(isoOf(r.a)).toFixed(1)}" cy="${Y(r.trough_close).toFixed(1)}" r="4" fill="#FFFFFF" stroke="${C.up}" stroke-width="2"/>`);
    if (!anim || cut >= tb) {
      svg.push(`<circle cx="${X(isoOf(r.b)).toFixed(1)}" cy="${Y(r.peak_close).toFixed(1)}" r="${r.big ? 6 : 4.5}" fill="${C.up}" stroke="#FFFFFF" stroke-width="2"/>`);
    }
  });

  /* 幅度標籤：峰點走到才彈出；其餘位置固定 */
  labels.forEach((l) => {
    const tb = day(isoOf(l.b));
    if (anim && cut < tb) return;
    const reveal = anim ? Math.min(1, (cut - tb) / POP) : 1;
    const lyEdge = l.above ? l.ly + l.h / 2 : l.ly - l.h / 2;
    const leader = `<line x1="${l.px.toFixed(1)}" y1="${l.py.toFixed(1)}" x2="${l.lx.toFixed(1)}" y2="${lyEdge.toFixed(1)}" stroke="${C.up}" stroke-opacity="0.45" stroke-width="1.2"/>`;
    const pill = rrect(l.lx - l.w / 2, l.ly - l.h / 2, l.w, l.h, 10,
      l.big ? C.up : C.upTint, l.big ? '' : `stroke="${C.up}" stroke-opacity="0.6" stroke-width="1.6"`);
    const txt = t(l.lx, l.ly + (l.big ? 9 : 8), l.txt,
      { size: l.big ? 26 : 21, weight: 700, fill: l.big ? '#FFFFFF' : C.upInk, anchor: 'middle' });
    if (!anim || reveal >= 1) {
      svg.push(leader); svg.push(pill); svg.push(txt);
    } else {
      const s = 0.55 + 0.45 * easeBack(reveal);
      svg.push(`<g opacity="${reveal.toFixed(3)}">${leader}</g>`);
      svg.push(`<g opacity="${reveal.toFixed(3)}" transform="translate(${l.lx.toFixed(1)} ${l.ly.toFixed(1)}) scale(${s.toFixed(3)}) translate(${(-l.lx).toFixed(1)} ${(-l.ly).toFixed(1)})">${pill}${txt}</g>`);
    }
  });

  /* 圖下註 */
  svg.push(t(M, 1134, '12 rallies above 10%. The three biggest: +35%, +41%, +45% - each followed by a new closing low.',
    { size: 17, weight: 700, fill: C.ink }));
  svg.push(t(M, 1160,
    'Nasdaq Composite daily closes. Swings confirmed by an approximately 8% reverse close; gains are close-to-close, rounded to whole numbers.',
    { size: 13, fill: C.dim }));

  /* 頁尾 */
  pushFooter(t, svg, {
    M, W, H, C, handle: '@onepagemarket',
    meta: 'NASDAQ COMPOSITE (COMP) · DAILY CLOSES · MAR 2000 - OCT 2002',
  });

  svg.push('</svg>');
  svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return svg.join('\n');
}

module.exports = { buildCardSvg };

/* ---- 單獨執行才寫靜態卡檔案（影片 require 時不產生副作用）---- */
if (require.main === module) {
  const svgStr = buildCardSvg(1);
  const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
  fs.mkdirSync(outDir, { recursive: true });
  const stem = 'bear2000-rallies-20261123';
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

  if (!process.env.PREVIEW) {
    const genFile = path.join(BASE, 'out', 'gen-times.json');
    let gen = {};
    try { gen = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
    gen[`${stem}.png`] = Math.floor(Date.now() / 1000);
    fs.writeFileSync(genFile, JSON.stringify(gen));
  }

  const CAPTION =
    `How many fake bottoms fit in one bear market? Nasdaq had 12 rallies over 10% on the way down ` +
    `\u2014 one +35%, two past +40%. Then came -78%.`;
  fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
  console.log('caption chars:', CAPTION.length);
}
