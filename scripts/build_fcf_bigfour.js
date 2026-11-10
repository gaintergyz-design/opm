/**
 * OPM 專題卡 · AI Cash Burn（四大巨頭單季自由現金流，2×2 面板）· 1080×1350
 *
 * 版面（2026-11-02，改編自富途牛牛「四大巨頭三家轉負」中文圖，OPM 淺色格式）：
 *   頁首   大標題 + 副標（右上不放 logo / handle pill）
 *   條     合計洞察條
 *   主圖   2×2 面板，每面板：logo + ticker + 最新季 FCF pill + 12 季柱狀圖
 *          柵柱正=綠 / 負=紅（英文區慣例）；y 軸 US$ billions
 *   頁腳   統一聲明（disclaimer.js）+ 口徑 meta + handle
 *
 * 數據口徑：FCF = 經營現金流 − 購置物業及設備（SEC 10-Q/10-K XBRL），日曆季度。
 * 原始值與來源見 data/fcf-bigfour.json 的 sources 欄。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_fcf_bigfour.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'fcf-bigfour.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7',
  pos: '#12B76A', neg: '#E5484D',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

const fmtB = (v) => `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(1)}B`;

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#12B76A"/><stop offset="0.5" stop-color="#0078D4"/><stop offset="1" stop-color="#E5484D"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);                       // 左上角 OPM 標識（2026-11-10 阿澤欽定）

/* ---------------- 頁首 ---------------- */
const TS = 88;
const titleSize = tw(D.title, TS, 700) > CW ? Math.floor(TS * CW / tw(D.title, TS, 700)) : TS;
svg.push(t(M, 132, D.title, { size: titleSize, weight: 700, ls: -2.5 }));
const SUB = 24;
const subSize = tw(D.subtitle, SUB, 400) > CW ? Math.floor(SUB * CW / tw(D.subtitle, SUB, 400)) : SUB;
svg.push(t(M, 176, D.subtitle, { size: subSize, fill: C.gray }));
svg.push(`<rect x="${M}" y="196" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- 洞察條 ---------------- */
{
  const ss = 21, SH = 48;
  const w = Math.min(CW, Math.round(tw(D.strip, ss, 500)) + 44);
  const x0 = Math.round((W - w) / 2);
  const SY = 224;
  svg.push(rrect(x0, SY, w, SH, 12, '#EEF4FE', 'stroke="#D7E5FA" stroke-width="1.2"'));
  svg.push(`<rect x="${x0}" y="${SY + 8}" width="5" height="${SH - 16}" rx="2.5" fill="#0078D4"/>`);
  svg.push(t(x0 + 22, SY + 31, D.strip, { size: ss, weight: 500, fill: '#0B1220' }));
}

/* ---------------- 2×2 面板 ---------------- */
const PW = (W - M * 2 - 24) / 2;          // 480
const PH = 440;
const ROW0 = 300, ROW1 = ROW0 + PH + 24;  // 300 / 764

const NQ = D.quarters.length;

D.series.forEach((s, pi) => {
  const col = pi % 2, row = Math.floor(pi / 2);
  const x0 = M + col * (PW + 24);
  const y0 = row === 0 ? ROW0 : ROW1;
  const x1 = x0 + PW, y1 = y0 + PH;

  /* 面板底 */
  svg.push(rrect(x0, y0, PW, PH, 20, '#FFFFFF', 'stroke="#E4E7EC" stroke-width="1.5"'));

  /* 頭部：logo + ticker/name；右側小標 + FCF pill */
  const L = 46, lx = x0 + 22, cy = y0 + 46;
  const uri = LOGOS[s.ticker];
  if (uri) {
    const cid = `lg${uid++}`;
    defs.push(`<clipPath id="${cid}"><circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}"/></clipPath>`);
    const ein = L * 0.92, eoff = (L - ein) / 2;
    svg.push(`<g clip-path="url(#${cid})"><image x="${lx + eoff}" y="${cy - L / 2 + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
    svg.push(`<circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}" fill="none" stroke="#DDE6EF" stroke-width="1.2"/>`);
  } else {
    svg.push(`<circle cx="${lx + L / 2}" cy="${cy}" r="${L / 2}" fill="${s.color}"/>`);
  }
  svg.push(t(lx + L + 14, y0 + 41, s.ticker, { size: 25, weight: 700 }));
  svg.push(t(lx + L + 14, y0 + 64, s.name, { size: 15, fill: C.gray }));

  const last = s.values[NQ - 1];
  const pillTxt = fmtB(last);
  const pw = Math.round(tw(pillTxt, 21, 700)) + 32;
  const px1 = x1 - 20, px0 = px1 - pw;
  svg.push(t(px1, y0 + 30, '3Q26 FCF', { size: 13, fill: C.dim, anchor: 'end' }));
  svg.push(rrect(px0, y0 + 38, pw, 36, 9, last >= 0 ? C.pos : C.neg));
  svg.push(t(px1 - 16, y0 + 62, pillTxt, { size: 21, weight: 700, fill: '#FFFFFF', anchor: 'end' }));

  /* 圖區 */
  const GX0 = x0 + 52, GX1 = x1 - 20, GY0 = y0 + 104, GY1 = y1 - 52;
  const YMIN = s.ymin, YMAX = s.ymax, YSTEP = s.ystep;
  const yOf = (v) => GY1 - ((v - YMIN) / (YMAX - YMIN)) * (GY1 - GY0);

  for (let v = YMIN; v <= YMAX + 1e-9; v += YSTEP) {
    const y = yOf(v);
    const zero = Math.abs(v) < 1e-9;
    svg.push(`<line x1="${GX0}" y1="${y.toFixed(1)}" x2="${GX1}" y2="${y.toFixed(1)}" stroke="${zero ? '#98A2B3' : C.track}" stroke-width="${zero ? 1.4 : 1}"/>`);
    svg.push(t(GX0 - 10, y + 4.5, String(v), { size: 12.5, fill: C.dim, anchor: 'end' }));
  }

  const slot = (GX1 - GX0) / NQ;
  const bw = 21;
  s.values.forEach((v, i) => {
    const cx = GX0 + slot * (i + 0.5);
    const yv = yOf(v), yz = yOf(0);
    const top = Math.min(yv, yz), hh = Math.max(2, Math.abs(yv - yz));
    const neg = v < 0;
    const lastQ = i === NQ - 1;
    svg.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="${Math.min(3, bw / 2)}" fill="${neg ? C.neg : C.pos}"${lastQ ? ' stroke="#0B1220" stroke-opacity="0.18" stroke-width="1"' : ''}/>`);
    svg.push(t(cx, y1 - 24, D.quarters[i], { size: 11.5, weight: lastQ ? 700 : 400, fill: lastQ ? C.ink : C.dim, anchor: 'middle' }));
  });
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.FCF_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `fcf-bigfour-${stamp}`;
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
