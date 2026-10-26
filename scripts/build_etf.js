/**
 * ETF Holdings 卡 — 左 3D 環形圖 + 右持倉列表（OPM 淺色底）
 *   首張：OMAH（VistaShares Target 15 Berkshire Select Income ETF）
 *   數據：data/etf-omah.json（issuer 公佈持倉，etfiq 彙整）
 *   用法：node scripts/build_etf.js   （環境變數 ETF_DATA / PAGES_STAMP 可覆蓋）
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(process.env.ETF_DATA || path.join(BASE, 'data', 'etf-omah.json'), 'utf8'));
const LOGOS = fs.existsSync(path.join(BASE, 'data', 'logos.json'))
  ? JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8')) : {};

const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' },
  amber: '#E8930C',            // 最大扇區起始色（OPM 琥珀金）
  pale: '#FBE3B8',             // 依次變淺終點色
  other: '#CBD2DB',            // Other 扇區灰
  title2: '#B26A0F',
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
  donut: { CX: 308, CY: 745, RX: 250, RY: 178, IX: 145, IY: 94, D: 48 },
  start: -106,
};
const { W, H, M, colors: C } = CFG;
const { CX, CY, RX, RY, IX, IY } = CFG.donut;
const DEPTH = CFG.donut.D;

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, o = {}) {
  const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rad = (d) => d * Math.PI / 180;
const px = (deg, rx = RX, cy = CY) => CX + rx * Math.cos(rad(deg));
const py = (deg, ry = RY, cy = CY) => cy + ry * Math.sin(rad(deg));

function lerpColor(h1, h2, f) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const mix = (sa, sb) => Math.round(sa + (sb - sa) * f);
  return `#${((1 << 24) | (mix((a >> 16) & 255, (b >> 16) & 255) << 16) | (mix((a >> 8) & 255, (b >> 8) & 255) << 8) | mix(a & 255, b & 255)).toString(16).slice(1)}`;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

/* ---------- 環形圖幾何 ---------- */
const all = D.holdings.map((h) => ({ ...h, isOther: false })).concat([{ ...D.other, isOther: true }]);
let deg = CFG.start;
const segs = all.map((s, i) => {
  const a0 = deg, a1 = deg + s.pct / 100 * 360;
  deg = a1;
  return { ...s, a0, a1, aMid: (a0 + a1) / 2, i };
});
segs.forEach((s) => {
  s.color = s.isOther ? CFG.other : lerpColor(CFG.amber, CFG.pale, s.i / (segs.length - 2));
  s.weightColor = s.isOther ? C.gray : shade(s.color, -0.45);
});

