/**
 * OPM 專題卡 · The AI Cost Revolution（大摩軟件研報：四大軟件板塊受惠標的）· 1080×1350
 *
 * 版面（2026-11-02，改編自哈富站內「大摩軟件研報」中文圖，OPM 淺色格式）：
 *   頁首   大標題 + 副標
 *   主圖   四個板塊區塊（淡色底 + 左色條）：板塊名 + 一句論點 + 標的 chip 網格
 *          每個 chip = logo 圓標 + ticker + 公司名
 *   頁腳   統一聲明（disclaimer.js）+ 來源 meta + handle
 *
 * 數據：板塊論點與標的名單轉譯自 Morgan Stanley 2026-10-26 研報（經哈富站內圖）。
 * 標的僅為研報列舉示例，非推薦——頁腳 meta 已註明。
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_ms_software.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ms-software.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC',
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

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#EFF5FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#E5484D"/><stop offset="0.36" stop-color="#0078D4"/>
  <stop offset="0.7" stop-color="#12B76A"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);                       // 左上角 OPM 標識（2026-11-10 阿澤欽定）

/* ---------------- 頁首 ---------------- */
const TS = 88;
const AVAIL_T = CW - 104;   // 右上預留 OPM 標識寬度（2026-11-10）
const titleSize = tw(D.title, TS, 700) > AVAIL_T ? Math.floor(TS * AVAIL_T / tw(D.title, TS, 700)) : TS;
svg.push(t(M, 132, D.title, { size: titleSize, weight: 700, ls: -2.5 }));
const SUB = 24;
const subSize = tw(D.subtitle, SUB, 400) > CW ? Math.floor(SUB * CW / tw(D.subtitle, SUB, 400)) : SUB;
svg.push(t(M, 176, D.subtitle, { size: subSize, fill: C.gray }));
svg.push(`<rect x="${M}" y="196" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- 四板塊區塊 ---------------- */
const PAD = 28, ROW_H = 56, ROW_GAP = 10, SEC_GAP = 10, SEC_HDR = 84;
const COLS = 3;
const COL_W = (CW - PAD * 2) / COLS;
let y = 218;

D.sections.forEach((sec) => {
  const rows = Math.ceil(sec.stocks.length / COLS);
  const sh = SEC_HDR + rows * ROW_H + (rows - 1) * ROW_GAP + 18;

  /* 區塊底 + 左色條 */
  svg.push(rrect(M, y, CW, sh, 18, sec.bg, `stroke="${sec.stroke}" stroke-width="1.4"`));
  svg.push(rrect(M, y, 6, sh, 3, sec.color));

  /* 板塊名 + 論點 */
  svg.push(t(M + PAD, y + 38, sec.name, { size: 28, weight: 700, fill: sec.color }));
  svg.push(t(M + PAD, y + 66, sec.desc, { size: 17, fill: C.gray }));

  /* 標的 chip 網格 */
  sec.stocks.forEach((st, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx = M + PAD + col * COL_W;
    const cy = y + SEC_HDR + row * (ROW_H + ROW_GAP);

    const L = 46, lx = cx, lcy = cy + ROW_H / 2;
    const uri = LOGOS[st.t];
    if (uri) {
      const cid = `lg${uid++}`;
      defs.push(`<clipPath id="${cid}"><circle cx="${lx + L / 2}" cy="${lcy}" r="${L / 2}"/></clipPath>`);
      const ein = L * 0.92, eoff = (L - ein) / 2;
      svg.push(`<g clip-path="url(#${cid})"><image x="${lx + eoff}" y="${lcy - L / 2 + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
      svg.push(`<circle cx="${lx + L / 2}" cy="${lcy}" r="${L / 2}" fill="none" stroke="#DDE6EF" stroke-width="1"/>`);
    } else {
      svg.push(`<circle cx="${lx + L / 2}" cy="${lcy}" r="${L / 2}" fill="${sec.color}"/>`);
      svg.push(t(lx + L / 2, lcy + 8, st.t.slice(0, 2), { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    }
    svg.push(t(lx + L + 15, cy + 24, st.t, { size: 26, weight: 700 }));
    svg.push(t(lx + L + 15, cy + 44, st.n, { size: 15.5, fill: C.gray }));
  });

  y += sh + SEC_GAP;
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.MS_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `ms-software-${stamp}`;
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
