/**
 * OPM 專題卡 · SUPER MERGER（Tesla + SpaceX 強勢反彈）· 1080×1350 黑底炫酷版
 *
 * 版面（2026-11-02，阿澤指定）：
 *   頁首   kicker + 大標（英文） + 副標
 *   主圖   左 Roadster（噴射懸浮） / 中 馬斯克魔法師（奇異博士風、雙手催生魔法環） / 右 Starship
 *   數據   兩塊玻璃面板：TSLA +31%、SPCX +40%（自年內低點反彈），右側配迷你走勢線
 *   頁腳   統一聲明（lib/disclaimer）+ 口徑 meta + handle
 *
 * 數據口徑：參考圖（富途牛牛）— 特斯拉自年內低點反彈逾 31%、SpaceX 40%，區間 2026/1/1–10/26。
 * 走勢線為參考圖形態的裝飾性描摹，非逐日還原。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_musk_merger.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'musk-merger.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#04060A', ink: '#F4F7FB', gray: '#9BA7B6', dim: '#5B6573',
  line: '#1C212B', gold: '#E9C46A',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, op = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

function img64(p) {
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

const ASSET = (f) => path.join(BASE, 'assets', 'musk-merger', 'proc', f);
const ROAD = img64(ASSET('roadster.png'));
const SORC = img64(ASSET('sorcerer.png'));
const STAR = img64(ASSET('starship.png'));

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// 三重光暈：中橙（魔法環）/ 左紅（車）/ 右藍（星艦）
defs.push(`<radialGradient id="glowC" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#FF8A2B" stop-opacity="0.26"/>
  <stop offset="0.45" stop-color="#FF5A00" stop-opacity="0.09"/>
  <stop offset="1" stop-color="#FF5A00" stop-opacity="0"/></radialGradient>`);
defs.push(`<radialGradient id="glowL" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#FF2D2D" stop-opacity="0.22"/>
  <stop offset="1" stop-color="#FF2D2D" stop-opacity="0"/></radialGradient>`);
defs.push(`<radialGradient id="glowR" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#3D7BFF" stop-opacity="0.24"/>
  <stop offset="1" stop-color="#3D7BFF" stop-opacity="0"/></radialGradient>`);
defs.push(`<radialGradient id="vig" cx="0.5" cy="0.45" r="0.62">
  <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
  <stop offset="1" stop-color="#000000" stop-opacity="0.72"/></radialGradient>`);

svg.push(`<ellipse cx="540" cy="620" rx="430" ry="430" fill="url(#glowC)"/>`);
svg.push(`<ellipse cx="190" cy="700" rx="330" ry="300" fill="url(#glowL)"/>`);
svg.push(`<ellipse cx="905" cy="640" rx="300" ry="330" fill="url(#glowR)"/>`);

// 星塵（固定種子，避免每次不同）
{
  let seed = 20261102;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W, y = rnd() * 1080, r = 0.5 + rnd() * 1.5;
    svg.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#CFE3FF" opacity="${(0.05 + rnd() * 0.34).toFixed(3)}"/>`);
  }
}
// 細網格（極淡，科技感）
for (let y = 240; y <= 1000; y += 76) {
  svg.push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="#FFFFFF" stroke-width="1" opacity="0.022"/>`);
}

/* ---------------- 頁首 ---------------- */
defs.push(`<linearGradient id="titleG" x1="0" y1="0" x2="0.9" y2="1">
  <stop offset="0" stop-color="#FFF3CE"/><stop offset="0.42" stop-color="#F0CE7C"/>
  <stop offset="0.78" stop-color="#D9A441"/><stop offset="1" stop-color="#F5DC9A"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#E9C46A" stop-opacity="0.9"/>
  <stop offset="0.5" stop-color="#FF7A1A" stop-opacity="0.55"/>
  <stop offset="1" stop-color="#4D8DFF" stop-opacity="0"/></linearGradient>`);

svg.push(t(W / 2, 78, 'TESLA  ×  SPACEX  ·  ELON MUSK', { size: 17, weight: 500, fill: '#8C97A7', anchor: 'middle', ls: 6 }));
{
  const TS = 118;
  const width = tw(D.title, TS, 700);
  const size = width > CW ? Math.floor(TS * CW / width) : TS;
  svg.push(t(W / 2, 186, D.title, { size, weight: 700, anchor: 'middle', ls: -3 })
    .replace('fill="#F4F7FB"', 'fill="url(#titleG)"'));
}
svg.push(t(W / 2, 236, D.subtitle, { size: 27, weight: 400, fill: C.gray, anchor: 'middle', ls: 0.2 }));
svg.push(`<rect x="${W / 2 - 190}" y="262" width="380" height="2.5" fill="url(#ruleG)"/>`);