function topFace(s) {
  const large = (s.a1 - s.a0) > 180 ? 1 : 0;
  return `M ${px(s.a0)} ${py(s.a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
         `L ${px(s.a1, IX)} ${py(s.a1, IY)} ` +
         `A ${IX} ${IY} 0 ${large} 0 ${px(s.a0, IX)} ${py(s.a0, IY)} Z`;
}
function wallPath(s) {           // 只畫下半側（屏幕可見）側壁
  const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
  if (a1 - a0 <= 0.5) return '';
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${px(a0)} ${py(a0)} ` +
         `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
         `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
         `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
}
function holeWallPath() {
  return `M ${px(180, IX)} ${py(180, IY)} ` +
         `A ${IX} ${IY} 0 0 1 ${px(360, IX)} ${py(360, IY)} ` +
         `L ${px(360, IX, CY + DEPTH)} ${py(360, IY, CY + DEPTH)} ` +
         `A ${IX} ${IY} 0 0 0 ${px(180, IX, CY + DEPTH)} ${py(180, IY, CY + DEPTH)} Z`;
}

/* ---------- 組裝 ---------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

// 背景：暖白漸變 + 兩個極淡琥珀光暈
{
  const id = `bg${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.52" stop-color="#FEFBF4"/><stop offset="1" stop-color="#FAF0DC"/></linearGradient>`);
  a.push(`<rect width="${W}" height="${H}" fill="url(#${id})"/>`);
  a.push(`<ellipse cx="1000" cy="180" rx="400" ry="320" fill="${CFG.amber}" opacity="0.05"/>`);
  a.push(`<ellipse cx="70" cy="1180" rx="380" ry="300" fill="${CFG.amber}" opacity="0.045"/>`);
}

// 水印
const wm = CFG.watermark;
a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', ls: 6 })}</g>`);

// 右上 handle pill（同 scaffold）
const handle = '@onepagemarket';
const pw = Math.round(handle.length * 17.6) + 44;
a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="#FAEEDA"/>`);
a.push(t(W - M - pw / 2, 101, handle, { size: 32, weight: 500, fill: '#854F0B', anchor: 'middle' }));

// 標題（兩行）＋副題 pill ＋摘要行
a.push(t(M, 96, D.title_line1, { size: 74, weight: 700, ls: -1.5 }));
a.push(t(M, 172, D.title_line2, { size: 74, weight: 700, fill: CFG.title2, ls: -1.5 }));
const subW = Math.round(D.subtitle.length * 10.2) + 48;
a.push(`<rect x="${M}" y="200" width="${subW}" height="44" rx="22" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
a.push(t(M + 24, 229, D.subtitle, { size: 20, fill: C.gray }));
a.push(t(M + subW + 40, 229, D.summary_note, { size: 22, fill: C.gray }));

/* --- 左：3D 環形圖 --- */
// 1) 側壁
segs.forEach((s) => {
  const w = wallPath(s);
  if (w) a.push(`<path d="${w}" fill="${shade(s.color, -0.42)}"/>`);
});
// 2) 洞內壁 + 洞底地面（中心文字落在地面上，不壓深色壁）
a.push(`<path d="${holeWallPath()}" fill="${shade(CFG.amber, -0.55)}"/>`);
a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${IX}" ry="${IY}" fill="#F7F1E4"/>`);
// 3) 頂面
segs.forEach((s) => {
  a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
});
// 4) 全局光澤
{
  const id = `gloss${uid++}`;
  defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/>` +
    `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0B1220" stop-opacity="0.20"/></linearGradient>`);
  a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 1 1 ${px(270)} ${py(270)} ` +
         `L ${px(270, IX)} ${py(270, IY)} A ${IX} ${IY} 0 1 0 ${px(-90, IX)} ${py(-90, IY)} Z" fill="url(#${id})"/>`);
}
// 5) 環上徽章（每個扇區一個：持倉 logo；Other = +61）
segs.forEach((s) => {
  const bx = px(s.aMid, (RX + IX) / 2), by = py(s.aMid, (RY + IY) / 2);
  const R = 27;
  if (s.isOther) {
    a.push(`<circle cx="${bx}" cy="${by}" r="${R}" fill="#8A94A3" stroke="#FFFFFF" stroke-width="2.5"/>`);
    a.push(t(bx, by + 7, `+${D.other.count}`, { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  } else {
    const uri = LOGOS[s.ticker];
    if (uri) {
      const id = `bd${uid++}`;
      defs.push(`<clipPath id="${id}"><circle cx="${bx}" cy="${by}" r="${R - 1.5}"/></clipPath>`);
      a.push(`<circle cx="${bx}" cy="${by}" r="${R}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2.5"/>`);
      a.push(`<g clip-path="url(#${id})"><image x="${bx - R + 1.5}" y="${by - R + 1.5}" width="${(R - 1.5) * 2}" height="${(R - 1.5) * 2}" preserveAspectRatio="none" href="${uri}"/></g>`);
    } else {
      a.push(`<circle cx="${bx}" cy="${by}" r="${R}" fill="${shade(s.color, -0.3)}" stroke="#FFFFFF" stroke-width="2.5"/>`);
      a.push(t(bx, by + 7, s.display, { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    }
  }
});
// 6) 中心摘要（下移避開洞內壁深色帶）
a.push(t(CX, CY - 20, 'TOP 10 COMBINED', { size: 18, weight: 500, fill: C.gray, anchor: 'middle', ls: 1 }));
a.push(t(CX, CY + 40, D.top10_combined + '%', { size: 58, weight: 700, fill: C.ink, anchor: 'middle' }));
a.push(t(CX, CY + 72, `Other ${D.other.disp}%`, { size: 19, fill: C.gray, anchor: 'middle' }));

/* --- 左上：基金要點三格（填補標題與環之間留白） --- */
(D.facts || []).forEach((f, i) => {
  const fx = M + i * 178;
  a.push(t(fx, 330, f.label.toUpperCase(), { size: 14, weight: 700, fill: C.dim, ls: 1.5 }));
  a.push(t(fx, 362, f.value, { size: 26, weight: 700, fill: C.ink }));
});

/* --- 右：持倉列表 --- */
const LX = 600, RXr = 1032, rowH = 76, y0 = 316;
// 表頭
a.push(t(LX + 72, y0 - 14, 'HOLDING', { size: 16, weight: 700, fill: C.dim, ls: 1.5 }));
a.push(t(RXr - 8, y0 - 14, 'WEIGHT', { size: 16, weight: 700, fill: C.dim, anchor: 'end', ls: 1.5 }));
segs.forEach((s, i) => {
  const ry = y0 + i * rowH, cy = ry + rowH / 2;
  if (i % 2 === 0) {
    a.push(`<rect x="${LX - 12}" y="${ry + 4}" width="${RXr - LX + 24}" height="${rowH - 8}" rx="14" fill="#F8EDDA"/>`);
  }
  // 徽章
  const bx = LX + 32, R = 24;
  const uri = !s.isOther && LOGOS[s.ticker];
  if (s.isOther) {
    a.push(`<circle cx="${bx}" cy="${cy}" r="${R}" fill="#E9EDF2"/>`);
    a.push(t(bx, cy + 6, '…', { size: 24, weight: 700, fill: C.gray, anchor: 'middle' }));
  } else if (uri) {
    const id = `lb${uid++}`;
    defs.push(`<clipPath id="${id}"><circle cx="${bx}" cy="${cy}" r="${R - 1}"/></clipPath>`);
    a.push(`<circle cx="${bx}" cy="${cy}" r="${R}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1"/>`);
    a.push(`<g clip-path="url(#${id})"><image x="${bx - R + 1}" y="${cy - R + 1}" width="${(R - 1) * 2}" height="${(R - 1) * 2}" preserveAspectRatio="none" href="${uri}"/></g>`);
  } else {
    a.push(`<circle cx="${bx}" cy="${cy}" r="${R}" fill="${s.color}"/>`);
    a.push(t(bx, cy + 6, s.display.slice(0, 2), { size: 16, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  }
  // 代碼＋名稱
  a.push(t(LX + 72, cy - 2, s.display, { size: 26, weight: 700 }));
  a.push(t(LX + 72, cy + 22, s.isOther ? `${s.label} (${s.count})` : s.name, { size: 15, fill: C.gray }));
  // 權重
  a.push(t(RXr - 8, cy + 9, s.disp + '%', { size: 26, weight: 700, fill: s.weightColor, anchor: 'end' }));
});

/* --- 頁腳 --- */
pushFooter(t, a, { M, W, H, C, handle, meta: `Holdings as of ${D.data_as_of} · ${D.fund_name}` });

a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.PAGES_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
fs.writeFileSync(path.join(outDir, `etf-${D.ticker.toLowerCase()}-${stamp}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
  background: '#FFFFFF',
}).render().asPng();
fs.writeFileSync(path.join(outDir, `etf-${D.ticker.toLowerCase()}-${stamp}.png`), png);
{
  const genFile = path.join(outDir, 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`etf-${D.ticker.toLowerCase()}-${stamp}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}
console.log('PNG ->', `out/etf-${D.ticker.toLowerCase()}-${stamp}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
