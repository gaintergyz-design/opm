/**
 * OPM-月度日曆（Monthly Calendar Card）· 1080×1350 · 淺色底
 *
 * 版面 v2（2026-11-02 阿澤五點修改）：
 *   ① 不用高亮底條、② 不加橫線 —— 只靠字重與顏色分層次
 *   ③ 分類 pill 統一寬度，右側事件文字全部左對齊
 *   ④ 行距自動撐滿版面（剩餘高度均分為行間 gap）
 *   ⑤ 標題 November 2026 一行大字，右上角手柄 pill 移除（水印＋頁腳保留）
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/build_calendar.js
 *   CAL_DATA=data/calendar-nov2026.json PREVIEW=1 node scripts/build_calendar.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const DATA_PATH = process.env.CAL_DATA || path.join(BASE, 'data', 'calendar-nov2026.json');
const D = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC',
  deep: '#003369', primary: '#005195', mid: '#0067B3', teal: '#17A9C4',
};
const FONT = 'MiSans';

/* 分類 pill 配色（淺底，克制） */
const TAGS = {
  EARNINGS:  { bg: '#EAF2F9', fg: '#005195' },
  DATA:      { bg: '#F2F4F7', fg: '#5C6675' },
  INFLATION: { bg: '#FDF0E7', fg: '#C2410C' },
  FED:       { bg: '#EEF4FE', fg: '#1D4ED8' },
  POLITICS:  { bg: '#F4F1FA', fg: '#6D28D9' },
  IPO:       { bg: '#EDF9F3', fg: '#028948' },
  HOLIDAY:   { bg: '#FBF3E6', fg: '#B45309' },
};
const TAG_ORDER = ['EARNINGS', 'DATA', 'INFLATION', 'FED', 'POLITICS', 'IPO', 'HOLIDAY'];

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
  <stop offset="0" stop-color="${C.deep}"/><stop offset="0.55" stop-color="${C.primary}"/>
  <stop offset="1" stop-color="${C.teal}"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.032">
  ${t(0, 0, '@onepagemarket', { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

const handle = '@onepagemarket';

/* ---------------- 頁首（無手柄 pill） ---------------- */
const TS = 104;
svg.push(t(M, 132, D.title, { size: TS, weight: 700, ls: -3 }));
svg.push(t(M + tw(D.title, TS, 700) + 26, 132, D.year, { size: TS, weight: 700, fill: C.primary, ls: -3 }));
svg.push(t(M, 178, D.subtitle, { size: 22, fill: C.gray }));
svg.push(`<rect x="${M}" y="202" width="${CW}" height="6" fill="url(#ruleG)"/>`);

/* ---------------- 時間軸（無底條、無橫線，行距撐滿） ---------------- */
const TOP = 234;
const BOT = H - 118 - 30;            // 留口徑說明行
const DATE_W = 122;
const EV_X = M + DATE_W;
const LINE_H = 36;                   // 事件行高
const TAG_SIZE = 13, TAG_PADX = 10;

// ③ pill 統一寬度＝最長標籤
const TAG_W = Math.max(...TAG_ORDER.map((k) => Math.round(tw(k, TAG_SIZE, 600)) + TAG_PADX * 2));

const nRows = D.rows.length;
const sumRows = D.rows.reduce((a, r) => a + r.events.length * LINE_H, 0);
// ④ 剩餘高度均分為行間 gap
const GAP = (BOT - TOP - sumRows) / (nRows - 1);

let y = TOP;
D.rows.forEach((row) => {
  const firstBase = y + 26;          // 首行事件基線（日期數字與之對齊）

  // 日期塊：日數字（補零）與首行事件同基線，星期小字跟在右側
  const day = String(row.date).split(' ').pop().padStart(2, '0');
  svg.push(t(M, firstBase, day, { size: 34, weight: 700, fill: C.deep, ls: -0.5 }));
  svg.push(t(M + tw(day, 34, 700) + 10, firstBase, row.dow, { size: 15, weight: 600, fill: C.dim, ls: 1.2 }));

  row.events.forEach((e, i) => {
    const by = y + LINE_H * i + 26;
    const tag = TAGS[e.tag] || TAGS.DATA;
    svg.push(rrect(EV_X, by - 18, TAG_W, 25, 7, tag.bg));
    svg.push(t(EV_X + TAG_PADX, by - 1, e.tag, { size: TAG_SIZE, weight: 600, fill: tag.fg, ls: 0.5 }));

    // ③ 正文統一左對齊
    const tx = EV_X + TAG_W + 18;
    svg.push(t(tx, by, e.text, { size: 24, weight: e.hl ? 600 : 400, fill: e.hl ? C.deep : C.ink }));

    if (e.time) svg.push(t(W - M, by, e.time, { size: 18, weight: 500, fill: C.gray, anchor: 'end' }));
  });

  y += row.events.length * LINE_H + GAP;
});

/* ---------------- 口徑說明 ---------------- */
svg.push(t(M, y - GAP + 24, D.note, { size: 15, fill: C.dim }));

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, handle, meta: `All times ET (US Eastern) · Compiled ${D.compiled}` });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.CAL_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `calendar-november-${stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },   // 2× 超采樣，downscale_png.py 縮回
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
console.log('CONTENT_END', Math.round(y - GAP), 'GAP', GAP.toFixed(1), '/ LIMIT', BOT);