/* ---------------- 主圖：三素材 ---------------- */
// 法師（中，最後畫車與火箭於前景邊緣）— 先畫，讓車與艦壓在前面
{
  const h = 742, w = 1024 / 1420 * h;
  svg.push(`<image x="${(540 - w / 2).toFixed(1)}" y="292" width="${w.toFixed(1)}" height="${h}" href="${SORC}" image-rendering="optimizeQuality"/>`);
}
// 星艦（右）
{
  const h = 648, w = 712 / 1402 * h;
  const x = 1032 - w;
  svg.push(`<image x="${x.toFixed(1)}" y="336" width="${w.toFixed(1)}" height="${h}" href="${STAR}" image-rendering="optimizeQuality"/>`);
}
// Roadster（左，前景）
{
  const w = 552, h = 940 / 1536 * w;
  const x = -12, y = 548;
  svg.push(`<image x="${x}" y="${y}" width="${w}" height="${h.toFixed(1)}" href="${ROAD}" image-rendering="optimizeQuality"/>`);
}

// 素材標籤（極簡，別搶戲）
svg.push(t(238, 936, 'ROADSTER', { size: 14, weight: 500, fill: '#8C97A7', anchor: 'middle', ls: 4.5 }));
svg.push(t(880, 1006, 'STARSHIP', { size: 14, weight: 500, fill: '#8C97A7', anchor: 'middle', ls: 4.5 }));

/* ---------------- 數據面板 ---------------- */
const PY = 1012, PH = 150, PW = (CW - 24) / 2;
D.items.forEach((it, i) => {
  const px = M + i * (PW + 24);
  defs.push(`<linearGradient id="pn${i}" x1="0" y1="0" x2="0.8" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.085"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.022"/></linearGradient>`);
  svg.push(rrect(px, PY, PW, PH, 20, `url(#pn${i})`, `stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1.2"`));
  svg.push(`<rect x="${px}" y="${PY + 26}" width="4" height="${PH - 52}" rx="2" fill="${it.color}" opacity="0.95"/>`);

  svg.push(t(px + 26, PY + 46, it.name, { size: 24, weight: 700, ls: 0.6 }));
  svg.push(t(px + 26 + tw(it.name, 24, 700) + 12, PY + 46, it.ticker, { size: 15, weight: 500, fill: '#7B8595', ls: 1.2 }));

  svg.push(t(px + 26, PY + 112, it.pct, { size: 46, weight: 700, fill: it.color, ls: -0.5 }));
  svg.push(t(px + 26, PY + 136, it.label, { size: 11.5, weight: 500, fill: '#7B8595', ls: 1.3 }));

  // 迷你走勢線（面板右半）
  const sx0 = px + 236, sx1 = px + PW - 22, sy0 = PY + 34, sy1 = PY + 118;
  const s = it.series, n = s.length;
  const pts = s.map((v, k) => [sx0 + (sx1 - sx0) * (k / (n - 1)), sy1 - (v - 0.24) / (1.02 - 0.24) * (sy1 - sy0)]);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L ${sx1.toFixed(1)} ${sy1} L ${sx0.toFixed(1)} ${sy1} Z`;
  defs.push(`<linearGradient id="fill${i}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${it.color}" stop-opacity="0.34"/>
    <stop offset="1" stop-color="${it.color}" stop-opacity="0"/></linearGradient>`);
  svg.push(`<path d="${area}" fill="url(#fill${i})"/>`);
  svg.push(`<path d="${d}" fill="none" stroke="${it.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  const last = pts[n - 1];
  svg.push(`<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="6.5" fill="${it.color}" opacity="0.22"/>`);
  svg.push(`<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.4" fill="#FFFFFF" stroke="${it.color}" stroke-width="2.2"/>`);
});

svg.push(t(M, PY - 16, D.asof, { size: 14.5, weight: 500, fill: '#6A7484', anchor: 'start', ls: 0.8 }));

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.meta, handle });

// 暗角 + 極淡浮水印
svg.push(`<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>`);
brandMark(svg, { white: true });      // 左上角 OPM 標識（黑底用白色版；畫在 vignette 之上，2026-11-10 阿澤欽定）
svg.push(`<g transform="translate(${W / 2} 700) rotate(-24)" opacity="0.018">${t(0, 0, handle, { size: 120, weight: 700, anchor: 'middle', ls: 6 })}</g>`);

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.MERGER_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `musk-merger-${stamp}`;
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
