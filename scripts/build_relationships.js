/**
 * OPM 專題卡 · 10 Relationships That Reached the Board · 1080×1350
 *
 * 來源：圖解財經「十大頂級商業大佬因「戀情」翻車盤點」（製圖 2026-11-12）重製為 OPM 格式。
 * 🔴 全英文（2026-11-12 欽定）：卡片不含任何中文；中文原文翻譯為英文。
 * 🔴 只陳述公司聲明與公開事實，不評論（No takes. No picks.）。
 * 🔴 配色：橙紅 #B3340A / 琥珀 #854F0B / teal #007A66，亮色做面積、文字用同色系深版。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_relationships.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const handle = '@onepagemarket';

const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', chip: '#F6F7F9', hdrBg: '#161B26',
  amber: '#BA7517', gold: '#FFB01C', amberBg: '#FAEEDA', amberInk: '#854F0B',
};

const OUTCOME = {
  resigned:  { label: 'RESIGNED',   bg: '#FAEEDA', fg: '#854F0B' },
  dismissed: { label: 'DISMISSED', bg: '#FDE7DE', fg: '#B3340A' },
  leftboard: { label: 'LEFT BOARD', bg: '#E3F4F0', fg: '#007A66' },
  stayed:    { label: 'STAYED ON',  bg: '#EEF1F5', fg: '#5C6675' },
};

/* ---- 數據（人工核實；公司聲明與公開報導，2026-11-12 核對）---- */
const DATA = [
  { year: 2005, name: 'Harry Stonecipher', role: 'Boeing · President & CEO',
    note: 'Relationship with an executive breached conduct rules', outcome: 'resigned' },
  { year: 2010, name: 'Mark Hurd', role: 'HP · Chairman & CEO',
    note: 'Undisclosed contractor relationship; expense issues', outcome: 'resigned' , avDy: -5 },
  { year: 2018, name: 'Brian Krzanich', role: 'Intel · CEO',
    note: 'Relationship with an employee broke fraternization rules', outcome: 'resigned' , avDy: -5 },
  { year: 2019, name: 'Steve Easterbrook', role: "McDonald's · President & CEO",
    note: 'Relationship with an employee violated company policy', outcome: 'dismissed' , avDy: -6 },
  { year: 2019, name: 'Jeff Bezos', role: 'Amazon · Founder & CEO',
    note: 'Relationship disclosed after divorce filing; stayed CEO to 2021', outcome: 'stayed' , avDy: -5 },
  { year: 2020, name: 'Bill Gates', role: 'Microsoft · Co-founder & board member',
    note: 'Left the board during a review of a past relationship', outcome: 'leftboard' , avDy: -6 },
  { year: 2022, name: 'Jeff Zucker', role: 'CNN Worldwide · President',
    note: 'Undisclosed relationship with the chief marketing officer', outcome: 'resigned' },
  { year: 2023, name: 'Jeff Shell', role: 'NBCUniversal · CEO',
    note: 'Relationship with an employee, after an investigation', outcome: 'dismissed' },
  { year: 2024, name: 'Alan Shaw', role: 'Norfolk Southern · President & CEO',
    note: 'Undisclosed relationship with the chief legal officer', outcome: 'dismissed' },
  { year: 2025, name: 'Laurent Freixe', role: 'Nestlé · CEO',
    note: 'Undisclosed relationship with a direct report', outcome: 'dismissed' },
];

/* ---- 頭像：取自原圖左欄人物照，完整頭肩裁切（2026-11-13 修正）----
 * 以膚色峰值定位臉部 → 頭頂上方硬裁掉公司 logo 帶、底部裁掉虛線帶，
 * 保留原白底並在素材層做圓角，SVG 只貼一次、不做二次裁切。
 * 缺檔時退回中性首字母圓角徽，不影響出圖。 */
const AV_SLUGS = ['stonecipher', 'hurd', 'krzanich', 'easterbrook', 'bezos',
  'gates', 'zucker', 'shell', 'shaw', 'freixe'];
const AVATARS = AV_SLUGS.map((s) => {
  const p = path.join(BASE, 'assets', 'relationships', s + '.png');
  return fs.existsSync(p) ? 'data:image/png;base64,' + fs.readFileSync(p).toString('base64') : null;
});

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 畫布 ---- */
let defs = [];
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="0.55" stop-color="#FFB01C"/>
  <stop offset="1" stop-color="#FF8A1E"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 2026-11-13 阿澤欽定：全產線禁用斜紋水印，此卡不渲染。 */
brandMark(svg);

/* ---- 標題 ---- */
const T1 = '10 Relationships';
const T2 = 'That Reached the Board';
const fit = (s, max, base) => {
  let sz = base;
  while (sz > 40 && tw(s, sz, 700) > max) sz -= 2;
  return sz;
};
const S1 = fit(T1, CW - 20, 68);
const S2 = fit(T2, CW - 20, 68);
svg.push(t(M, 142, T1, { size: S1, weight: 700, ls: -2 }));
svg.push(t(M, 212, T2, { size: S2, weight: 700, ls: -2 }));
svg.push(t(M, 250, 'Executive outcomes, 2005–2025, per company statements',
  { size: 22, fill: C.gray }));
svg.push(`<rect x="${M}" y="268" width="${CW}" height="5" fill="url(#ruleG)" rx="2.5"/>`);

/* ---- KPI chips ---- */
const resigned = DATA.filter((d) => d.outcome === 'resigned').length;
const dismissed = DATA.filter((d) => d.outcome === 'dismissed').length;
const other = DATA.length - resigned - dismissed;
const chips = [
  ['RESIGNED', String(resigned)],
  ['DISMISSED', String(dismissed)],
  ['OTHER OUTCOMES', String(other)],
];
{
  const cw = [300, 300, 340], chH = 52, cy = 288;
  let cx = M;
  chips.forEach(([k, v], i) => {
    svg.push(rrect(cx, cy, cw[i], chH, 14, C.chip, `stroke="${C.line}" stroke-width="1"`));
    svg.push(t(cx + 20, cy + 21, k, { size: 12.5, weight: 500, fill: C.dim, ls: 0.8 }));
    svg.push(t(cx + 20, cy + 43, v, { size: 22, weight: 700, fill: C.ink }));
    cx += cw[i] + 18;
  });
}

/* ---- 表頭 ---- */
const HEAD_Y = 356, HEAD_H = 44, ROW_H = 80;
const TBL_TOP = HEAD_Y + HEAD_H;
svg.push(rrect(M, HEAD_Y, CW, HEAD_H, 8, C.hdrBg));
svg.push(t(M + 20, HEAD_Y + HEAD_H / 2 + 4.5,
  'EXECUTIVE / COMPANY / WHAT WAS REPORTED',
  { size: 12.5, weight: 500, fill: '#E7EAF0', ls: 0.8 }));
svg.push(t(W - M - 20, HEAD_Y + HEAD_H / 2 + 4.5, 'OUTCOME / YEAR',
  { size: 12.5, weight: 500, fill: '#E7EAF0', anchor: 'end', ls: 0.8 }));

/* ---- 數據行 ---- */
DATA.forEach((r, i) => {
  const y = TBL_TOP + i * ROW_H;
  const oc = OUTCOME[r.outcome];
  const pillW = Math.max(118, tw(oc.label, 13, 700) + 30);
  const pillX = W - M - pillW;
  const avail = pillX - 24 - (M + 64);
  let noteSize = 15;
  while (noteSize > 12 && tw(r.note, noteSize) > avail) noteSize -= 0.5;

  svg.push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`);

  /* 頭像：完整頭肩人像，素材自帶圓角白底，不再做二次裁切（2026-11-13 修正） */
  const acx = M + 24, acy = y + 40;
  const avS = 56, avX = acx - avS / 2, avY = acy - avS / 2;
  if (AVATARS[i]) {
    svg.push(`<image x="${avX}" y="${avY}" width="${avS}" height="${avS}" href="${AVATARS[i]}"/>`);
  } else {
    svg.push(`<rect x="${avX}" y="${avY}" width="${avS}" height="${avS}" rx="16" fill="${C.chip}"/>`);
    const initials = r.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
    svg.push(t(acx, acy + 6, initials, { size: 15, weight: 700, fill: C.gray, anchor: 'middle' }));
  }
  svg.push(`<rect x="${avX}" y="${avY}" width="${avS}" height="${avS}" rx="16" fill="none" stroke="#D6DAE1" stroke-width="1.5"/>`);

  /* 姓名 / 公司職位 / 事件 */
  svg.push(t(M + 64, y + 27, r.name, { size: 22, weight: 700 }));
  svg.push(t(M + 64, y + 47, r.role, { size: 15, fill: C.gray }));
  svg.push(t(M + 64, y + 68, r.note, { size: noteSize, fill: '#6B7688' }));

  /* 年份 + 結果 pill */
  svg.push(t(W - M, y + 27, String(r.year),
    { size: 19, weight: 700, anchor: 'end' }));
  svg.push(rrect(pillX, y + 38, pillW, 28, 14, oc.bg));
  svg.push(t(pillX + pillW / 2, y + 57, oc.label,
    { size: 13, weight: 700, fill: oc.fg, anchor: 'middle' }));
});
svg.push(`<line x1="${M}" y1="${TBL_TOP + ROW_H * DATA.length}" x2="${W - M}" y2="${TBL_TOP + ROW_H * DATA.length}" stroke="${C.line}" stroke-width="1"/>`);

/* ---- 頁腳 ---- */
pushFooter(t, svg, {
  M, W, H, C,
  meta: 'Compiled Nov 12, 2026',
  handle,
});

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'relationships-at-the-top-20261112';
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
console.log('counts:', { resigned, dismissed, other }, '| title sizes:', S1, S2);
